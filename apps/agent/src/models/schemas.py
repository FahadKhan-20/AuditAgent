from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

SeverityLevel = Literal["Critical", "High", "Medium", "Low"]
FindingStatus = Literal["Suspected", "Reproduced", "Not reproduced"]

class Finding(BaseModel):
    id: str = Field(description="Unique finding identifier (e.g. FINDING-001)")
    title: str = Field(description="Short descriptive title of the issue")
    severity: SeverityLevel = Field(description="Issue severity level")
    category: str = Field(description="SWC Registry identifier (e.g. SWC-107)")
    file: str = Field(description="Target file name or path")
    lines: List[int] = Field(default_factory=list, description="Line numbers where the issue occurs")
    description: str = Field(description="Detailed explanation of the vulnerability mechanics")
    status: FindingStatus = Field(default="Suspected", description="Current status of verification")
    regression_test: Optional[str] = Field(default=None, description="Generated Foundry test (.t.sol)")
    test_log: Optional[str] = Field(default=None, description="Output from forge test execution")
    fix_diff: Optional[str] = Field(default=None, description="Unified diff patch fixing the issue")
    remediation_notes: Optional[str] = Field(default=None, description="Defensive guidance, CEI, gas notes")

class AuditRequest(BaseModel):
    source_code: Optional[str] = None
    contract_address: Optional[str] = None
    chain_id: Optional[int] = 1
    contract_name: Optional[str] = None

class AuditJob(BaseModel):
    job_id: str
    status: Literal["queued", "running", "completed", "failed"] = "queued"
    contract_name: str = "Unknown"
    findings: List[Finding] = []
    report_markdown: Optional[str] = None
    error: Optional[str] = None

class StreamEvent(BaseModel):
    node: str
    status: Literal["started", "progress", "completed", "error"]
    message: str
    payload: Optional[Dict[str, Any]] = None
    timestamp: str
