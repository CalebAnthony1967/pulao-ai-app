import React from "react";
import { Check, Minus, X } from "lucide-react";
import { STATUTORY_CHECKS, statutoryLabel, overallStyle } from "@/lib/statusLabels";
import { formatCurrency } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

function CheckCell({ status }) {
  const { label, pass } = statutoryLabel(status);
  const Icon = pass === true ? Check : pass === false ? X : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs",
        pass === true
          ? "border-compliance/30 bg-compliance-soft text-compliance"
          : pass === false
            ? "border-critical/30 bg-critical-soft text-critical"
            : "border-border bg-secondary text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function ComplianceMatrix({ evaluations, selectedId, onSelect }) {
  if (!evaluations.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
        No bids have been audited for this tender yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-navy-soft text-left">
            <th className="px-4 py-3 font-semibold text-navy">Bidder</th>
            <th className="px-4 py-3 font-semibold text-navy">Quoted</th>
            {STATUTORY_CHECKS.map((check) => (
              <th key={check.key} className="px-4 py-3 font-semibold text-navy" title={check.portal}>
                {check.short}
              </th>
            ))}
            <th className="px-4 py-3 font-semibold text-navy">Price drift</th>
            <th className="px-4 py-3 font-semibold text-navy">Coordination risk</th>
            <th className="px-4 py-3 font-semibold text-navy">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map((evaluation) => {
            const overall = overallStyle(evaluation.overall_status);
            return (
              <tr
                key={evaluation.id}
                onClick={() => onSelect(evaluation)}
                className={cn(
                  "cursor-pointer border-b border-border transition-colors last:border-0",
                  selectedId === evaluation.id ? "bg-navy-soft" : "hover:bg-secondary/50",
                )}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{evaluation.bid_submissions?.bidder_name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {evaluation.bid_submissions?.registration_number}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">
                  {formatCurrency(evaluation.bid_submissions?.quoted_amount)}
                </td>
                {STATUTORY_CHECKS.map((check) => (
                  <td key={check.key} className="px-4 py-3">
                    <CheckCell status={evaluation[check.key]} />
                  </td>
                ))}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "font-medium",
                      evaluation.price_variance_score > 10
                        ? "text-critical"
                        : evaluation.price_variance_score > 4
                          ? "text-caution"
                          : "text-compliance",
                    )}
                  >
                    {Number(evaluation.price_variance_score).toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "font-medium",
                      evaluation.collusion_risk_score >= 50
                        ? "text-critical"
                        : evaluation.collusion_risk_score > 0
                          ? "text-caution"
                          : "text-compliance",
                    )}
                  >
                    {Number(evaluation.collusion_risk_score) >= 50
                      ? "High"
                      : Number(evaluation.collusion_risk_score) > 0
                        ? "Watch"
                        : "Clear"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={overall.tone}>{overall.label}</StatusBadge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}