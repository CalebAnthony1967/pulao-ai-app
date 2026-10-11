import React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  compliance: "bg-compliance-soft text-compliance border-compliance/30",
  caution: "bg-caution-soft text-caution border-caution/30",
  critical: "bg-critical-soft text-critical border-critical/30",
  neutral: "bg-secondary text-secondary-foreground border-border",
  navy: "bg-navy text-primary-foreground border-navy",
};

export default function StatusBadge({ tone = "neutral", children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
        TONES[tone] || TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}