import asyncio
from typing import Dict, Any, List
from .state import AgentState
from ..models.schemas import Finding
from ..tools.etherscan import resolve_source
from ..tools.slither_analyzer import run_static_analysis
from ..tools.foundry_runner import (
    FoundrySandbox,
    generate_regression_test_solidity,
    generate_secure_patch
)
from ..utils.report_builder import build_markdown_report

async def resolve_source_node(state: AgentState) -> Dict[str, Any]:
    source_input = state["source_input"]
    chain_id = state.get("chain_id", 1)

    contract_name, flattened, source_files = await resolve_source(source_input, chain_id)
    return {
        "contract_name": contract_name,
        "flattened_source": flattened,
        "source_files": source_files,
        "logs": state.get("logs", []) + [f"Source resolved: {contract_name} ({len(source_files)} files)"]
    }

async def static_analyze_node(state: AgentState) -> Dict[str, Any]:
    source = state["flattened_source"]
    contract_name = state["contract_name"]
    filename = f"{contract_name}.sol"

    findings = run_static_analysis(source, filename)
    log_msg = f"Static analysis complete. Identified {len(findings)} potential issue(s)."
    return {
        "findings": findings,
        "current_finding_idx": 0,
        "retry_count": 0,
        "logs": state.get("logs", []) + [log_msg]
    }

async def process_findings_node(state: AgentState) -> Dict[str, Any]:
    """
    Evaluates findings sequentially: writes regression tests, verifies on vulnerable code,
    generates secure patches, and verifies that the patch resolves the regression.
    Includes compiler error feedback retry policy (max 2 retries per finding).
    """
    findings: List[Finding] = list(state.get("findings", []))
    source = state["flattened_source"]
    contract_name = state["contract_name"]
    job_id = state.get("job_id", "default")
    logs = list(state.get("logs", []))

    sandbox = FoundrySandbox(job_id=job_id)
    filename = f"{contract_name}.sol"
    sandbox.write_contract(filename, source)

    try:
        for idx, finding in enumerate(findings):
            logs.append(f"Processing finding {finding.id} ({finding.category}: {finding.title})...")

            # 1. Write regression test asserting the secure invariant
            test_content = ""
            retry_count = 0
            max_retries = 2
            compile_err = None

            while retry_count <= max_retries:
                test_content = generate_regression_test_solidity(
                    finding, source, contract_name, compile_error=compile_err
                )
                test_filename = f"{contract_name}_{finding.id}.t.sol"
                sandbox.write_test(test_filename, test_content)

                # 2. Run forge test against vulnerable code
                passed, test_logs, err = sandbox.run_test(test_filename, is_patched=False, finding=finding)

                if err and "Compiler run failed" in err:
                    retry_count += 1
                    compile_err = err
                    logs.append(f"Compiler error on test generation for {finding.id}. Retrying ({retry_count}/{max_retries})...")
                    continue
                else:
                    finding.regression_test = test_content
                    finding.test_log = test_logs

                    # If test fails on original code, the invariant is broken -> REPRODUCED!
                    if not passed:
                        finding.status = "Reproduced"
                        logs.append(f"Defect reproduced for {finding.id}! Regression test failed on original code as expected.")
                    else:
                        finding.status = "Not reproduced"
                        logs.append(f"Finding {finding.id} not reproduced: Invariant held on original code.")
                    break

            # 3. If reproduced, generate secure patch and verify fix
            if finding.status == "Reproduced":
                patched_code, diff, notes = generate_secure_patch(finding, source)
                finding.fix_diff = diff
                finding.remediation_notes = notes

                # Write patched contract to sandbox to test the fix
                sandbox.write_contract(filename, patched_code)
                fix_passed, fix_logs, _ = sandbox.run_test(test_filename, is_patched=True, finding=finding)

                if fix_passed:
                    logs.append(f"Patch verified for {finding.id}! Regression test now PASSES against patched code.")
                else:
                    logs.append(f"Warning: Patch test did not pass cleanly for {finding.id}.")

                # Restore original contract in sandbox for subsequent findings
                sandbox.write_contract(filename, source)

    finally:
        sandbox.cleanup()

    return {
        "findings": findings,
        "logs": logs
    }

async def build_report_node(state: AgentState) -> Dict[str, Any]:
    contract_name = state.get("contract_name", "Contract")
    findings = state.get("findings", [])
    report = build_markdown_report(contract_name, findings)

    return {
        "report_markdown": report,
        "logs": state.get("logs", []) + ["Final audit report successfully compiled."]
    }
