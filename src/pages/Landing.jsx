import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardCheck,
  FileSearch,
  Gavel,
  ScanSearch,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PublicHeader from "@/components/layout/PublicHeader";
import TenderFeed from "@/components/tenders/TenderFeed";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: FileSearch,
    title: "The packet is read",
    body: "Every page of a bid is read automatically — the pricing schedule, the annexures, the statutory certificates.",
  },
  {
    icon: ShieldCheck,
    title: "The registers are checked",
    body: "Tax standing, company registration, social security, social health cover and preference status are verified.",
  },
  {
    icon: BarChart3,
    title: "Prices are benchmarked",
    body: "Each line item is compared against the published market price index to expose inflation.",
  },
  {
    icon: ScanSearch,
    title: "Coordination is scanned",
    body: "Metadata, filing times and wording are cross-checked between bidders to surface cover bidding.",
  },
  {
    icon: Gavel,
    title: "A human decides",
    body: "The committee reviews every flag, must justify any override in writing, and signs the report off.",
  },
];

const PORTALS = [
  {
    icon: Building2,
    title: "Supplier desk",
    body: "Browse open tenders, self-audit a draft bid before you lodge it, and track your submissions.",
  },
  {
    icon: Gavel,
    title: "Evaluation room",
    body: "The committee workspace: compliance matrix, red-flag alerts, overrides and digital sign-off.",
  },
  {
    icon: BarChart3,
    title: "Policy & analytics",
    body: "Stress-test PPADA against real failure data and export anonymised procurement telemetry.",
  },
  {
    icon: ShieldCheck,
    title: "System & vault",
    body: "Tool health, retention controls, guardrails and the immutable, hash-chained audit vault.",
  },
];

export default function Landing() {
  const [stats, setStats] = useState({ tenders: 0, value: 0, items: 0 });

  useEffect(() => {
    (async () => {
      const [tenders, index] = await Promise.all([
        supabase.from("tenders_ocds").select("budget_allocation, status"),
        supabase.from("market_price_index").select("id", { count: "exact", head: true }),
      ]);
      const rows = tenders.data || [];
      setStats({
        tenders: rows.length,
        value: rows.reduce((sum, row) => sum + Number(row.budget_allocation || 0), 0),
        items: index.count || 0,
      });
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <section className="relative overflow-hidden bg-navy text-white">
        <div className="vault-grid absolute inset-0 opacity-[0.07]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide">
                <Timer className="h-3.5 w-3.5 text-compliance" />
                26 days of manual evaluation, compressed into about 20 minutes
              </span>

              <h1 className="mt-6 font-display text-4xl leading-[1.05] sm:text-6xl">
                Every public tender bid,
                <br />
                audited before the committee
                <br />
                <span className="text-compliance">even sits down.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75">
                Pulao-AI reads bid packets, verifies statutory standing against the state registers, benchmarks
                every price against the published market index, and flags coordination between bidders. It never
                awards a tender — the committee still decides, in writing, on the record.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-compliance text-white hover:bg-compliance/90">
                  <Link to="/auth?mode=register">
                    Create an account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#tenders">Browse open tenders</a>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Live register</p>
              <div className="mt-5 grid grid-cols-2 gap-5">
                <div>
                  <p className="font-display text-4xl leading-none text-white">{stats.tenders}</p>
                  <p className="mt-1 text-xs text-white/60">Tenders published</p>
                </div>
                <div>
                  <p className="font-display text-4xl leading-none text-white">{stats.items}</p>
                  <p className="mt-1 text-xs text-white/60">Indexed benchmark prices</p>
                </div>
              </div>
              <div className="mt-6 border-t border-white/15 pt-5">
                <p className="font-display text-3xl leading-none text-compliance">
                  KES {(stats.value / 1_000_000).toFixed(1)}M
                </p>
                <p className="mt-1 text-xs text-white/60">Value currently on the register</p>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-white/75">
                <li className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-compliance" />
                  Every flag carries a verified page reference
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-compliance" />
                  Hash-chained, append-only audit trail
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-compliance" />
                  Human sign-off required before any award
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-compliance">How the audit works</p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl leading-tight text-navy sm:text-4xl">
          Five steps from a stack of PDFs to a defensible decision
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-soft text-navy">
                  <step.icon className="h-4 w-4" />
                </span>
                <span className="font-display text-2xl text-border">0{index + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tenders" className="border-t border-border bg-navy-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-compliance">
                Open contracting register
              </p>
              <h2 className="mt-2 font-display text-3xl leading-tight text-navy sm:text-4xl">
                Tenders open for bids
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Published in plain language so any supplier can tell whether they qualify before spending money
                preparing a bid.
              </p>
            </div>
            <Button asChild variant="outline" className="border-navy/25 text-navy hover:bg-card">
              <Link to="/auth?mode=register">Sign in to bid</Link>
            </Button>
          </div>

          <div className="mt-8">
            <TenderFeed limit={6} />
          </div>
        </div>
      </section>

      <section id="portals" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-compliance">Four workspaces</p>
        <h2 className="mt-2 font-display text-3xl leading-tight text-navy sm:text-4xl">
          One system, four sets of eyes
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PORTALS.map((portal) => (
            <div key={portal.title} className="flex gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
                <portal.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-foreground">{portal.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{portal.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-navy py-10 text-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-display text-xl text-white">Pulao-AI</p>
            <p className="mt-1 text-sm">
              Public Unified Tender Audit &amp; Oversight Agent · aligned to the Open Contracting Data Standard
            </p>
          </div>
          <p className="text-xs">
            Decision support only. No tender is ever awarded without a signed committee decision.
          </p>
        </div>
      </footer>
    </div>
  );
}