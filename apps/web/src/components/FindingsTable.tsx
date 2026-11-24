"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, HelpCircle, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { Finding, SeverityLevel, FindingStatus } from "../types/audit";

interface FindingsTableProps {
  findings: Finding[];
  onSelectFinding: (finding: Finding) => void;
  selectedFindingId?: string;
}

const SEVERITY_STYLES: Record<SeverityLevel, { bg: string; text: string; border: string }> = {
  Critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  High: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  Medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  Low: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
};

const STATUS_STYLES: Record<FindingStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  Reproduced: {
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-400",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  },
  "Not reproduced": {
    bg: "bg-slate-500/10 border-slate-500/30",
    text: "text-slate-400",
    icon: <XCircle className="w-3.5 h-3.5 text-slate-400" />,
  },
  Suspected: {
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-400",
    icon: <HelpCircle className="w-3.5 h-3.5 text-amber-400" />,
  },
};

export const FindingsTable: React.FC<FindingsTableProps> = ({
  findings,
  onSelectFinding,
  selectedFindingId,
}) => {
  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-surfaceBorder bg-[#0c1017] p-8 text-center text-slate-400">
        <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-medium">No findings recorded yet.</p>
        <p className="text-xs text-slate-500 mt-1">
          Initiate an audit to detect vulnerabilities and run automated regression tests.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surfaceBorder bg-[#0c1017] overflow-hidden shadow-xl">
      <div className="px-4 py-3 border-b border-surfaceBorder bg-[#111722] flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-indigo-400" />
          Vulnerability Audit Matrix ({findings.length} findings)
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          Reproduced: {findings.filter((f) => f.status === "Reproduced").length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-surfaceBorder text-slate-400 bg-[#0e131b] font-mono text-[11px]">
              <th className="py-2.5 px-4">ID</th>
              <th className="py-2.5 px-4">Severity</th>
              <th className="py-2.5 px-4">Category</th>
              <th className="py-2.5 px-4">Title</th>
              <th className="py-2.5 px-4">Lines</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surfaceBorder">
            {findings.map((f) => {
              const sev = SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.Low;
              const stat = STATUS_STYLES[f.status] || STATUS_STYLES.Suspected;
              const isSelected = f.id === selectedFindingId;

              return (
                <tr
                  key={f.id}
                  onClick={() => onSelectFinding(f)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-indigo-600/15 border-l-2 border-indigo-500"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-semibold text-slate-300">
                    {f.id}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${sev.bg} ${sev.text} ${sev.border}`}
                    >
                      {f.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{f.category}</td>
                  <td className="py-3 px-4 font-medium text-slate-200 max-w-xs truncate">
                    {f.title}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {f.lines && f.lines.length > 0 ? f.lines.join(", ") : "-"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${stat.bg} ${stat.text}`}
                    >
                      {stat.icon}
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
