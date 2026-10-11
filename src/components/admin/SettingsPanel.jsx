import React, { useEffect, useState } from "react";
import { Check, Loader2, Save } from "lucide-react";
import { listSystemSettings, saveSystemSetting } from "@/lib/data";
import { recordAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const GUARDRAILS = [
  { key: "citation_enforcement", label: "Hide unsourced flags", hint: "Any finding without a verified page reference is withheld from the committee." },
  { key: "pii_masking", label: "Mask personal data in the audit trail", hint: "Identity numbers, phone numbers and tax references are redacted before they are stored." },
  { key: "prompt_injection_shield", label: "Prompt-injection shield", hint: "Text taken from bid documents is treated as data, never as instructions." },
  { key: "auto_award", label: "Allow automatic award", hint: "Locked off. Pulao-AI can never award a tender without a human signature." },
];

export default function SettingsPanel() {
  const [retention, setRetention] = useState("7");
  const [guardrails, setGuardrails] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    listSystemSettings()
      .then((settings) => {
        setRetention(String(settings.retention_years?.value ?? 7));
        setGuardrails(settings.guardrails || {});
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveSystemSetting("retention_years", { value: Number(retention) || 7 });
      await saveSystemSetting("guardrails", { ...guardrails, auto_award: false });
      await recordAudit({
        action: "System settings updated",
        input: { retention_years: Number(retention), guardrails },
        output: { status: "saved" },
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading system settings
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold text-foreground">Records retention</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          How long procurement records and audit entries are kept before archival.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div className="w-32 space-y-1.5">
            <Label htmlFor="retention">Years</Label>
            <Input
              id="retention"
              type="number"
              min="1"
              max="30"
              value={retention}
              onChange={(event) => setRetention(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold text-foreground">Responsible AI guardrails</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          These controls decide what the audit is allowed to show and store.
        </p>
        <ul className="mt-4 space-y-4">
          {GUARDRAILS.map((guard) => {
            const locked = guard.key === "auto_award";
            const checked = locked ? false : guardrails[guard.key] !== false;
            return (
              <li key={guard.key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{guard.label}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{guard.hint}</p>
                </div>
                <Switch
                  checked={checked}
                  disabled={locked}
                  onCheckedChange={(value) => setGuardrails((current) => ({ ...current, [guard.key]: value }))}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving} className="bg-navy text-white hover:bg-navy/90">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save settings
        </Button>
        {saved ? (
          <span className="flex items-center gap-1.5 text-sm text-compliance">
            <Check className="h-4 w-4" />
            Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}