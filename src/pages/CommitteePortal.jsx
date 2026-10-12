import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gavel, Inbox } from "lucide-react";
import { loadPortfolio } from "@/lib/data";
import { formatCompactCurrency, deadlineLabel } from "@/lib/format";
import { overallStyle } from "@/lib/statusLabels";
import PortalShell from "@/components/layout/PortalShell";
import RoleGate from "@/components/common/RoleGate";
import StatusBadge from "@/components/common/StatusBadge";
import StatCard from "@/components/common/StatCard";
import EmptyState from "@/components/common/EmptyState";
import LoadingBlock from "@/components/common/LoadingBlock";

export default function CommitteePortal() {
  const [rows, setRows] = useState(null);
  const [decisions, setDecisions] = useState([]);

  useEffect(() => {
    (async () => {
      const { tenders, bids, evaluations, decisions: decRows } = await loadPortfolio();
      const bidRows = bids || [];
      const evalRows = evaluations || [];
      setRows(
        (tenders || []).map((tender) => ({
          ...tender,
          bidCount: bidRows.filter((bid) => bid.tender_id === tender.id).length,
          auditedCount: evalRows.filter((row) => row.tender_id === tender.id).length,
          criticalCount: evalRows.filter((row) => row.tender_id === tender.id && row.overall_status === "critical")
            .length,
          signedCount: evalRows.filter((row) => row.tender_id === tender.id && row.overall_status === "signed_off")
            .length,
        })),
      );
      setDecisions(decRows || []);
    })();
  }, []);

  return (
    <PortalShell
      eyebrow="Evaluation committee"
      title="Tender evaluation room"
      description="Open a tender to see the automated compliance matrix, review every flag with its page reference, and sign the evaluation report off by hand."
    >
      <RoleGate roles={["committee", "admin", "superadmin"]}>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Tenders awaiting review"
              value={(rows || []).filter((row) => row.bidCount > 0).length}
              hint="With at least one lodged bid"
            />
            <StatCard
              label="Critical flags outstanding"
              value={(rows || []).reduce((sum, row) => sum + row.criticalCount, 0)}
              hint="Require a written committee decision"
              tone="critical"
            />
            <StatCard
              label="Decisions on the record"
              value={decisions.length}
              hint="Upheld findings and overrides"
              tone="compliance"
            />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Gavel className="h-4 w-4 text-navy" />
              <h2 className="font-semibold text-foreground">Tenders in the pipeline</h2>
            </div>

            {rows === null ? (
              <div className="p-5">
                <LoadingBlock label="Loading the pipeline" />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={Inbox} title="No tenders have been published yet" />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((tender) => {
                  const ready = tender.bidCount > 0;
                  return (
                    <li key={tender.id}>
                      <Link
                        to={`/committee/tender/${tender.id}`}
                        className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-secondary/40 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[11px] text-muted-foreground">{tender.tender_number}</p>
                          <p className="mt-1 font-medium text-foreground">{tender.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {tender.procuring_entity} · {formatCompactCurrency(tender.budget_allocation)} ·{" "}
                            {deadlineLabel(tender.submission_deadline)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <StatusBadge tone="neutral">{tender.bidCount} bids</StatusBadge>
                          {tender.auditedCount ? (
                            <StatusBadge tone={overallStyle(tender.criticalCount ? "critical" : "compliant").tone}>
                              {tender.criticalCount
                                ? tender.criticalCount + " critical"
                                : tender.signedCount
                                  ? "Signed off"
                                  : "Audited"}
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="caution">Not yet audited</StatusBadge>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Pulao-AI never awards a tender. Every award requires a signed committee decision recorded in the
            immutable vault.
          </p>
        </div>
      </RoleGate>
    </PortalShell>
  );
}