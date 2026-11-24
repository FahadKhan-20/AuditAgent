import re
import json
import httpx
from typing import Dict, Tuple, Optional
from ..config import settings

CHAIN_API_URLS: Dict[int, str] = {
    1: "https://api.etherscan.io/api",
    11155111: "https://api-sepolia.etherscan.io/api",
    137: "https://api.polygonscan.com/api",
    42161: "https://api.arbiscan.io/api",
    10: "https://api-optimistic.etherscan.io/api",
    8453: "https://api.basescan.org/api",
}

def is_ethereum_address(value: str) -> bool:
    return bool(re.match(r"^0x[a-fA-F0-9]{40}$", value.strip()))

def extract_contract_name(source: str) -> str:
    match = re.search(r"\bcontract\s+([A-Za-z0-9_]+)", source)
    if match:
        return match.group(1)
    match_interface = re.search(r"\binterface\s+([A-Za-z0-9_]+)", source)
    if match_interface:
        return match_interface.group(1)
    return "Contract"

async def fetch_etherscan_source(address: str, chain_id: int = 1) -> Tuple[str, str, Dict[str, str]]:
    """
    Fetches verified source code from Etherscan API.
    Handles standard single-file, multi-file JSON, and proxy contracts.
    Returns: (contract_name, flattened_source, source_files_dict)
    """
    api_url = CHAIN_API_URLS.get(chain_id, CHAIN_API_URLS[1])
    params = {
        "module": "contract",
        "action": "getsourcecode",
        "address": address,
        "apikey": settings.ETHERSCAN_API_KEY
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(api_url, params=params)
        response.raise_for_status()
        data = response.json()

    if data.get("status") != "1" or not data.get("result"):
        message = data.get("message", "Failed to retrieve source from Etherscan")
        result = data.get("result", "")
        raise ValueError(f"Etherscan error: {message} ({result})")

    item = data["result"][0]
    contract_name = item.get("ContractName", "Contract")
    raw_source = item.get("SourceCode", "")
    proxy_target = item.get("Implementation")

    # If proxy implementation is present, resolve proxy target recursively
    if proxy_target and is_ethereum_address(proxy_target) and proxy_target.lower() != address.lower():
        try:
            return await fetch_etherscan_source(proxy_target, chain_id)
        except Exception:
            pass # Fall back to current proxy contract code

    source_files: Dict[str, str] = {}
    flattened_parts = []

    # Etherscan often wraps JSON in double braces: {{ ... }}
    cleaned_source = raw_source.strip()
    if cleaned_source.startswith("{{") and cleaned_source.endswith("}}"):
        cleaned_source = cleaned_source[1:-1]

    if cleaned_source.startswith("{") and cleaned_source.endswith("}"):
        try:
            parsed = json.loads(cleaned_source)
            sources = parsed.get("sources", parsed)
            for path, file_info in sources.items():
                content = file_info.get("content", "") if isinstance(file_info, dict) else str(file_info)
                source_files[path] = content
                flattened_parts.append(f"// File: {path}\n{content}")
            flattened = "\n\n".join(flattened_parts)
            return contract_name, flattened, source_files
        except json.JSONDecodeError:
            pass

    # Single-file source
    filename = f"{contract_name}.sol"
    source_files[filename] = raw_source
    return contract_name, raw_source, source_files

async def resolve_source(input_value: str, chain_id: int = 1) -> Tuple[str, str, Dict[str, str]]:
    """
    Resolves input (either raw source code or Etherscan address)
    Returns: (contract_name, flattened_source, source_files)
    """
    clean_input = input_value.strip()
    if is_ethereum_address(clean_input):
        return await fetch_etherscan_source(clean_input, chain_id)

    contract_name = extract_contract_name(clean_input)
    filename = f"{contract_name}.sol"
    return contract_name, clean_input, {filename: clean_input}
