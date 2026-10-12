import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldQuestion, XCircle } from "lucide-react";
import { verifyStatutoryCompliance, benchmarkPricing } from "@/lib/tools";
import { recordAudit } from "@/lib/audit";
import { listPriceIndex } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { useSession } from "@/lib/session";
import PortalShell from "@/components/layout/PortalShell";
import RoleGate from "@/components/common/RoleGate";
import LineItemsEditor, { EMPTY_ITEM } from "@/components/bids/LineItemsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

export default function SelfAudit() {
  const { profile } = useSession();
  const [index, setIndex] = useState([]);
  const [bidderName, setBidderName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listPriceIndex().then(setIndex).catch(() => setIndex([]));
    setBidderName(profile?.organization || profile?.full_name || "");
  }, [profile]);

  const run = async () => {
    setError(null);
    if (!registrationNumber.trim()) {
      setError("Enter your company registration number so the registers can be checked.");
      return;
    }
    setRunning(true);
    try {
      const parsedItems = items
        .map((item, idx) => ({
          ...item,
          description: item.description?.trim() || `Item #${idx + 1}`,
          unit_price:
            typeof item.unit_price === "number"
              ? item.unit_price
              : Number(String(item.unit_price || "0").replace(/[^0-9.-]+/g, "")) || 0,
          quantity:
            typeof item.quantity === "number"
              ? item.quantity
              : Number(String(item.quantity || "1").replace(/[^0-9.-]+/g, "")) || 1,
        }))
        .filter((item) => item.unit_price > 0);

      const statutory = verifyStatutoryCompliance(registrationNumber, bidderName);
      const pricing = benchmarkPricing(parsedItems, index);
      await recordAudit({
        action: "Pre-submission self-audit run",
        tool: "verify_statutory_compliance",
        input: { bidder: bidderName, registration_number: registrationNumber },
        output: { failures: statutory.failures, flagged_items: pricing.flagged.length },
      }).catch(() => {});
      setResult({ statutory, pricing });
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <PortalShell
      eyebrow="Supplier desk"
      title="Pre-submission self-audit"
      description="Check a draft bid before you lodge it. Nothing is submitted here — this is a private dry run against the same registers and price index the committee will use."
    >
      <RoleGate roles={["supplier", "admin", "superadmin"]}>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Company name</Label>
                <Input
                  id="name"
                  value={bidderName}
                  onChange={(event) => setBidderName(event.target.value)}
                  placeholder="Registered company name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="regno">Registration number</Label>
                <Input
                  id="regno"
                  value={registrationNumber}
                  onChange={(event) => setRegistrationNumber(event.target.value)}
                  placeholder="e.g. PVT-2019-553310"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Draft itemised quotation</Label>
              <LineItemsEditor items={items} onChange={setItems} />
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-critical/30 bg-critical-soft p-3 text-sm text-critical">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <Button onClick={run} disabled={running} className="bg-navy text-white hover:bg-navy/90">
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldQuestion className="mr-2 h-4 w-4" />}
              Run my self-audit
            </Button>
          </div>

          <div className="space-y-5">
            {!result ? (
              <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center">
                <ShieldQuestion className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">No results yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your details and quotation, then run the self-audit. You will see exactly what the
                  committee will see.
                </p>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "rounded-xl border p-5",
                    result.statutory.failures
                      ? "border-caution/30 bg-caution-soft"
                      : "border-compliance/30 bg-compliance-soft",
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    {result.statutory.failures ? "Readiness: action needed" : "Readiness: compliant"}
                  </p>
                  <p className="mt-1 font-display text-2xl text-navy">
                    {result.statutory.passes} of {result.statutory.verdicts.length} statutory checks passed
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="font-semibold text-foreground">Statutory standing</h3>
                  <ul className="mt-4 space-y-3">
                    {result.statutory.verdicts.map((verdict) => (
                      <li key={verdict.check} className="flex items-start gap-3">
                        {verdict.passed ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-compliance" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{verdict.portal}</p>
                          <p className="text-sm text-muted-foreground">{verdict.label}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="font-semibold text-foreground">Pricing against the market index</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Average drift above the published benchmark: {result.pricing.varianceScore}%
                  </p>
                  <ul className="mt-4 space-y-3">
                    {result.pricing.items.map((item, position) => (
                      <li key={position} className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.unit_price)} each
                            {item.benchmark
                              ? " · benchmark " + formatCurrency(item.benchmark)
                              : " · no published benchmark for this item"}
                          </p>
                        </div>
                        {item.verdict === "inflated" ? (
                          <StatusBadge tone="critical">+{item.variance_pct}%</StatusBadge>
                        ) : item.verdict === "within_range" ? (
                          <StatusBadge tone="compliance">In range</StatusBadge>
                        ) : item.verdict === "below_market" ? (
                          <StatusBadge tone="caution">{item.variance_pct}%</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">Not benchmarked</StatusBadge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </RoleGate>
    </PortalShell>
  );
}