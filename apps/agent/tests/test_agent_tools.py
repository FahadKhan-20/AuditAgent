import os
import pytest
import asyncio
from apps.agent.src.models.schemas import Finding
from apps.agent.src.tools.slither_analyzer import run_static_analysis
from apps.agent.src.tools.foundry_runner import (
    FoundrySandbox,
    generate_regression_test_solidity,
    generate_secure_patch
)
from apps.agent.src.graph.workflow import create_audit_graph
from apps.agent.src.utils.report_builder import build_markdown_report

REENTRANCY_PATH = os.path.abspath("contracts-samples/ReentrancyBank.sol")
ACCESS_PATH = os.path.abspath("contracts-samples/AccessControlVault.sol")
UNCHECKED_PATH = os.path.abspath("contracts-samples/UncheckedCall.sol")

@pytest.fixture
def reentrancy_source():
    with open(REENTRANCY_PATH, "r", encoding="utf-8") as f:
        return f.read()

@pytest.fixture
def access_control_source():
    with open(ACCESS_PATH, "r", encoding="utf-8") as f:
        return f.read()

@pytest.fixture
def unchecked_call_source():
    with open(UNCHECKED_PATH, "r", encoding="utf-8") as f:
        return f.read()

def test_static_analysis_reentrancy(reentrancy_source):
    findings = run_static_analysis(reentrancy_source, "ReentrancyBank.sol")
    assert len(findings) > 0
    swc107_findings = [f for f in findings if f.category == "SWC-107"]
    assert len(swc107_findings) >= 1
    finding = swc107_findings[0]
    assert finding.severity == "High"
    assert finding.status == "Suspected"

def test_static_analysis_access_control(access_control_source):
    findings = run_static_analysis(access_control_source, "AccessControlVault.sol")
    swc105_findings = [f for f in findings if f.category == "SWC-105"]
    assert len(swc105_findings) >= 1
    assert swc105_findings[0].severity in ["Critical", "High"]

def test_static_analysis_unchecked_call(unchecked_call_source):
    findings = run_static_analysis(unchecked_call_source, "UncheckedCall.sol")
    swc104_findings = [f for f in findings if f.category == "SWC-104"]
    assert len(swc104_findings) >= 1

def test_reentrancy_regression_and_patch(reentrancy_source):
    findings = run_static_analysis(reentrancy_source, "ReentrancyBank.sol")
    finding = [f for f in findings if f.category == "SWC-107"][0]

    sandbox = FoundrySandbox(job_id="test_reentrancy")
    contract_filename = "ReentrancyBank.sol"
    sandbox.write_contract(contract_filename, reentrancy_source)

    test_content = generate_regression_test_solidity(finding, reentrancy_source, "ReentrancyBank")
    test_filename = "ReentrancyBank_SWC-107.t.sol"
    sandbox.write_test(test_filename, test_content)

    # 1. Invariant test fails against unpatched vulnerable code (reproducing defect)
    passed_orig, logs_orig, _ = sandbox.run_test(test_filename, is_patched=False, finding=finding)
    assert passed_orig is False
    assert "FAIL" in logs_orig

    # 2. Generate patch
    patched_code, diff, notes = generate_secure_patch(finding, reentrancy_source)
    assert len(diff) > 0
    assert "balances[msg.sender] = 0;" in patched_code

    # 3. Apply patch and test again -> must PASS
    sandbox.write_contract(contract_filename, patched_code)
    passed_patch, logs_patch, _ = sandbox.run_test(test_filename, is_patched=True, finding=finding)
    assert passed_patch is True
    assert "PASS" in logs_patch

    sandbox.cleanup()

@pytest.mark.asyncio
async def test_end_to_end_langgraph_audit(reentrancy_source):
    """
    Acceptance check:
    Run against /contracts-samples/ReentrancyBank.sol and confirm:
    - Ends with a Reproduced High finding
    - Regression test fails before fix and passes after
    - Produces complete markdown report with disclaimer
    """
    graph = create_audit_graph()
    initial_state = {
        "job_id": "test_e2e_reentrancy",
        "source_input": reentrancy_source,
        "chain_id": 1,
        "contract_name": "ReentrancyBank",
        "source_files": {},
        "flattened_source": "",
        "findings": [],
        "current_finding_idx": 0,
        "retry_count": 0,
        "test_compile_error": None,
        "report_markdown": None,
        "logs": []
    }

    final_state = await graph.ainvoke(initial_state)

    findings = final_state["findings"]
    reproduced_findings = [f for f in findings if f.status == "Reproduced" and f.severity == "High"]
    assert len(reproduced_findings) >= 1

    target_finding = reproduced_findings[0]
    assert target_finding.category == "SWC-107"
    assert target_finding.regression_test is not None
    assert "FAIL" in target_finding.test_log
    assert target_finding.fix_diff is not None

    report = final_state["report_markdown"]
    assert report is not None
    assert "Automated tooling, not a substitute for a manual audit." in report
    assert "Executive Summary" in report
    assert "SWC-107" in report
