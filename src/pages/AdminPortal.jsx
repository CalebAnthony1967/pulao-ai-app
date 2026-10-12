import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { listAuditLogs } from "@/lib/data";
import PortalShell from "@/components/layout/PortalShell";
import RoleGate from "@/components/common/RoleGate";
import ToolHealthGrid from "@/components/admin/ToolHealthGrid";
import SettingsPanel from "@/components/admin/SettingsPanel";
import TeamRoles from "@/components/admin/TeamRoles";
import AccessRequests from "@/components/admin/AccessRequests";
import LoadingBlock from "@/components/common/LoadingBlock";

export default function AdminPortal() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [tenders, bids, priceItems, logs] = await Promise.all([
        supabase.from("tenders_ocds").select("id", { count: "exact", head: true }),
        supabase.from("bid_submissions").select("id", { count: "exact", head: true }),
        supabase.from("market_price_index").select("id", { count: "exact", head: true }),
        listAuditLogs({ limit: 200 }).catch(() => []),
      ]);
      const auditEntries = await supabase
        .from("immutable_audit_logs")
        .select("id", { count: "exact", head: true });
      setData({
        counts: {
          tenders: tenders.count || 0,
          bids: bids.count || 0,
          priceItems: priceItems.count || 0,
          auditEntries: auditEntries.count || 0,
        },
        logs,
      });
    })();
  }, []);

  return (
    <PortalShell
      eyebrow="System control"
      title="Administration and guardrails"
      description="Tool health, retention, responsible-AI controls and account roles. Every change made here is itself written into the audit vault."
    >
      <RoleGate roles={["admin", "superadmin"]}>
        {!data ? (
          <LoadingBlock label="Loading system status" />
        ) : (
          <div className="space-y-6">
            <AccessRequests />
            <ToolHealthGrid logs={data.logs} counts={data.counts} />

            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
              <SettingsPanel />
              <div className="space-y-5">
                <TeamRoles />
                <div className="rounded-xl border border-compliance/30 bg-compliance-soft p-5">
                  <div className="flex items-center gap-2 text-compliance">
                    <ShieldCheck className="h-4 w-4" />
                    <p className="text-sm font-semibold">Hard rule: no automatic awards</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-compliance/90">
                    Pulao-AI produces decision support only. A tender can only be awarded through a signed
                    committee decision recorded in the immutable vault.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </RoleGate>
    </PortalShell>
  );
}