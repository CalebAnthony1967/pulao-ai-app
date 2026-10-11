import React, { useState } from "react";
import { CheckCircle2, Loader2, Play, Sparkles } from "lucide-react";
import { runAuditPipeline } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function AuditRunner({ tender, bids, priceIndex, onComplete }) {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [current, setCurrent] = useState("");
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);

  const totalSteps = bids.length * 3 + 3;

  const run = async () => {
    setRunning(true);
    setError(null);
    setFinished(false);
    setLog([]);
    try {
      const result = await runAuditPipeline({
        tender,
        bids,
        priceIndex,
        onProgress: (label) => {
          setCurrent(label);
          setLog((previous) => [...previous, label]);
        },
      });
      setFinished(true);
      setCurrent("");
      if (onComplete) onComplete(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Automated compliance audit</h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Reads every bid packet, checks the statutory registers, benchmarks each line against the published
            market index, and scans for coordination between bidders. Every flag carries a verified page reference.
          </p>
        </div>
        <Button
          onClick={run}
          disabled={running || !bids.length}
          className="bg-compliance text-white hover:bg-compliance/90"
        >
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          {running ? "Auditing" : "Start compliance audit"}
        </Button>
      </div>

      {running || log.length ? (
        <div className="mt-4 space-y-3">
          <Progress value={Math.min(100, (log.length / totalSteps) * 100)} className="h-1.5" />
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-3">
            {log.map((line, index) => (
              <p
                key={index}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  index === log.length - 1 && running ? "text-navy" : "text-muted-foreground",
                )}
              >
                {index === log.length - 1 && running ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-compliance" />
                )}
                {line}
              </p>
            ))}
            {current && running ? <p className="text-xs font-medium text-navy">{current}</p> : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-critical/30 bg-critical-soft p-3 text-sm text-critical">
          {error}
        </div>
      ) : null}

      {finished && !error ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-compliance/30 bg-compliance-soft p-3 text-sm text-compliance">
          <Sparkles className="h-4 w-4" />
          Audit complete. The evaluation matrix below now shows every bidder side by side.
        </div>
      ) : null}
    </div>
  );
}