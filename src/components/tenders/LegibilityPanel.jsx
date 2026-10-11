import React from "react";
import { CalendarClock, CheckCircle2, Coins, FileText, Landmark, MapPin, Target } from "lucide-react";
import { formatCurrency, formatDate, deadlineLabel } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";

function Fact({ icon: Icon, label, value, tone = "text-navy" }) {
  return (
    <div className="flex gap-3">
      <Icon className={"mt-0.5 h-4 w-4 shrink-0 " + tone} />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function LegibilityPanel({ tender }) {
  const documents = tender.mandatory_documents || [];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-display text-2xl text-navy">What this tender is asking for</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tender.scope_summary}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Fact icon={Landmark} label="Procuring entity" value={tender.procuring_entity} />
          <Fact icon={Target} label="Category" value={tender.category} />
          <Fact icon={MapPin} label="Region of delivery" value={tender.region} />
          <Fact
            icon={Coins}
            label="Approved budget"
            value={formatCurrency(tender.budget_allocation)}
          />
          <Fact
            icon={CalendarClock}
            label="Bids close"
            value={formatDate(tender.submission_deadline) + " · " + deadlineLabel(tender.submission_deadline)}
            tone="text-caution"
          />
          <Fact icon={FileText} label="Tender number" value={tender.tender_number} />
        </div>

        {tender.agpo_reserved ? (
          <div className="mt-5 rounded-lg border border-compliance/30 bg-compliance-soft p-3 text-sm text-compliance">
            This tender is reserved under the Access to Government Procurement Opportunities programme. Only
            registered youth, women and persons with disability enterprises should bid.
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold text-foreground">Documents you must attach</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pulao-AI checks each of these against the state registers during the audit.
        </p>
        <ul className="mt-4 space-y-2">
          {documents.map((document) => (
            <li key={document} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-compliance" />
              <span>{document}</span>
            </li>
          ))}
          {documents.length === 0 ? (
            <li className="text-sm text-muted-foreground">No specific attachments were listed for this tender.</li>
          ) : null}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-navy-soft p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="navy">Human decision required</StatusBadge>
          <p className="text-sm text-muted-foreground">
            Pulao-AI never awards a tender. Every award is signed off by an evaluation committee member with a
            written note on the record.
          </p>
        </div>
      </div>
    </div>
  );
}