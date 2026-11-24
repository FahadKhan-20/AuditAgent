"use client";

import React, { useState } from "react";
import { Download, Loader2, Check } from "lucide-react";

interface ExportMarkdownButtonProps {
  jobId?: string;
  reportMarkdown?: string;
  contractName?: string;
}

export const ExportMarkdownButton: React.FC<ExportMarkdownButtonProps> = ({
  jobId,
  reportMarkdown,
  contractName = "Contract",
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (!reportMarkdown && !jobId) return;

    setDownloading(true);
    try {
      const content = reportMarkdown || "# Security Audit Report\n\nNo content available.";
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit_report_${contractName}_${jobId || "export"}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={!reportMarkdown && !jobId}
      className="text-xs px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
    >
      {downloading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : downloaded ? (
        <Check className="w-3.5 h-3.5 text-white" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      {downloaded ? "Report Exported!" : "Export Markdown"}
    </button>
  );
};
