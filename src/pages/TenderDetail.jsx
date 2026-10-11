import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { getTender } from "@/lib/data";
import { useSession } from "@/lib/session";
import PublicHeader from "@/components/layout/PublicHeader";
import LegibilityPanel from "@/components/tenders/LegibilityPanel";
import BidSubmissionForm from "@/components/bids/BidSubmissionForm";
import LoadingBlock from "@/components/common/LoadingBlock";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export default function TenderDetail() {
  const { id } = useParams();
  const { isAuthenticated, role, profile } = useSession();
  const [tender, setTender] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTender(id)
      .then((row) => setTender(row || null))
      .catch((err) => {
        setError(err.message);
        setTender(null);
      });
  }, [id]);

  const canBid = isAuthenticated && role === "supplier";

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-navy">
          <ArrowLeft className="h-4 w-4" />
          Back to the register
        </Link>

        {tender === undefined ? (
          <div className="mt-6">
            <LoadingBlock label="Loading the tender" />
          </div>
        ) : !tender ? (
          <div className="mt-6">
            <EmptyState
              icon={Info}
              title="That tender could not be found"
              description={error || "It may have been withdrawn or the link may be out of date."}
              action={
                <Button asChild variant="outline">
                  <Link to="/">Back to open tenders</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-4">
              <p className="font-mono text-xs tracking-wide text-muted-foreground">{tender.tender_number}</p>
              <h1 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-navy sm:text-4xl">
                {tender.title}
              </h1>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
              <LegibilityPanel tender={tender} />

              <div className="space-y-5">
                {canBid ? (
                  <BidSubmissionForm tender={tender} />
                ) : (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="font-semibold text-foreground">
                      {isAuthenticated ? "Only supplier accounts can lodge bids" : "Sign in to lodge a bid"}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {isAuthenticated
                        ? "You are signed in as " +
                          (profile?.full_name || "a staff account") +
                          ". Switch to a supplier account to submit a bid for this tender."
                        : "Create a supplier account to lodge a bid, or run a free pre-submission self-audit on a draft before you commit."}
                    </p>
                    <Button asChild className="mt-4 bg-navy text-white hover:bg-navy/90">
                      <Link to={isAuthenticated ? "/supplier/self-audit" : "/auth?mode=register"}>
                        {isAuthenticated ? "Open the self-audit tool" : "Create a supplier account"}
                      </Link>
                    </Button>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-navy-soft p-5 text-sm leading-relaxed text-muted-foreground">
                  <p className="font-medium text-navy">What happens after you lodge</p>
                  <p className="mt-2">
                    The packet is read automatically, statutory standing is verified against the state registers,
                    every line item is benchmarked, and competing bids are scanned for coordination. The
                    evaluation committee then reviews the findings and signs the report off by hand.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}