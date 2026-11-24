import os
import re
import json
import subprocess
import tempfile
import shutil
from typing import List, Dict, Any, Optional
from ..models.schemas import Finding, SeverityLevel

def run_slither_cli(source_path: str, timeout: int = 30) -> List[Dict[str, Any]]:
    """Attempts to run slither CLI with JSON output."""
    slither_bin = shutil.which("slither")
    if not slither_bin:
        return []

    try:
        cmd = [slither_bin, source_path, "--json", "-"]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        if result.stdout:
            data = json.loads(result.stdout)
            return data.get("results", {}).get("detectors", [])
    except Exception:
        pass
    return []

def map_slither_detector(detector: Dict[str, Any], filename: str) -> Optional[Finding]:
    check = detector.get("check", "")
    description = detector.get("description", "")
    impact = detector.get("impact", "Low").capitalize()
    if impact not in ["Critical", "High", "Medium", "Low"]:
        impact = "Medium"

    first_elem = detector.get("elements", [{}])[0]
    source_mapping = first_elem.get("source_mapping", {})
    lines = source_mapping.get("lines", [1])

    category_map = {
        "reentrancy-eth": ("SWC-107", "Reentrancy Vulnerability (ETH)", "High"),
        "reentrancy-no-eth": ("SWC-107", "Reentrancy Vulnerability (State)", "Medium"),
        "unchecked-lowlevel": ("SWC-104", "Unchecked Low-Level Call Return Value", "Medium"),
        "tx-origin": ("SWC-115", "Authorization via tx.origin", "High"),
        "unprotected-upgrade": ("SWC-105", "Unprotected Sensitive Function", "Critical"),
        "arbitrary-send-erc20": ("SWC-105", "Missing Access Control on Transfer", "High"),
        "arbitrary-send-eth": ("SWC-105", "Unprotected Ether Withdrawal", "High"),
    }

    swc_id, title, default_sev = category_map.get(check, ("SWC-000", f"Static Finding: {check}", impact))

    return Finding(
        id=f"FINDING-{check[:10]}",
        title=title,
        severity=default_sev, # type: ignore
        category=swc_id,
        file=filename,
        lines=lines,
        description=description.strip(),
        status="Suspected"
    )

def analyze_reentrancy(source: str, filename: str) -> List[Finding]:
    """SWC-107: Reentrancy check (checks-effects-interactions violation)."""
    findings = []
    lines = source.splitlines()

    # Look for functions containing external calls followed by state writes
    in_function = False
    func_name = ""
    func_start_line = 0
    call_line = 0
    has_call = False
    has_reentrancy_guard = "nonReentrant" in source or "ReentrancyGuard" in source

    for i, line in enumerate(lines, 1):
        clean = line.strip()
        func_match = re.search(r"function\s+([A-Za-z0-9_]+)\s*\(", clean)
        if func_match:
            in_function = True
            func_name = func_match.group(1)
            func_start_line = i
            has_call = False
            call_line = 0

        if in_function:
            # Check for external call: .call{value: ...} or .transfer or .send
            if re.search(r"\.(call|transfer|send)\s*(\{[^}]*\})?\(", clean):
                has_call = True
                call_line = i

            # Check for subsequent state write (e.g. balances[...] = ...)
            if has_call and i > call_line:
                if re.search(r"([A-Za-z0-9_]+\[[^\]]+\]|\b[A-Za-z0-9_]+\b)\s*(=|\+=|-=)", clean):
                    if not clean.startswith("//") and "bool" not in clean and "uint" not in clean:
                        if not has_reentrancy_guard:
                            findings.append(Finding(
                                id=f"FINDING-SWC-107-{func_name}",
                                title=f"Reentrancy via State Update After External Call in '{func_name}'",
                                severity="High",
                                category="SWC-107",
                                file=filename,
                                lines=[call_line, i],
                                description=(
                                    f"In function '{func_name}', an external call is executed at line {call_line} "
                                    f"prior to the state mutation at line {i}. This violates the "
                                    "Checks-Effects-Interactions (CEI) pattern and allows re-entrant calls "
                                    "to repeatedly execute logic with stale state."
                                ),
                                status="Suspected"
                            ))
                            has_call = False # avoid duplicate flags for same function

        if clean.endswith("}") and in_function:
            in_function = False

    return findings

def analyze_unchecked_calls(source: str, filename: str) -> List[Finding]:
    """SWC-104: Unchecked Low-Level Call Return Value."""
    findings = []
    lines = source.splitlines()

    for i, line in enumerate(lines, 1):
        clean = line.strip()
        if clean.startswith("//"):
            continue
        # Pattern: recipient.call{...}("") without bool success or require(
        if re.search(r"^[A-Za-z0-9_.]+\.call\s*(\{[^}]*\})?\(", clean):
            findings.append(Finding(
                id=f"FINDING-SWC-104-L{i}",
                title="Unchecked Low-Level Call Return Value",
                severity="Medium",
                category="SWC-104",
                file=filename,
                lines=[i],
                description=(
                    f"Low-level `.call` at line {i} does not check the returned boolean status. "
                    "If the target recipient contract reverts or runs out of gas, the caller "
                    "will silently continue execution, causing state desynchronization."
                ),
                status="Suspected"
            ))
        elif ".call{" in clean and "require(" not in clean and "(bool " not in clean:
            # e.g., (success, ) without checking success in require
            findings.append(Finding(
                id=f"FINDING-SWC-104-L{i}",
                title="Unchecked Low-Level Call Return Value",
                severity="Medium",
                category="SWC-104",
                file=filename,
                lines=[i],
                description=(
                    f"Low-level call return value at line {i} is not validated with a require check."
                ),
                status="Suspected"
            ))

    return findings

def analyze_tx_origin(source: str, filename: str) -> List[Finding]:
    """SWC-115: Authorization through tx.origin."""
    findings = []
    lines = source.splitlines()

    for i, line in enumerate(lines, 1):
        clean = line.strip()
        if clean.startswith("//"):
            continue
        if "tx.origin" in clean and ("==" in clean or "!=" in clean or "require" in clean):
            findings.append(Finding(
                id=f"FINDING-SWC-115-L{i}",
                title="Insecure Authentication via tx.origin",
                severity="High",
                category="SWC-115",
                file=filename,
                lines=[i],
                description=(
                    f"Line {i} uses `tx.origin` for authorization. If an authorized user interacts with "
                    "a malicious intermediary contract, the attacker can leverage the user's signature "
                    "to bypass this check via phishing or call delegation."
                ),
                status="Suspected"
            ))
    return findings

def analyze_missing_access_control(source: str, filename: str) -> List[Finding]:
    """SWC-105: Missing Access Control / Unprotected Ether Withdrawal."""
    findings = []
    lines = source.splitlines()

    sensitive_patterns = [
        (r"function\s+(withdrawAll|drain|emergencyWithdraw|transferOwnership|setOwner|destroy|kill|mint)\s*\(", "Critical"),
    ]

    for i, line in enumerate(lines, 1):
        clean = line.strip()
        if clean.startswith("//"):
            continue

        for pattern, default_sev in sensitive_patterns:
            match = re.search(pattern, clean)
            if match:
                func_name = match.group(1)
                # Check if declaration contains auth modifier: onlyOwner, onlyRole, internal, private
                func_decl_block = " ".join([l.strip() for l in lines[max(0, i-1):min(len(lines), i+3)]])
                has_auth = any(auth in func_decl_block for auth in ["onlyOwner", "onlyRole", "internal", "private", "msg.sender == owner"])
                if not has_auth:
                    findings.append(Finding(
                        id=f"FINDING-SWC-105-{func_name}",
                        title=f"Missing Access Control on Sensitive Function '{func_name}'",
                        severity=default_sev, # type: ignore
                        category="SWC-105",
                        file=filename,
                        lines=[i],
                        description=(
                            f"Function '{func_name}' at line {i} performs privileged operations (e.g. fund withdrawal "
                            "or ownership modification) but lacks access control modifiers (such as `onlyOwner`). "
                            "Any external caller can execute this method."
                        ),
                        status="Suspected"
                    ))
    return findings

def analyze_unchecked_arithmetic(source: str, filename: str) -> List[Finding]:
    """SWC-101: Unchecked Arithmetic / Integer Overflow Potential."""
    findings = []
    lines = source.splitlines()

    has_unchecked_block = False
    for i, line in enumerate(lines, 1):
        clean = line.strip()
        if "unchecked {" in clean:
            has_unchecked_block = True
            findings.append(Finding(
                id=f"FINDING-SWC-101-L{i}",
                title="Unchecked Arithmetic Block",
                severity="Low",
                category="SWC-101",
                file=filename,
                lines=[i],
                description=(
                    f"Line {i} uses an `unchecked {{ ... }}` block. Arithmetic operations inside this "
                    "block do not revert on overflow or underflow. Ensure boundaries are strictly pre-validated."
                ),
                status="Suspected"
            ))

    # Check for Solidity < 0.8 without SafeMath
    pragma_match = re.search(r"pragma\s+solidity\s+([^;]+);", source)
    if pragma_match:
        pragma_ver = pragma_match.group(1)
        if any(v in pragma_ver for v in ["0.4.", "0.5.", "0.6.", "0.7."]) and "SafeMath" not in source:
            findings.append(Finding(
                id="FINDING-SWC-101-PRAGMA",
                title="Unchecked Arithmetic in Legacy Compiler (<0.8.0)",
                severity="Medium",
                category="SWC-101",
                file=filename,
                lines=[1],
                description=(
                    f"Solidity version ({pragma_ver}) does not have built-in overflow/underflow checks. "
                    "Arithmetic operations without OpenZeppelin SafeMath may overflow or underflow silently."
                ),
                status="Suspected"
            ))

    return findings

def run_static_analysis(source: str, filename: str = "Contract.sol") -> List[Finding]:
    """
    Executes static analysis using Slither (if available) and deterministic custom detectors.
    Deduplicates findings by category and lines.
    """
    all_findings: List[Finding] = []

    # 1. Custom High-Precision Detectors
    all_findings.extend(analyze_reentrancy(source, filename))
    all_findings.extend(analyze_missing_access_control(source, filename))
    all_findings.extend(analyze_unchecked_calls(source, filename))
    all_findings.extend(analyze_tx_origin(source, filename))
    all_findings.extend(analyze_unchecked_arithmetic(source, filename))

    # 2. Slither if available
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".sol", delete=False) as tf:
            tf.write(source)
            temp_path = tf.name
        slither_results = run_slither_cli(temp_path)
        for det in slither_results:
            f = map_slither_detector(det, filename)
            if f:
                all_findings.append(f)
        os.unlink(temp_path)
    except Exception:
        pass

    # Deduplicate by category + line
    seen_keys = set()
    deduped: List[Finding] = []
    for f in all_findings:
        key = (f.category, tuple(f.lines[:1]))
        if key not in seen_keys:
            seen_keys.add(key)
            deduped.append(f)

    # Re-index ids sequentially
    for i, finding in enumerate(deduped, 1):
        finding.id = f"FINDING-{i:03d}"

    return deduped
