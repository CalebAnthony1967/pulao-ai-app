import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarClock, MapPin } from "lucide-react";
import { formatCompactCurrency, deadlineLabel, daysUntil } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

export default function TenderCard({ tender, to }) {
  const days = daysUntil(tender.submission_deadline);
  const urgent = days !== null && days >= 0 && days <= 7;

  return (
    <Link
      to={to}
      className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground">{tender.tender_number}</p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {tender.agpo_reserved ? <StatusBadge tone="compliance">AGPO reserved</StatusBadge> : null}
          <StatusBadge tone="neutral">{tender.category}</StatusBadge>
        </div>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-foreground group-hover:text-navy">
        {tender.title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{tender.procuring_entity}</p>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{tender.scope_summary}</p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-navy">
          {formatCompactCurrency(tender.budget_allocation)}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {tender.region}
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5",
            urgent ? "font-medium text-caution" : "text-muted-foreground",
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {deadlineLabel(tender.submission_deadline)}
        </span>
        <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}