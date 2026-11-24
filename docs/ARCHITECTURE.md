# AuditAgent: Architecture & System Design

Autonomous Solidity code reviewer and invariant regression testing agent.

---

## 1. System Overview & Scope

AuditAgent provides automated smart contract vulnerability analysis, regression test generation, and automated remediation generation for smart contract developers prior to deployment.

- **Developer Pre-Deployment Focus**: Designed for smart contract developers and security auditors reviewing authorized codebases.
- **Strict Local Sandboxing**: Every audit runs in an isolated ephemeral temporary directory (`/tmp/auditagent_<job_id>`), capped at 60 seconds execution time per run, with no live transaction broadcasting.
- **Empirical Verification**: Vulnerability status is never marked as `Reproduced` unless a Foundry regression test explicitly fails on the target code (confirming the defect) and passes once the fix is applied.
- **Classification Standard**: Mapped directly to the Smart Contract Weakness Classification (SWC Registry) and OWASP Smart Contract Top 10.

---

## 2. End-to-End Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client["Web Client (Next.js 14 App Router)"]
        UI_Input["Input Page (Monaco Editor / Etherscan & ENS via viem/wagmi)"]
        UI_SSE["SSE Client Listener (EventSource / fetch stream)"]
        UI_Dashboard["Audit Dashboard (Live Timeline, Findings Table, Diff Viewer)"]
    end

    subgraph API_Gateway["FastAPI Backend (/apps/agent)"]
        EP_Audit["POST /audit (Generate Job ID & Spawn Graph)"]
        EP_Stream["GET /audit/{id}/stream (SSE Node Events & Logs)"]
        EP_Report["GET /audit/{id}/report.md (Markdown Download)"]
    end

    subgraph LangGraph_Agent["LangGraph Agent Workflow"]
        N_Resolve["1. resolve_source\n(Paste / Etherscan API / Proxy Resolver)"]
        N_Analyze["2. static_analyze\n(Slither AST/JSON + Custom SWC Detectors)"]
        N_WriteTest["3. write_regression_test\n(Foundry .t.sol Invariant Assertion)"]
        N_VerifyRepro["4. verify_regression\n(Run forge test -vvv in Sandbox)"]
        N_GenFix["5. generate_fix\n(CEI / ReentrancyGuard / AccessControl / Math)"]
        N_VerifyFix["6. verify_fix\n(Run forge test against Patched Code)"]
        N_Report["7. build_report\n(Executive Summary, Matrix, Diff, Remediation)"]
    end

    subgraph Sandbox["Execution Sandbox (Isolated Temp Directory)"]
        SB_Dir["Temp Job Directory\n(/tmp/auditagent_{id})"]
        SB_Slither["Slither Static Engine"]
        SB_Foundry["Foundry / Anvil Local Fork\n(60s timeout, read-only RPC)"]
    end

    %% Client / API Flow
    UI_Input -->|POST /audit {source, network, address}| EP_Audit
    EP_Audit -->|Spawns background task| N_Resolve
    EP_Audit -->|Returns job_id| UI_Input
    UI_Input -->|Subscribes| EP_Stream
    EP_Stream --> UI_SSE
    UI_SSE --> UI_Dashboard
    EP_Report --> UI_Dashboard

    %% Workflow Flow
    N_Resolve --> N_Analyze
    N_Analyze -->|Findings (Suspected)| N_WriteTest
    N_WriteTest --> N_VerifyRepro
    N_VerifyRepro -->|Compile error & retry < 2| N_WriteTest
    N_VerifyRepro -->|Defect confirmed (Test Fails)| N_GenFix
    N_VerifyRepro -->|Defect not confirmed (Test Passes)| N_Report
    N_GenFix --> N_VerifyFix
    N_VerifyFix -->|Fix fails & retry < 1| N_GenFix
    N_VerifyFix --> N_Report

    %% Sandbox Connections
    N_Analyze -.->|Slither JSON| SB_Slither
    N_VerifyRepro -.->|forge test -vvv| SB_Foundry
    N_VerifyFix -.->|forge test -vvv| SB_Foundry
    SB_Dir -.-> SB_Slither
    SB_Dir -.-> SB_Foundry
```

---

## 3. Shared Data Models & State Schema

### 3.1 Pydantic Models (Backend: `/apps/agent/src/models/schemas.py`)

```python
from typing import Literal, Optional, List
from pydantic import BaseModel, Field

SeverityLevel = Literal["Critical", "High", "Medium", "Low"]
FindingStatus = Literal["Suspected", "Reproduced", "Not reproduced"]

class Finding(BaseModel):
    id: str = Field(description="Unique finding identifier (e.g., FINDING-001)")
    title: str = Field(description="Concise description of the vulnerability")
    severity: SeverityLevel
    category: str = Field(description="SWC Registry ID, e.g. SWC-107 (Reentrancy)")
    file: str = Field(description="Relative file path where the issue occurs")
    lines: List[int] = Field(description="Line numbers relevant to the defect")
    description: str = Field(description="Detailed explanation of the flaw and impact")
    status: FindingStatus = Field(default="Suspected")
    regression_test: Optional[str] = Field(default=None, description="Foundry .t.sol test code")
    test_log: Optional[str] = Field(default=None, description="Raw stdout/stderr from forge test")
    fix_diff: Optional[str] = Field(default=None, description="Unified diff patch fixing the issue")
    remediation_notes: Optional[str] = Field(default=None, description="Gas and implementation notes")
```

---

## 4. LangGraph Node Definitions & Lifecycle

| Node | Name | Input State | Output Delta | Tool / Engine |
| :--- | :--- | :--- | :--- | :--- |
| **Node 1** | `resolve_source` | `source_input`, `chain_id` | `source_files`, `flattened_source`, `contract_name` | Direct AST parser or Etherscan `getsourcecode` API with multi-file unpacking & proxy target resolution |
| **Node 2** | `static_analyze` | `flattened_source`, `working_dir` | `findings: List[Finding]` (all marked `Suspected`) | Slither CLI `--json` output merged with custom AST rules for SWC-107, SWC-104, SWC-115, SWC-105, SWC-101 |
| **Node 3** | `write_regression_test`| `current_finding`, `flattened_source`, `test_compile_error` | `regression_test` | LLM generates Foundry `.t.sol` asserting invariant (e.g. state consistency, auth checks, balances) |
| **Node 4** | `verify_regression` | `regression_test`, `working_dir` | `status`, `test_log`, `retry_count` | Executes `forge test -vvv`. If compilation fails and `retry_count < 2`, loops back to Node 3. If test fails as expected, status = `Reproduced`. |
| **Node 5** | `generate_fix` | `current_finding`, `flattened_source` | `fix_diff`, `patched_source` | Generates minimal unified diff following CEI, ReentrancyGuard, OpenZeppelin AccessControl, SafeMath / checked math |
| **Node 6** | `verify_fix` | `patched_source`, `regression_test`, `working_dir` | `fix_verified: bool`, `patch_test_log` | Runs `forge test -vvv` against patched code. Expects test to PASS. |
| **Node 7** | `build_report` | `findings`, `contract_name` | `report_markdown` | Formats comprehensive Markdown report with summary badges, SWC registry references, diffs, and remediation advice |

---

## 5. Retry, Fallback & Failure Policies

- **Maximum Retries**: 2 retries per finding test if compilation fails.
- **Feedback Payload**: Exact stderr from `solc` / `forge build` is passed back into the prompt context along with the previous invalid test code.
- **Exhaustion Behavior**: If 2 retries fail, the finding status remains `Suspected`, the compilation error is logged into `test_log`, and the graph proceeds to the next finding without crashing the audit run.
- **Sandbox Isolation**: Ephemeral `/tmp/auditagent_<job_id>` directory, 60s subprocess timeout, restricted outbound networking.
