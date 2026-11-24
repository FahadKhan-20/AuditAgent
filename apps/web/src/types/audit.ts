export type SeverityLevel = "Critical" | "High" | "Medium" | "Low";
export type FindingStatus = "Suspected" | "Reproduced" | "Not reproduced";

export interface Finding {
  id: string;
  title: string;
  severity: SeverityLevel;
  category: string; // e.g. SWC-107
  file: string;
  lines: number[];
  description: string;
  status: FindingStatus;
  regression_test?: string;
  test_log?: string;
  fix_diff?: string;
  remediation_notes?: string;
}

export interface AuditJob {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  contract_name: string;
  findings: Finding[];
  report_markdown?: string;
  error?: string;
}

export interface StreamEvent {
  job_id: string;
  node: string;
  status: "started" | "progress" | "completed" | "error";
  message: string;
  payload?: {
    findings?: Finding[];
    contract_name?: string;
  };
  timestamp: string;
}
