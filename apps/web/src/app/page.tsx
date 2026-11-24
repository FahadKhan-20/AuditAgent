"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header } from "../components/Header";
import { SolidityEditor } from "../components/SolidityEditor";
import { AddressInput } from "../components/AddressInput";
import { AgentTimeline } from "../components/AgentTimeline";
import { FindingsTable } from "../components/FindingsTable";
import { FindingDetailDrawer } from "../components/FindingDetailDrawer";
import { ExportMarkdownButton } from "../components/ExportMarkdownButton";
import { Finding, AuditJob, StreamEvent } from "../types/audit";
import { Play, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";

const DEFAULT_SOLIDITY = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReentrancyBank
 * @notice SWC-107: Reentrancy vulnerability fixture.
 * State update occurs AFTER the external call, violating Checks-Effects-Interactions.
 */
contract ReentrancyBank {
    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function deposit() external payable {
        require(msg.value > 0, "Deposit must be > 0");
        balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "Insufficient balance");

        // Vulnerability (SWC-107): External call happens before state update
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Transfer failed");

        balances[msg.sender] = 0;
        emit Withdrawn(msg.sender, balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}`;

export default function AuditDashboard() {
  const [sourceCode, setSourceCode] = useState(DEFAULT_SOLIDITY);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState(1);
  const [activeTab, setActiveTab] = useState<"editor" | "address">("editor");

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("idle");
  const [contractName, setContractName] = useState("ReentrancyBank");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const startAudit = async () => {
    setErrorMsg(null);
    setEvents([]);
    setFindings([]);
    setSelectedFinding(null);
    setReportMarkdown(null);
    setJobStatus("running");

    try {
      const payload: any = { chain_id: chainId };
      if (activeTab === "address" && resolvedAddress) {
        payload.contract_address = resolvedAddress;
      } else {
        payload.source_code = sourceCode;
      }

      const res = await fetch("http://127.0.0.1:8000/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to start audit: ${res.statusText}`);
      }

      const data = await res.json();
      const newJobId = data.job_id;
      setJobId(newJobId);

      // Connect SSE
      connectSSE(newJobId);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while connecting to the audit backend.");
      setJobStatus("failed");
    }
  };

  const connectSSE = (id: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`http://127.0.0.1:8000/audit/${id}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const streamEvent: StreamEvent = JSON.parse(event.data);
        setEvents((prev) => [...prev, streamEvent]);

        if (streamEvent.payload?.contract_name) {
          setContractName(streamEvent.payload.contract_name);
        }

        if (streamEvent.payload?.findings) {
          setFindings(streamEvent.payload.findings);
        }

        if (streamEvent.node === "build_report" && streamEvent.status === "completed") {
          setJobStatus("completed");
          // Fetch final report
          fetch(`http://127.0.0.1:8000/audit/${id}`)
            .then((r) => r.json())
            .then((job: AuditJob) => {
              if (job.report_markdown) setReportMarkdown(job.report_markdown);
              if (job.findings) setFindings(job.findings);
            });
        }

        if (streamEvent.node === "pipeline" && streamEvent.status === "completed") {
          setJobStatus("completed");
          es.close();
        }

        if (streamEvent.status === "error") {
          setErrorMsg(streamEvent.message);
          setJobStatus("failed");
          es.close();
        }
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    es.onerror = (e) => {
      console.warn("SSE disconnected or completed");
      es.close();
    };
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0d12]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-surfaceBorder bg-[#0c1017]">
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg bg-[#111722] p-1 border border-surfaceBorder text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === "editor"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Solidity Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("address")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === "address"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Etherscan Address
              </button>
            </div>

            {jobId && (
              <span className="text-xs font-mono text-slate-400">
                Job: <span className="text-slate-200 font-semibold">{jobId}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ExportMarkdownButton
              jobId={jobId || undefined}
              reportMarkdown={reportMarkdown || undefined}
              contractName={contractName}
            />

            <button
              type="button"
              onClick={startAudit}
              disabled={jobStatus === "running"}
              className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {jobStatus === "running" ? "Auditing Sandbox..." : "Run Autonomous Audit"}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Input Section & Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 flex flex-col gap-4">
            {activeTab === "editor" ? (
              <SolidityEditor value={sourceCode} onChange={setSourceCode} />
            ) : (
              <AddressInput
                onAddressResolved={(addr, cId) => {
                  setResolvedAddress(addr);
                  setChainId(cId);
                }}
                disabled={jobStatus === "running"}
              />
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            <AgentTimeline events={events} currentJobStatus={jobStatus} />
          </div>
        </div>

        {/* Findings Table */}
        <div className="mt-2">
          <FindingsTable
            findings={findings}
            onSelectFinding={(f) => setSelectedFinding(f)}
            selectedFindingId={selectedFinding?.id}
          />
        </div>
      </main>

      {/* Drawer */}
      <FindingDetailDrawer
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />
    </div>
  );
}
