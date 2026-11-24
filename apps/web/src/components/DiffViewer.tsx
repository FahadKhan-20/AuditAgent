"use client";

import React, { useState } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { Columns, AlignJustify } from "lucide-react";

interface DiffViewerProps {
  diffText: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffText }) => {
  const [splitView, setSplitView] = useState(true);

  if (!diffText) {
    return <div className="text-xs text-slate-500 p-4 font-mono">No diff generated.</div>;
  }

  // Parse unified diff into oldValue and newValue for side-by-side display
  const lines = diffText.split("\n");
  const oldLines: string[] = [];
  const newLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) {
      continue;
    }
    if (line.startsWith("-")) {
      oldLines.push(line.slice(1));
    } else if (line.startsWith("+")) {
      newLines.push(line.slice(1));
    } else {
      const clean = line.startsWith(" ") ? line.slice(1) : line;
      oldLines.push(clean);
      newLines.push(clean);
    }
  }

  const oldValue = oldLines.join("\n");
  const newValue = newLines.join("\n");

  const darkTheme = {
    variables: {
      dark: {
        diffViewerBackground: "#080b0f",
        diffViewerColor: "#cbd5e1",
        addedBackground: "rgba(34, 197, 94, 0.15)",
        addedColor: "#86efac",
        removedBackground: "rgba(239, 68, 68, 0.15)",
        removedColor: "#fca5a5",
        wordAddedBackground: "rgba(34, 197, 94, 0.3)",
        wordRemovedBackground: "rgba(239, 68, 68, 0.3)",
        addedGutterBackground: "rgba(34, 197, 94, 0.2)",
        removedGutterBackground: "rgba(239, 68, 68, 0.2)",
        gutterBackground: "#0c1017",
        gutterBackgroundDark: "#0c1017",
        highlightBackground: "#1e293b",
        highlightGutterBackground: "#1e293b",
        codeFoldGutterBackground: "#0f172a",
        codeFoldBackground: "#0f172a",
        emptyLineBackground: "#080b0f",
        gutterColor: "#64748b",
        addedGutterColor: "#86efac",
        removedGutterColor: "#fca5a5",
        codeFoldContentColor: "#94a3b8",
        diffViewerTitleBackground: "#111620",
        diffViewerTitleColor: "#94a3b8",
        diffViewerTitleBorderColor: "#1f293d",
      },
    },
  };

  return (
    <div className="rounded-lg border border-surfaceBorder bg-[#080b0f] overflow-hidden">
      <div className="bg-[#111620] px-3 py-2 border-b border-surfaceBorder text-[11px] text-slate-400 flex items-center justify-between">
        <span className="font-mono text-slate-300">Side-by-Side Remediation Diff</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSplitView(true)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
              splitView ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Columns className="w-3 h-3" />
            Side-by-Side
          </button>
          <button
            type="button"
            onClick={() => setSplitView(false)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
              !splitView ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <AlignJustify className="w-3 h-3" />
            Inline
          </button>
        </div>
      </div>

      <div className="overflow-x-auto text-xs font-mono">
        <ReactDiffViewer
          oldValue={oldValue}
          newValue={newValue}
          splitView={splitView}
          useDarkTheme={true}
          leftTitle="Original (Vulnerable Code)"
          rightTitle="Patched (Remediated Code)"
          styles={darkTheme}
          compareMethod={DiffMethod.WORDS}
        />
      </div>
    </div>
  );
};
