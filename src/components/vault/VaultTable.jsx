import React, { useEffect, useMemo, useState } from "react";
import { Fingerprint, Loader2, Search, ShieldCheck, ShieldX } from "lucide-react";
import { listAuditLogs } from "@/lib/data";
import { verifyChain } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";

export default function VaultTable() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [integrity, setIntegrity] = useState(null);
  const [checking, setChecking] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      listAuditLogs({ search, limit: 150 })
        .then((rows) => {
          if (active) setLogs(rows);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const stats = useMemo(() => {
    const chain = logs.filter((log) => log.tamper_proof_hash).length;
    return { total: logs.length, chain };
  }, [logs]);

  const runIntegrityCheck = async () => {
    setChecking(true);
    try {
      const result = await verifyChain(logs.slice(0, 150));
      setIntegrity(result);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by action or tool"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={runIntegrityCheck}
          disabled={checking || !logs.length}
          className="flex items-center justify-center gap-2 rounded-md border border-navy/30 px-3 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy-soft disabled:opacity-50"
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
          Verify chain integrity
        </button>
      </div>

      {integrity ? (
        <div
          className={
            integrity.broken.length
              ? "flex items-center gap-2 rounded-lg border border-critical/30 bg-critical-soft p-3 text-sm text-critical"
              : "flex items-center gap-2 rounded-lg border border-compliance/30 bg-compliance-soft p-3 text-sm text-compliance"
          }
        >
          {integrity.broken.length ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {integrity.broken.length
            ? integrity.broken.length + " entries do not match the chain. Investigate immediately."
            : "All " + integrity.checked + " entries verified. The chain is intact and nothing has been altered."}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-semibold text-foreground">Immutable audit vault</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Append-only. Every entry is hashed together with the entry before it.
            </p>
          </div>
          <StatusBadge tone="navy">{stats.total} entries</StatusBadge>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading the vault
          </div>
        ) : logs.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={ShieldCheck}
              title="No audit entries match"
              description="Try a different search term, or run an audit to generate entries."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors hover:bg-secondary/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{log.action_performed}</span>
                    {log.mcp_tool_called ? (
                      <StatusBadge tone="neutral">{log.mcp_tool_called.replace(/_/g, " ")}</StatusBadge>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</span>
                  </div>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {log.tamper_proof_hash}
                  </p>
                </button>
                {expanded === log.id ? (
                  <div className="space-y-3 border-t border-border bg-background px-5 py-4 text-xs">
                    <div>
                      <p className="font-medium uppercase tracking-wide text-muted-foreground">Input recorded</p>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-3 font-mono text-[11px] text-foreground">
                        {JSON.stringify(log.input_payload, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="font-medium uppercase tracking-wide text-muted-foreground">Output recorded</p>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-3 font-mono text-[11px] text-foreground">
                        {JSON.stringify(log.output_payload, null, 2)}
                      </pre>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Chained from: {log.previous_hash}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}