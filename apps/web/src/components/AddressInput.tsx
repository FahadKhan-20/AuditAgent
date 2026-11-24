"use client";

import React, { useState } from "react";
import { Globe, Search, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { SUPPORTED_CHAINS, resolveEnsOrAddress } from "../lib/wagmi";

interface AddressInputProps {
  onAddressResolved: (address: string, chainId: number) => void;
  disabled?: boolean;
}

export const AddressInput: React.FC<AddressInputProps> = ({ onAddressResolved, disabled }) => {
  const [input, setInput] = useState("");
  const [chainId, setChainId] = useState(1);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResolvedAddress(null);

    const res = await resolveEnsOrAddress(input, chainId);
    setLoading(false);
    if (res.address) {
      setResolvedAddress(res.address);
      onAddressResolved(res.address, chainId);
    } else {
      setError(res.error || "Could not resolve address");
    }
  };

  return (
    <div className="rounded-xl border border-surfaceBorder bg-[#0c1017] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-400" />
          Fetch from Etherscan / Verified Contract
        </label>
        <select
          value={chainId}
          onChange={(e) => setChainId(Number(e.target.value))}
          disabled={disabled}
          className="text-xs bg-[#111722] border border-surfaceBorder rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          {SUPPORTED_CHAINS.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          placeholder="0x... or vitalik.eth"
          disabled={disabled}
          className="flex-1 text-xs bg-[#111722] border border-surfaceBorder rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
        />
        <button
          type="button"
          onClick={handleLookup}
          disabled={disabled || loading || !input.trim()}
          className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium flex items-center gap-1.5 transition-all"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Resolve
        </button>
      </div>

      {resolvedAddress && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-mono truncate">Resolved: {resolvedAddress}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
