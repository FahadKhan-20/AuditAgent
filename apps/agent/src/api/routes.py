import uuid
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Response
from sse_starlette.sse import EventSourceResponse
from ..models.schemas import AuditRequest, AuditJob, Finding, StreamEvent
from ..graph.workflow import create_audit_graph

router = APIRouter()

# In-memory storage for jobs and SSE event queues
JOBS: Dict[str, AuditJob] = {}
EVENT_HISTORY: Dict[str, List[dict]] = {}
ACTIVE_QUEUES: Dict[str, List[asyncio.Queue]] = {}

graph_app = create_audit_graph()

def emit_event(job_id: str, node: str, status: str, message: str, payload: Optional[dict] = None):
    event_data = {
        "job_id": job_id,
        "node": node,
        "status": status,
        "message": message,
        "payload": payload or {},
        "timestamp": datetime.utcnow().isoformat()
    }
    if job_id not in EVENT_HISTORY:
        EVENT_HISTORY[job_id] = []
    EVENT_HISTORY[job_id].append(event_data)

    if job_id in ACTIVE_QUEUES:
        for q in ACTIVE_QUEUES[job_id]:
            q.put_nowait(event_data)

async def execute_audit_task(job_id: str, source_input: str, chain_id: int):
    job = JOBS[job_id]
    job.status = "running"
    emit_event(job_id, "resolve_source", "started", "Resolving contract source and dependencies...")

    try:
        initial_state = {
            "job_id": job_id,
            "source_input": source_input,
            "chain_id": chain_id,
            "contract_name": "Contract",
            "source_files": {},
            "flattened_source": "",
            "findings": [],
            "current_finding_idx": 0,
            "retry_count": 0,
            "test_compile_error": None,
            "report_markdown": None,
            "logs": []
        }

        # Step through graph execution with SSE emissions
        async for output in graph_app.astream(initial_state):
            for node_name, state_delta in output.items():
                if node_name == "resolve_source":
                    job.contract_name = state_delta.get("contract_name", "Contract")
                    emit_event(
                        job_id, "resolve_source", "completed",
                        f"Resolved source for {job.contract_name}",
                        {"contract_name": job.contract_name}
                    )
                    emit_event(job_id, "static_analyze", "started", "Running Slither & SWC vulnerability detection...")

                elif node_name == "static_analyze":
                    findings = state_delta.get("findings", [])
                    job.findings = findings
                    emit_event(
                        job_id, "static_analyze", "completed",
                        f"Identified {len(findings)} potential issue(s)",
                        {"findings": [f.model_dump() for f in findings]}
                    )
                    emit_event(job_id, "process_findings", "started", "Generating Foundry invariant tests & patches...")

                elif node_name == "process_findings":
                    findings = state_delta.get("findings", [])
                    job.findings = findings
                    reproduced = sum(1 for f in findings if f.status == "Reproduced")
                    emit_event(
                        job_id, "process_findings", "completed",
                        f"Regression tests verified. {reproduced} issue(s) empirically reproduced.",
                        {"findings": [f.model_dump() for f in findings]}
                    )
                    emit_event(job_id, "build_report", "started", "Compiling final markdown audit report...")

                elif node_name == "build_report":
                    report = state_delta.get("report_markdown", "")
                    job.report_markdown = report
                    job.status = "completed"
                    emit_event(
                        job_id, "build_report", "completed",
                        "Audit report successfully generated.",
                        {"findings": [f.model_dump() for f in job.findings]}
                    )

        emit_event(job_id, "pipeline", "completed", "Audit finished successfully.")

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        emit_event(job_id, "pipeline", "error", f"Audit failed: {str(e)}")

@router.post("/audit")
async def create_audit(request: AuditRequest, background_tasks: BackgroundTasks):
    input_str = (request.source_code or request.contract_address or "").strip()
    if not input_str:
        raise HTTPException(status_code=400, detail="Must provide either source_code or contract_address.")

    job_id = str(uuid.uuid4())[:8]
    job = AuditJob(
        job_id=job_id,
        status="queued",
        contract_name=request.contract_name or "PendingResolution"
    )
    JOBS[job_id] = job
    EVENT_HISTORY[job_id] = []
    ACTIVE_QUEUES[job_id] = []

    background_tasks.add_task(execute_audit_task, job_id, input_str, request.chain_id or 1)

    return {"job_id": job_id, "status": "running"}

@router.get("/audit/{job_id}")
async def get_audit(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Audit job not found")
    return job

@router.get("/audit/{job_id}/stream")
async def stream_audit(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Audit job not found")

    queue = asyncio.Queue()
    if job_id not in ACTIVE_QUEUES:
        ACTIVE_QUEUES[job_id] = []
    ACTIVE_QUEUES[job_id].append(queue)

    async def event_generator():
        try:
            # First replay existing events
            for historical in EVENT_HISTORY.get(job_id, []):
                yield {
                    "event": "message",
                    "data": json.dumps(historical)
                }

            # If job already finished, stop
            if JOBS[job_id].status in ["completed", "failed"]:
                return

            # Listen for new events
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield {
                        "event": "message",
                        "data": json.dumps(event)
                    }
                    if event.get("node") == "pipeline" and event.get("status") in ["completed", "error"]:
                        break
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat
                    yield {
                        "event": "ping",
                        "data": json.dumps({"timestamp": datetime.utcnow().isoformat()})
                    }
        finally:
            if job_id in ACTIVE_QUEUES and queue in ACTIVE_QUEUES[job_id]:
                ACTIVE_QUEUES[job_id].remove(queue)

    return EventSourceResponse(event_generator())

@router.get("/audit/{job_id}/report.md")
async def get_audit_report(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Audit job not found")
    if not job.report_markdown:
        raise HTTPException(status_code=400, detail="Report not ready yet")

    return Response(
        content=job.report_markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="audit_report_{job_id}.md"'}
    )
