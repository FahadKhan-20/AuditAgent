import { createPublicClient, http, isAddress } from "viem";
import { mainnet, sepolia, polygon, arbitrum, optimism, base } from "viem/chains";

export const SUPPORTED_CHAINS = [
  { id: mainnet.id, name: "Ethereum Mainnet", chain: mainnet },
  { id: sepolia.id, name: "Sepolia Testnet", chain: sepolia },
  { id: arbitrum.id, name: "Arbitrum One", chain: arbitrum },
  { id: optimism.id, name: "Optimism", chain: optimism },
  { id: polygon.id, name: "Polygon PoS", chain: polygon },
  { id: base.id, name: "Base", chain: base },
];

export async function resolveEnsOrAddress(input: string, chainId: number = 1): Promise<{ address: string | null; error?: string }> {
  const trimmed = input.trim();
  if (isAddress(trimmed)) {
    return { address: trimmed };
  }

  if (trimmed.endsWith(".eth")) {
    try {
      const client = createPublicClient({
        chain: mainnet,
        transport: http("https://eth.llamarpc.com"),
      });
      const resolved = await client.getEnsAddress({ name: trimmed });
      if (resolved) {
        return { address: resolved };
      }
      return { address: null, error: "ENS name could not be resolved" };
    } catch (e: any) {
      return { address: null, error: e?.message || "ENS lookup failed" };
    }
  }

  return { address: null, error: "Invalid Ethereum address or ENS name" };
}
