import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ label, value, hint, tone = "navy", className }) {
  const accents = {
    navy: "text-navy",
    compliance: "text-compliance",
    caution: "text-caution",
    critical: "text-critical",
  };
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-3xl leading-none", accents[tone] || accents.navy)}>{value}</p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}