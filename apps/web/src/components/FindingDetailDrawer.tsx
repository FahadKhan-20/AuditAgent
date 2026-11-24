"use client";

import React, { useState } from "react";
import { X, Check, Copy, Code, Terminal, GitCompare, FileText, CheckCircle2 } from "lucide-react";
import { Finding } from "../types/audit";
import { DiffViewer } from "./DiffViewer";

interface FindingDetailDrawerProps {
  finding: Finding | null;
  onClose: () => void;
}

type TabType = "test" | "logs" | "diff" | "notes";

export const FindingDetailDrawer: React.FC<FindingDetailDrawerProps> = ({ finding, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>("diff");
  const [copied, setCopied] = useState(false);

  if (!finding) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0e131b] border-l border-surfaceBorder shadow-2xl z-50 flex flex-col transition-all">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surfaceBorder bg-[#111722] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
            {finding.id}
          </span>
          <span className="text-xs font-mono text-slate-400">{finding.category}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            {finding.status}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Title & Description */}
      <div className="px-5 py-4 border-b border-surfaceBorder/60 bg-[#0c1017]">
        <h2 className="text-sm font-bold text-slate-100 mb-1">{finding.title}</h2>
        <p className="text-xs text-slate-400 leading-relaxed">{finding.description}</p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 font-mono">
          <span>Target File: {finding.file}</span>
          <span>•</span>
          <span>Lines: {finding.lines?.join(", ") || "N/A"}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surfaceBorder bg-[#111620] px-4 gap-2">
        <button
          onClick={() => setActiveTab("diff")}
          className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "diff"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          Remediation Patch Diff
        </button>
        <button
          onClick={() => setActiveTab("test")}
          className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "test"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Regression Test (.t.sol)
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "logs"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Foundry Logs
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "notes"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Remediation Notes
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "diff" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Minimal Secure Fix Unified Diff:</span>
              <button
                onClick={() => handleCopy(finding.fix_diff || "")}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy Diff
              </button>
            </div>
            <DiffViewer diffText={finding.fix_diff || ""} />
          </div>
        )}

        {activeTab === "test" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Foundry Invariant Assertion Test:</span>
              <button
                onClick={() => handleCopy(finding.regression_test || "")}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy Test
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-[#080b0f] border border-surfaceBorder font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
              {finding.regression_test || "// No regression test generated"}
            </pre>
          </div>
        )}

        {activeTab === "logs" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Forge Test -vvv Execution Output:</span>
              <button
                onClick={() => handleCopy(finding.test_log || "")}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy Logs
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-[#080b0f] border border-surfaceBorder font-mono text-xs text-emerald-400/90 overflow-x-auto leading-relaxed whitespace-pre">
              {finding.test_log || "// No execution logs available"}
            </pre>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              <h4 className="font-semibold text-slate-100 mb-1">Implementation Advice:</h4>
              <p>{finding.remediation_notes || "Follow standard checks-effects-interactions and OpenZeppelin patterns."}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#080b0f] border border-surfaceBorder">
              <h4 className="font-semibold text-slate-200 mb-2">Verification Methodology:</h4>
              <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                <li>Assert invariant on vulnerable code (expect FAIL).</li>
                <li>Apply unified patch diff to contract.</li>
                <li>Re-run the exact invariant test (expect PASS).</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
