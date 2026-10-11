import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Paperclip, Send, UploadCloud } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabase";
import { recordAudit } from "@/lib/audit";
import { runAuditPipeline } from "@/lib/tools";
import { listPriceIndex } from "@/lib/data";
import { useSession } from "@/lib/session";
import { formatCurrency } from "@/lib/format";
import LineItemsEditor, { EMPTY_ITEM, lineTotal } from "./LineItemsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BidSubmissionForm({ tender, onSubmitted }) {
  const { profile, user } = useSession();
  const [bidderName, setBidderName] = useState(profile?.organization || profile?.full_name || "");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [stage, setStage] = useState("");

  const total = items.reduce((sum, item) => sum + lineTotal(item), 0);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        uploaded.push({ uri: file_uri, name: file.name });
      }
      setDocuments((current) => [...current, ...uploaded]);
    } catch (err) {
      setError("A document could not be attached. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!bidderName.trim()) return setError("Enter the name of the bidding company.");
    if (!registrationNumber.trim()) return setError("Enter the company registration number.");
    if (!items.some((item) => item.description.trim() && Number(item.unit_price) > 0)) {
      return setError("Add at least one priced line item to your quotation.");
    }

    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from("bid_submissions")
        .insert({
          tender_id: tender.id,
          bidder_name: bidderName.trim(),
          registration_number: registrationNumber.trim(),
          quoted_amount: total,
          line_items: items.filter((item) => item.description.trim()),
          document_urls: documents.map((doc) => doc.uri),
          metadata: {
            author: profile?.full_name || user?.email,
            producer: "Pulao-AI supplier desk",
            created: new Date().toISOString(),
            pages: 0,
            attachments: documents.map((doc) => doc.name),
          },
          submitted_by: user.id,
          submission_date: new Date().toISOString(),
          status: "submitted",
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      await recordAudit({
        action: "Bid submitted",
        input: { tender_number: tender.tender_number, bidder: bidderName, amount: total },
        output: { bid_id: data.id, documents: documents.length },
      });

      setStage("Reading your packet and checking the registers");
      const priceIndex = await listPriceIndex();
      await runAuditPipeline({
        tender,
        bids: [data],
        priceIndex,
        onProgress: (label) => setStage(label),
      });

      setStage("");
      setDone(true);
      if (onSubmitted) onSubmitted(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting && stage) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-navy" />
        <h3 className="mt-3 font-semibold text-foreground">Auditing your bid</h3>
        <p className="mt-2 text-sm text-muted-foreground">{stage}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-compliance/30 bg-compliance-soft p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-compliance" />
        <h3 className="mt-3 text-lg font-semibold text-compliance">Your bid is lodged</h3>
        <p className="mt-2 text-sm leading-relaxed text-compliance/90">
          {formatCurrency(total)} for {tender.tender_number}. The evaluation committee will audit it against the
          statutory registers and the market price index before any award decision is made.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h3 className="font-semibold text-foreground">Lodge your bid</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you enter here is audited automatically. Nothing is awarded without committee sign-off.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bidder">Bidding company</Label>
          <Input
            id="bidder"
            value={bidderName}
            onChange={(event) => setBidderName(event.target.value)}
            placeholder="Registered company name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regno">Company registration number</Label>
          <Input
            id="regno"
            value={registrationNumber}
            onChange={(event) => setRegistrationNumber(event.target.value)}
            placeholder="e.g. PVT-2019-553310"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Itemised quotation</Label>
        <LineItemsEditor items={items} onChange={setItems} />
      </div>

      <div className="space-y-2">
        <Label>Bid packet documents</Label>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-navy/40">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-navy" />
          ) : (
            <UploadCloud className="h-5 w-5 text-navy" />
          )}
          <span className="text-sm font-medium">
            {uploading ? "Attaching documents" : "Attach your bid packet (PDF, images, spreadsheets)"}
          </span>
          <span className="text-xs text-muted-foreground">
            Optional, but the audit reads these to verify your annexures page by page.
          </span>
          <input type="file" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
        </label>

        {documents.length ? (
          <ul className="space-y-1.5">
            {documents.map((doc) => (
              <li key={doc.uri} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                {doc.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-critical/30 bg-critical-soft p-3 text-sm text-critical">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm font-semibold text-navy">Quoted total: {formatCurrency(total)}</p>
        <Button type="submit" disabled={submitting || uploading} className="bg-navy text-white hover:bg-navy/90">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Lodge bid for audit
        </Button>
      </div>
    </form>
  );
}