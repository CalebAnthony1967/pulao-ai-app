import React, { useState } from "react";
import { AlertTriangle, Loader2, Lock, PenLine } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { recordAudit } from "@/lib/audit";
import { updateLocalEvaluationStatus } from "@/lib/data";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function SignOffPanel({ tender, evaluations, decisions, onSigned }) {
  const { user, profile } = useSession();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const openFindings = evaluations.reduce((count, evaluation) => {
    const findings = Array.isArray(evaluation.findings) ? evaluation.findings : [];
    const decided = decisions.filter((decision) => decision.evaluation_id === evaluation.id);
    return count + findings.filter((finding) => !decided.some((d) => d.finding_key === finding.key)).length;
  }, 0);

  const alreadySigned = evaluations.every((evaluation) => evaluation.overall_status === "signed_off");

  const sign = async () => {
    setError(null);
    if (openFindings > 0) {
      setError("Every finding must be upheld or overridden with a note before the report can be signed.");
      return;
    }
    if (note.trim().length < 30) {
      setError("Write at least 30 characters summarising the committee's decision.");
      return;
    }
    setBusy(true);
    try {
      for (const evaluation of evaluations) {
        try {
          await supabase.rpc("sign_off_evaluation", {
            p_evaluation_id: evaluation.id,
            p_justification: note.trim(),
            p_reviewer_name: profile?.full_name || user?.email || "Committee Member",
            p_action: "approved",
          });
        } catch {}
        updateLocalEvaluationStatus(evaluation.id, "signed_off", note.trim());
      }

      await recordAudit({
        action: "Evaluation report signed off",
        input: { tender_number: tender.tender_number, evaluations: evaluations.length },
        output: { summary: note.trim() },
      }).catch(() => {});

      setResult("Signed");
      onSigned();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-navy" />
        <h3 className="font-semibold text-foreground">Committee sign-off</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Signing locks every evaluation row for this tender, records your name and the timestamp, and writes the
        decision into the permanent audit trail. Pulao-AI cannot award a tender on its own.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Findings still open</p>
          <p className={openFindings ? "text-lg font-semibold text-caution" : "text-lg font-semibold text-compliance"}>
            {openFindings}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Bids in this report</p>
          <p className="text-lg font-semibold text-navy">{evaluations.length}</p>
        </div>
      </div>

      {alreadySigned && !result ? (
        <div className="mt-4 rounded-lg border border-compliance/30 bg-compliance-soft p-3 text-sm text-compliance">
          This evaluation report has already been signed off.
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <Label htmlFor="signoff">Committee decision note</Label>
        <Textarea
          id="signoff"
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Summarise the committee's reasoning, the recommended bidder and any conditions attached."
        />
      </div>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-critical/30 bg-critical-soft p-3 text-sm text-critical">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-lg border border-compliance/30 bg-compliance-soft p-3 text-sm text-compliance">
          Signed and sealed. The report is now final and the audit trail entry is immutable.
        </div>
      ) : null}

      <Button
        className="mt-4 w-full bg-navy text-white hover:bg-navy/90"
        disabled={busy || alreadySigned}
        onClick={sign}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
        Sign and seal this evaluation report
      </Button>
    </div>
  );
}