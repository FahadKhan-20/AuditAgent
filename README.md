# AuditAgent: Autonomous Solidity Auditor & Invariant Regression Engine

> **DISCLAIMER:** Automated tooling, not a substitute for a manual audit.

AuditAgent is an autonomous smart contract security reviewer designed for Web3 developers and security engineers reviewing code before deployment. It discovers vulnerabilities via static analysis, synthesizes Foundry invariant regression tests in an isolated local sandbox, proves issues by asserting security invariants, and generates minimal unified patches that resolve the defect.

---

## Key Highlights

- **Pre-Deployment Invariant Testing**: Evaluates authorized local code. Never broadcasts transactions to live networks.
- **Empirical Defect Reproduction**: Findings are classified as `Reproduced` only when a generated Foundry test fails against the target code and passes after applying the patch.
- **Isolated Sandbox**: Runs in ephemeral `/tmp/auditagent_<id>` workspaces with a 60s execution timeout and read-only RPC access.
- **SWC Registry Aligned**: Covers SWC-107 (Reentrancy), SWC-105 (Missing Access Control), SWC-104 (Unchecked Low-Level Calls), SWC-115 (`tx.origin`), and SWC-101 (Arithmetic).
- **Streaming Telemetry**: Real-time Server-Sent Events (SSE) pipe LangGraph node transitions and logs straight to the Next.js UI.
- **Side-by-Side Diff Viewer**: Integrated `react-diff-viewer-continued` component with split-view and inline mode for remediation inspection.

---

## Repository Structure

```
.
├── apps/
│   ├── agent/                 # Python 3.11 + FastAPI + LangGraph Backend
│   │   ├── Dockerfile
│   │   ├── requirements.txt   # Pinned dependencies
│   │   ├── src/
│   │   │   ├── api/           # Endpoints: /audit, /audit/{id}/stream, /audit/{id}/report.md
│   │   │   ├── graph/         # LangGraph nodes, state, and retry workflow
│   │   │   ├── tools/         # Slither runner, Foundry sandbox, Etherscan resolver
│   │   │   ├── models/        # Shared Pydantic models (Finding, AuditJob)
│   │   │   └── utils/         # Diff generator and Markdown report synthesizer
│   │   └── tests/             # Pytest suite & E2E verification
│   └── web/                   # Next.js 14 App Router + Tailwind + viem/wagmi
│       ├── Dockerfile
│       ├── package.json
│       └── src/
│           ├── app/           # App Router pages and layouts
│           ├── components/    # Monaco editor, Timeline, Findings matrix, Diff viewer
│           └── types/         # Matching TypeScript interfaces
├── contracts-samples/         # Insecure educational test fixtures
│   ├── ReentrancyBank.sol     # SWC-107 fixture
│   ├── AccessControlVault.sol # SWC-105 fixture
│   ├── UncheckedCall.sol      # SWC-104 fixture
│   └── README.md
├── docs/
│   └── ARCHITECTURE.md        # Comprehensive system architecture & state design
├── docker-compose.yml         # Containerized web + agent (Foundry & Slither preloaded)
├── .env.example               # Pinned environment variables template
└── README.md                  # This file
```

---

## Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- (Optional) Docker & Docker Compose
- (Optional) Foundry & Slither for native execution

### 1. Environment Configuration
```bash
cp .env.example .env
```

### 2. Run with Docker Compose
```bash
docker compose up --build
```
- Web UI: `http://localhost:3000`
- API Backend & Docs: `http://localhost:8000/docs`

### 3. Local Development Setup

#### Backend (`/apps/agent`)
```bash
python -m pip install -r apps/agent/requirements.txt
python -m uvicorn apps.agent.src.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend (`/apps/web`)
```bash
cd apps/web
npm install
npm run dev
```

---

## Running Automated Tests

Run the backend verification suite (includes static detectors, Foundry test runner, and end-to-end LangGraph audit loop):

```bash
python -m pytest apps/agent/tests/test_agent_tools.py -v
```

Run the API and SSE streaming integration check:
```bash
python apps/agent/tests/verify_e2e.py
```

---

## Demo Walkthrough Script (for GIF / Video)

Follow this 60-second walkthrough to record a demo GIF of AuditAgent:

1. **Launch the Web Dashboard**:
   Open `http://localhost:3000` in your browser. Notice the dark-mode layout, live Foundry sandbox badge, and prominent safety disclaimer.
2. **Load Sample Contract**:
   Click the **"ReentrancyBank"** sample button in the code editor toolbar. The insecure contract populates instantly with line annotations.
3. **Trigger Autonomous Audit**:
   Click the **"Run Autonomous Audit"** button.
4. **Observe Live LangGraph Pipeline**:
   Watch the live timeline progress through:
   - `01 Source Resolver`: Normalizes the AST and extracts contract interfaces.
   - `02 Static Analysis`: Detects SWC-107 (Checks-Effects-Interactions violation).
   - `03 Foundry Invariant Engine`: Compiles a `.t.sol` test, executes it against the vulnerable code (`[FAIL] Invariant broken`), updates status to `Reproduced`, and validates the unified fix diff (`[PASS]`).
   - `04 Report Synthesizer`: Synthesizes unified diffs and markdown report.
5. **Inspect Proof & Remediation**:
   Click on finding `FINDING-001` in the matrix. The detail drawer opens showing:
   - Side-by-side color-coded unified diff (`balances[msg.sender] = 0;` placed before `.call`).
   - The generated Foundry invariant test code.
   - The raw `forge test -vvv` logs.
6. **Export Audit Report**:
   Click **"Export Markdown"** to download `audit_report_ReentrancyBank.md`.

---

## Ethical Boundaries & Scope

- **Developer Pre-Deployment Tool**: Built to audit code owned or authorized by the developer prior to deployment.
- **Isolated Testing**: All invariant checks execute locally in sandboxed temporary directories (`/tmp/auditagent_<id>`).
- **No Transaction Broadcasting**: Never signs or broadcasts transactions to live blockchain networks.
- **Standardized Weaknesses**: Uses standard SWC Registry classifications for transparent defect tracking.
