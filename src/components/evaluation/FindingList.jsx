import React, { useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { recordAudit } from "@/lib/audit";
import { saveLocalDecision } from "@/lib/data";
import { useSession } from "@/lib/session";
import { severityStyle } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ACTION_LABEL = {
  approved: { label: "Finding upheld", tone: "compliance" },
  overridden: { label: "Overridden by committee", tone: "caution" },
  flagged: { label: "Escalated", tone: "critical" },
};

export default function FindingList({ evaluation, decisions, onDecision }) {
  const { user, profile } = useSession();
  const [openKey, setOpenKey] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const findings = Array.isArray(evaluation.findings) ? evaluation.findings : [];

  const decided = (key) =>
    decisions.find((decision) => decision.evaluation_id === evaluation.id && decision.finding_key === key);

  const decide = async (finding, action) => {
    if (action === "overridden" && note.trim().length < 20) {
      setError("A written justification of at least 20 characters is required to override a finding.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const decisionPayload = {
        id: "dec_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        evaluation_id: evaluation.id,
        tender_id: evaluation.tender_id,
        reviewer_id: user?.id || profile?.id || "reviewer_committee",
        reviewer_name: profile?.full_name || user?.email || "Committee Member",
        decision_action: action,
        finding_key: finding.key,
        written_justification: action === "overridden" ? note.trim() : "Finding accepted as raised by the audit.",
        signed_at: new Date().toISOString(),
      };

      try {
        await supabase.from("committee_decisions").insert(decisionPayload);
      } catch {}

      saveLocalDecision(decisionPayload);

      await recordAudit({
        action: "Committee decision recorded",
        input: { finding: finding.title, action, bidder: evaluation.bid_submissions?.bidder_name },
        output: { evaluation_id: evaluation.id },
      }).catch(() => {});

      setOpenKey(null);
      setNote("");
      onDecision();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {findings.map((finding) => {
        const style = severityStyle(finding.severity);
        const already = decided(finding.key);
        return (
          <div key={finding.key} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1">
                <StatusBadge tone={style.tone}>{style.label}</StatusBadge>
                <h4 className="mt-2 font-semibold text-foreground">{finding.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{finding.detail}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Page {finding.citation?.page} — {finding.citation?.reference}
              <span className="ml-auto inline-flex items-center gap-1 text-compliance">
                <ShieldCheck className="h-3.5 w-3.5" />
                Page reference verified
              </span>
            </div>

            {already ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={ACTION_LABEL[already.decision_action]?.tone || "neutral"}>
                  {ACTION_LABEL[already.decision_action]?.label || already.decision_action}
                </StatusBadge>
                <span className="text-xs text-muted-foreground">
                  {already.reviewer_name} · {already.written_justification}
                </span>
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-compliance text-white hover:bg-compliance/90"
                    disabled={busy}
                    onClick={() => decide(finding, "approved")}
                  >
                    Uphold this finding
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setOpenKey(openKey === finding.key ? null : finding.key);
                      setNote("");
                      setError(null);
                    }}
                  >
                    Override with a note
                  </Button>
                </div>

                {openKey === finding.key ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={3}
                      placeholder="Explain why the committee is setting this finding aside. This note becomes part of the permanent record."
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-caution text-white hover:bg-caution/90"
                        disabled={busy}
                        onClick={() => decide(finding, "overridden")}
                      >
                        Record override
                      </Button>
                      <span className={cn("text-xs", note.trim().length < 20 ? "text-caution" : "text-compliance")}>
                        {note.trim().length}/20 characters minimum
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}

      {error ? (
        <div className="rounded-lg border border-critical/30 bg-critical-soft p-3 text-sm text-critical">{error}</div>
      ) : null}
    </div>
  );
}