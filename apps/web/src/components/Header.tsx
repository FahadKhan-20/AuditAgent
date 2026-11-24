import React from "react";
import { ShieldAlert, Terminal, Sparkles, FileCode2 } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="border-b border-surfaceBorder bg-[#0f141c]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shadow-lg shadow-indigo-500/10">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">AuditAgent</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                v1.0 • Foundry Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Invariant Regression Testing & Automated Remediation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            Automated tooling, not a substitute for a manual audit.
          </div>
        </div>
      </div>
    </header>
  );
};
