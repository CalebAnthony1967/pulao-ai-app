import React from "react";
import { Activity, CircleCheck, CircleAlert, Database, Files, LineChart, ScanSearch, ShieldCheck } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

const TOOLS = [
  { key: "parse_tender_packet", name: "Bid packet reader", icon: Files, note: "Reads pricing schedules and annexures from uploaded packets" },
  { key: "verify_statutory_compliance", name: "Statutory register checks", icon: ShieldCheck, note: "KRA, BRS, NSSF, SHA/SHIF and AGPO standing" },
  { key: "benchmark_pricing", name: "Market price benchmarking", icon: LineChart, note: "Compares every line item to the published index" },
  { key: "detect_collusion_patterns", name: "Coordination scanner", icon: ScanSearch, note: "Cross-checks metadata, timing and formatting between bidders" },
  { key: "verify_citation_existence", name: "Page reference verifier", icon: Activity, note: "Hides any flag that cannot point to a real page" },
];

export default function ToolHealthGrid({ logs, counts }) {
  const lastCall = (key) => {
    const match = logs.find((log) => log.mcp_tool_called === key);
    return match ? match.timestamp : null;
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Database className="h-4 w-4 text-navy" />
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Tenders on the register</p>
          <p className="font-display text-2xl text-navy">{counts.tenders}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Files className="h-4 w-4 text-navy" />
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Bids lodged</p>
          <p className="font-display text-2xl text-navy">{counts.bids}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <LineChart className="h-4 w-4 text-navy" />
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Indexed benchmark items</p>
          <p className="font-display text-2xl text-navy">{counts.priceItems}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Activity className="h-4 w-4 text-navy" />
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Audit entries</p>
          <p className="font-display text-2xl text-navy">{counts.auditEntries}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold text-foreground">Audit tool health</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Every tool records its last successful run into the audit trail.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {TOOLS.map((tool) => {
            const last = lastCall(tool.key);
            const Icon = tool.icon;
            return (
              <li key={tool.key} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    last ? "bg-compliance-soft text-compliance" : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">{tool.note}</p>
                </div>
                <div className="text-right">
                  <StatusBadge tone={last ? "compliance" : "neutral"}>
                    {last ? <CircleCheck className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
                    {last ? "Operational" : "Idle"}
                  </StatusBadge>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {last ? "Last run " + formatDateTime(last) : "No runs recorded"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}