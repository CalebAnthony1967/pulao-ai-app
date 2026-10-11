import React, { useState } from "react";
import { Download, FileJson, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { recordAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\n");
}

export default function ResearchExport() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const run = async (format) => {
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc("export_telemetry");
      if (error) throw new Error(error.message);
      const rows = data || [];
      const stamp = new Date().toISOString().slice(0, 10);

      if (format === "csv") download(`pulao-telemetry-${stamp}.csv`, toCsv(rows), "text/csv");
      else download(`pulao-telemetry-${stamp}.json`, JSON.stringify(rows, null, 2), "application/json");

      await recordAudit({
        action: "Anonymised telemetry exported",
        input: { format },
        output: { records: rows.length },
      });
      setMessage(rows.length + " anonymised records exported.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="font-semibold text-foreground">Research data exporter</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Downloads bidder-free procurement telemetry — no company names, registration numbers or personal details.
        Suitable for policy briefs and academic review.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => run("csv")} disabled={busy} className="bg-navy text-white hover:bg-navy/90">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export as CSV
        </Button>
        <Button variant="outline" onClick={() => run("json")} disabled={busy}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}