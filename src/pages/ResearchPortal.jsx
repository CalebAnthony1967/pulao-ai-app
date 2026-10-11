import React, { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/common/StatCard";
import PortalShell from "@/components/layout/PortalShell";
import RoleGate from "@/components/common/RoleGate";
import LoadingBlock from "@/components/common/LoadingBlock";
import { StatutoryBottlenecks, PriceVarianceByEntity, SpendByCategory } from "@/components/research/PolicyCharts";
import ResearchExport from "@/components/research/ResearchExport";
import { Button } from "@/components/ui/button";

export default function ResearchPortal() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("policy_metrics");
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setMetrics(data);
  };

  useEffect(() => {
    load();
  }, []);

  const totals = metrics?.totals || {};
  const agpo = metrics?.agpo || {};

  return (
    <PortalShell
      eyebrow="Policy & analytics"
      title="PPADA stress-testing and market intelligence"
      description="Where does the Public Procurement and Asset Disposal Act actually break down? These figures come from real audited bids on the register."
      actions={
        <Button variant="outline" onClick={load} className="border-navy/25 text-navy hover:bg-navy-soft">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh figures
        </Button>
      }
    >
      <RoleGate roles={["researcher", "admin", "superadmin"]}>
        {error ? (
          <div className="rounded-lg border border-critical/30 bg-critical-soft p-3 text-sm text-critical">{error}</div>
        ) : !metrics ? (
          <LoadingBlock label="Aggregating procurement telemetry" />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Bids audited" value={totals.evaluations ?? 0} hint="Bid packets put through the audit" />
              <StatCard
                label="Reports signed off"
                value={totals.signed_off ?? 0}
                hint="Finalised with a human signature"
                tone="compliance"
              />
              <StatCard
                label="Committee overrides"
                value={totals.overrides ?? 0}
                hint="Findings set aside with a written note"
                tone="caution"
              />
              <StatCard
                label="Preference-reserved tenders"
                value={agpo.reserved_tenders ?? 0}
                hint={(agpo.registered_bids ?? 0) + " bids from registered enterprises"}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <StatutoryBottlenecks data={metrics.statutory_failures} />
              <PriceVarianceByEntity data={metrics.by_entity} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <SpendByCategory data={metrics.by_category} />
              <div className="space-y-5">
                <ResearchExport />
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-navy" />
                    <h3 className="font-semibold text-foreground">Coordination risk distribution</h3>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {(metrics.risk || []).map((row) => (
                      <li key={row.band} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {row.band === "High"
                            ? "High coordination risk"
                            : row.band === "Watch"
                              ? "Worth watching"
                              : "No coordination signals"}
                        </span>
                        <span className="font-semibold text-navy">{row.count}</span>
                      </li>
                    ))}
                    {(metrics.risk || []).length === 0 ? (
                      <li className="text-sm text-muted-foreground">No audited bids yet.</li>
                    ) : null}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </RoleGate>
    </PortalShell>
  );
}