from typing import TypedDict, List, Dict, Optional, Any
from ..models.schemas import Finding

class AgentState(TypedDict):
    job_id: str
    source_input: str
    chain_id: int
    contract_name: str
    source_files: Dict[str, str]
    flattened_source: str
    findings: List[Finding]
    current_finding_idx: int
    retry_count: int
    test_compile_error: Optional[str]
    report_markdown: Optional[str]
    logs: List[str]
