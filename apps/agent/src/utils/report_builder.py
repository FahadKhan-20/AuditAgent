from typing import List
from ..models.schemas import Finding

DISCLAIMER = "> **DISCLAIMER:** Automated tooling, not a substitute for a manual audit."

def build_markdown_report(contract_name: str, findings: List[Finding]) -> str:
    """Generates a comprehensive Markdown audit report."""
    total = len(findings)
    reproduced_count = sum(1 for f in findings if f.status == "Reproduced")
    critical_count = sum(1 for f in findings if f.severity == "Critical")
    high_count = sum(1 for f in findings if f.severity == "High")
    med_count = sum(1 for f in findings if f.severity == "Medium")
    low_count = sum(1 for f in findings if f.severity == "Low")

    lines = [
        f"# Security Audit Report: {contract_name}",
        "",
        DISCLAIMER,
        "",
        "## Executive Summary",
        "",
        f"- **Target Contract:** `{contract_name}`",
        f"- **Total Identified Issues:** {total}",
        f"- **Empirically Reproduced:** {reproduced_count} / {total}",
        f"- **Severity Breakdown:** Critical: {critical_count} | High: {high_count} | Medium: {med_count} | Low: {low_count}",
        "",
        "| ID | Title | Category | Severity | Status |",
        "| :--- | :--- | :--- | :--- | :--- |",
    ]

    for f in findings:
        status_badge = f"**{f.status}**" if f.status == "Reproduced" else f.status
        lines.append(f"| {f.id} | {f.title} | {f.category} | {f.severity} | {status_badge} |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Detailed Findings & Invariant Verifications")
    lines.append("")

    for f in findings:
        lines.append(f"### [{f.id}] {f.title}")
        lines.append("")
        lines.append(f"- **Severity:** `{f.severity}`")
        lines.append(f"- **Category:** `{f.category}`")
        lines.append(f"- **Location:** `{f.file}` (Lines: {', '.join(map(str, f.lines)) if f.lines else 'N/A'})")
        lines.append(f"- **Status:** `{f.status}`")
        lines.append("")
        lines.append(f"**Description:**  \n{f.description}")
        lines.append("")

        if f.regression_test:
            lines.append("#### Foundry Regression Test (.t.sol)")
            lines.append("```solidity")
            lines.append(f.regression_test.strip())
            lines.append("```")
            lines.append("")

        if f.test_log:
            lines.append("#### Foundry Test Execution Logs")
            lines.append("```text")
            lines.append(f.test_log.strip())
            lines.append("```")
            lines.append("")

        if f.fix_diff:
            lines.append("#### Suggested Remediation Patch (Unified Diff)")
            lines.append("```diff")
            lines.append(f.fix_diff.strip())
            lines.append("```")
            lines.append("")

        if f.remediation_notes:
            lines.append(f"**Remediation Guidance:**  \n{f.remediation_notes}")
            lines.append("")

        lines.append("---")
        lines.append("")

    lines.append("## Methodology & Sandbox Verification")
    lines.append("1. **Source Resolution**: Target source normalized and inspected.")
    lines.append("2. **Static Analysis**: Slither detectors combined with custom SWC rules.")
    lines.append("3. **Empirical Regression Testing**: Invariant assertions compiled into Foundry tests.")
    lines.append("4. **Remediation & Proof of Fix**: Minimal patch verified against the original regression test.")
    lines.append("")

    return "\n".join(lines)
