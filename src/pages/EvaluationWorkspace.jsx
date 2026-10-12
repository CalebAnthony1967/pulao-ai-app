import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, FileWarning } from "lucide-react";
import { getTender, listBidsForTender, listEvaluations, listDecisions, listPriceIndex } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { overallStyle } from "@/lib/statusLabels";
import PortalShell from "@/components/layout/PortalShell";
import RoleGate from "@/components/common/RoleGate";
import AuditRunner from "@/components/evaluation/AuditRunner";
import ComplianceMatrix from "@/components/evaluation/ComplianceMatrix";
import FindingList from "@/components/evaluation/FindingList";
import SignOffPanel from "@/components/evaluation/SignOffPanel";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import LoadingBlock from "@/components/common/LoadingBlock";

export default function EvaluationWorkspace() {
  const { id } = useParams();
  const [tender, setTender] = useState(undefined);
  const [bids, setBids] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [priceIndex, setPriceIndex] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [tenderRow, bidRows, evaluationRows, decisionRows, indexRows] = await Promise.all([
      getTender(id),
      listBidsForTender(id),
      listEvaluations(id),
      listDecisions(id),
      listPriceIndex(),
    ]);
    const bidMap = new Map((bidRows || []).map((b) => [b.id, b]));
    const augmentedEvals = (evaluationRows || []).map((e) => ({
      ...e,
      bid_submissions: e.bid_submissions || bidMap.get(e.bid_id) || null,
    }));

    setTender(tenderRow || null);
    setBids(bidRows || []);
    setEvaluations(augmentedEvals);
    setDecisions(decisionRows || []);
    setPriceIndex(indexRows || []);
    setSelectedId((current) => current || augmentedEvals[0]?.id || null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = evaluations.find((row) => row.id === selectedId);

  return (
    <PortalShell
      eyebrow="Evaluation committee"
      title={tender ? tender.title : "Tender evaluation"}
      description={tender ? tender.tender_number + " · " + tender.procuring_entity : undefined}
      actions={
        <Link
          to="/committee"
          className="inline-flex items-center gap-1.5 rounded-md border border-navy/25 px-3 py-2 text-sm text-navy transition-colors hover:bg-navy-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the pipeline
        </Link>
      }
    >
      <RoleGate roles={["committee", "admin", "superadmin"]}>
        {loading ? (
          <LoadingBlock label="Opening the evaluation workspace" />
        ) : !tender ? (
          <EmptyState icon={FileWarning} title="That tender could not be found" />
        ) : (
          <div className="space-y-6">
            <AuditRunner tender={tender} bids={bids} priceIndex={priceIndex} onComplete={load} />

            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl text-navy">Automated compliance matrix</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {bids.length} bid(s) lodged. Select a bidder row to review the flags raised against them.
                  </p>
                </div>
                {selected ? (
                  <StatusBadge tone={overallStyle(selected.overall_status).tone}>
                    {overallStyle(selected.overall_status).label}
                  </StatusBadge>
                ) : null}
              </div>
              <div className="mt-4">
                <ComplianceMatrix evaluations={evaluations} selectedId={selectedId} onSelect={(row) => setSelectedId(row.id)} />
              </div>
            </div>

            {selected ? (
              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-navy-soft px-5 py-4">
                    <ClipboardList className="h-4 w-4 text-navy" />
                    <div>
                      <p className="font-semibold text-navy">{selected.bid_submissions?.bidder_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(selected.bid_submissions?.quoted_amount)} · audited{" "}
                        {formatDateTime(selected.evaluated_at)} · price drift{" "}
                        {Number(selected.price_variance_score).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <FindingList evaluation={selected} decisions={decisions} onDecision={load} />
                </div>

                <SignOffPanel
                  tender={tender}
                  evaluations={evaluations}
                  decisions={decisions}
                  onSigned={load}
                />
              </div>
            ) : null}
          </div>
        )}
      </RoleGate>
    </PortalShell>
  );
}