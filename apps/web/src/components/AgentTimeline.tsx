"use client";

import React from "react";
import { CheckCircle2, CircleDashed, AlertTriangle, Terminal, Cpu } from "lucide-react";
import { StreamEvent } from "../types/audit";

interface AgentTimelineProps {
  events: StreamEvent[];
  currentJobStatus: string;
}

const GRAPH_NODES = [
  { key: "resolve_source", label: "Source Resolver", desc: "Solidity AST & Etherscan unpacker" },
  { key: "static_analyze", label: "Static Analysis", desc: "Slither JSON & custom SWC detectors" },
  { key: "process_findings", label: "Foundry Invariant Engine", desc: "Regression testing & fix validation" },
  { key: "build_report", label: "Report Synthesizer", desc: "Markdown compilation & diff export" },
];

export const AgentTimeline: React.FC<AgentTimelineProps> = ({ events, currentJobStatus }) => {
  const latestEventByNode = events.reduce((acc, ev) => {
    acc[ev.node] = ev;
    return acc;
  }, {} as Record<string, StreamEvent>);

  return (
    <div className="rounded-xl border border-surfaceBorder bg-[#0c1017] p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-surfaceBorder pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Agent Workflow Pipeline
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surfaceBorder text-slate-300">
          Status: <span className={currentJobStatus === "completed" ? "text-emerald-400 font-semibold" : currentJobStatus === "running" ? "text-indigo-400 font-semibold" : "text-slate-400"}>{currentJobStatus}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {GRAPH_NODES.map((node, i) => {
          const ev = latestEventByNode[node.key];
          const isCompleted = ev?.status === "completed";
          const isStarted = ev?.status === "started" || ev?.status === "progress";

          return (
            <div
              key={node.key}
              className={`p-3 rounded-lg border transition-all ${
                isCompleted
                  ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-300"
                  : isStarted
                  ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-200 animate-pulse"
                  : "bg-[#111722]/50 border-surfaceBorder text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-slate-400">0{i + 1}</span>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isStarted ? (
                  <CircleDashed className="w-4 h-4 text-indigo-400 animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-slate-600" />
                )}
              </div>
              <div className="font-semibold text-xs text-slate-200">{node.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{node.desc}</div>
            </div>
          );
        })}
      </div>

      {events.length > 0 && (
        <div className="mt-1 bg-[#080b0f] rounded-lg p-3 border border-surfaceBorder/80">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-2 font-mono">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Agent Execution Log Stream ({events.length} events)</span>
          </div>
          <div className="max-h-28 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-300">
            {events.slice(-6).map((ev, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-slate-500 shrink-0">
                  {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : "::"}
                </span>
                <span className="text-indigo-400 shrink-0">[{ev.node}]</span>
                <span className="text-slate-200 truncate">{ev.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
