import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuditAgent | Autonomous Solidity Auditor & Invariant Regression Engine",
  description: "Autonomous smart contract vulnerability auditor with Foundry regression testing and automated patching.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0d12] text-slate-100 flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
