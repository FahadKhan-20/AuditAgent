import difflib

def generate_unified_diff(original: str, patched: str, filepath: str = "contracts/Contract.sol") -> str:
    """Generates a clean unified diff between original and patched code."""
    orig_lines = original.splitlines(keepends=True)
    patch_lines = patched.splitlines(keepends=True)
    diff = difflib.unified_diff(
        orig_lines,
        patch_lines,
        fromfile=f"a/{filepath}",
        tofile=f"b/{filepath}",
        n=3
    )
    return "".join(diff)
