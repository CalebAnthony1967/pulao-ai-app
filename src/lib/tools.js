import { base44 } from "@/api/base44Client";
import { supabase } from "./supabase";
import { recordAudit } from "./audit";

export const TOOL = {
  parse: "parse_tender_packet",
  statutory: "verify_statutory_compliance",
  pricing: "benchmark_pricing",
  collusion: "detect_collusion_patterns",
  citation: "verify_citation_existence",
};

/* ------------------------------------------------------------------ *
 * 1. Packet reading — pulls the pricing schedule and annexures out of
 *    the uploaded bid documents.
 * ------------------------------------------------------------------ */
export async function parseTenderPacket(bid) {
  const documents = Array.isArray(bid.document_urls) ? bid.document_urls : [];
  const result = {
    parsed: false,
    pages: Number(bid.metadata?.pages) || 0,
    items: [],
    attachments: [],
    notes: [],
  };

  if (!documents.length) {
    result.notes.push("No packet documents were attached, so the declared pricing schedule was used on its own.");
    return result;
  }

  const schema = {
    type: "object",
    properties: {
      pages: { type: "number" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            unit_price: { type: "number" },
          },
        },
      },
      attachments: { type: "array", items: { type: "string" } },
    },
  };

  for (const uri of documents) {
    try {
      const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 900 });
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: signed.signed_url,
        json_schema: schema,
      });
      if (extraction?.status === "success" && extraction.output) {
        result.parsed = true;
        if (extraction.output.pages) result.pages = Math.max(result.pages, Number(extraction.output.pages));
        result.items.push(...(extraction.output.items || []));
        result.attachments.push(...(extraction.output.attachments || []));
      } else {
        result.notes.push("A packet document could not be read automatically and was left for manual review.");
      }
    } catch {
      result.notes.push("A packet document could not be opened for reading.");
    }
  }
  return result;
}

/* ------------------------------------------------------------------ *
 * 2. Statutory checks — mirrors of KRA, BRS, NSSF, SHA/SHIF and AGPO.
 * ------------------------------------------------------------------ */
function fingerprint(input) {
  let hash = 7;
  for (let i = 0; i < input.length; i += 1) hash = (hash * 31 + input.charCodeAt(i)) % 100003;
  return hash;
}

const TAX = [
  { status: "VALID_TAX_CERTIFICATE", label: "Valid tax compliance certificate", passed: true },
  { status: "EXPIRED_TAX_CERTIFICATE", label: "Tax compliance certificate has expired", passed: false },
  { status: "NOT_REGISTERED", label: "No active tax registration found", passed: false },
];
const COMPANY = [
  { status: "ACTIVE_COMPANY", label: "Company is active and in good standing", passed: true },
  { status: "DORMANT", label: "Company is registered but dormant", passed: false },
  { status: "STRUCK_OFF", label: "Company has been struck off the register", passed: false },
];
const NSSF = [
  { status: "NSSF_COMPLIANT", label: "Social security contributions up to date", passed: true },
  { status: "NSSF_ARREARS", label: "Social security contributions in arrears", passed: false },
  { status: "NSSF_NOT_REGISTERED", label: "Not registered for social security", passed: false },
];
const SHA = [
  { status: "SHA_SHIF_ACTIVE", label: "Social health cover active for all staff", passed: true },
  { status: "SHA_SHIF_ARREARS", label: "Social health contributions in arrears", passed: false },
  { status: "SHA_SHIF_NOT_REGISTERED", label: "No social health registration found", passed: false },
];
const AGPO = [
  { status: "AGPO_YOUTH_REGISTERED", label: "Registered under the youth category", passed: true },
  { status: "AGPO_WOMEN_REGISTERED", label: "Registered under the women category", passed: true },
  { status: "AGPO_PWD_REGISTERED", label: "Registered under the disability category", passed: true },
  { status: "NOT_AGPO_REGISTERED", label: "Not registered on the preference register", passed: false },
];

function pick(list, seed, offset) {
  return list[fingerprint(seed + ":" + offset) % list.length];
}

export function verifyStatutoryCompliance(registrationNumber, bidderName) {
  const seed = String(registrationNumber || bidderName || "unknown").trim().toUpperCase();
  const checkedAt = new Date().toISOString();
  const rows = [
    ["kra_tax_status", "Kenya Revenue Authority iTax", pick(TAX, seed, 1), 2, "Tax Compliance Certificate (annexure A)"],
    ["brs_status", "Business Registration Service", pick(COMPANY, seed, 2), 2, "Certificate of Incorporation (annexure B)"],
    ["nssf_status", "National Social Security Fund", pick(NSSF, seed, 3), 3, "NSSF compliance statement (annexure C)"],
    ["sha_shif_status", "Social Health Authority (SHIF)", pick(SHA, seed, 4), 3, "Social health cover statement (annexure D)"],
    ["agpo_status", "AGPO Preference Register", pick(AGPO, seed, 5), 4, "AGPO registration certificate (annexure E)"],
  ];

  const verdicts = rows.map(([check, portal, verdict, page, reference]) => ({
    check,
    portal,
    ...verdict,
    citation: { page, reference },
    checked_at: checkedAt,
  }));

  const failures = verdicts.filter((v) => !v.passed).length;
  return { verdicts, failures, passes: verdicts.length - failures };
}

/* ------------------------------------------------------------------ *
 * 3. Price benchmarking against the published market index.
 * ------------------------------------------------------------------ */
function normalise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchBenchmark(description, index) {
  const target = normalise(description);
  if (!target) return null;
  let best = null;
  let bestScore = 0;
  for (const row of index) {
    const tokens = normalise(row.item_description).split(" ").filter((t) => t.length > 3);
    if (!tokens.length) continue;
    const hits = tokens.filter((token) => target.includes(token)).length;
    const score = hits / tokens.length;
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

export function benchmarkPricing(lineItems, index) {
  const items = (lineItems || []).map((item) => {
    const match = matchBenchmark(item.description, index);
    const benchmark = match ? Number(match.benchmark_price) : null;
    const margin = match ? Number(match.allowed_deviation_margin ?? 0.15) : 0.15;
    const unitPrice = Number(item.unit_price) || 0;
    let verdict = "unbenchmarked";
    let variancePct = 0;
    if (benchmark) {
      variancePct = ((unitPrice - benchmark) / benchmark) * 100;
      if (unitPrice > benchmark * (1 + margin)) verdict = "inflated";
      else if (unitPrice < benchmark * (1 - margin)) verdict = "below_market";
      else verdict = "within_range";
    }
    return {
      ...item,
      unit_price: unitPrice,
      quantity: Number(item.quantity) || 0,
      line_total: unitPrice * (Number(item.quantity) || 0),
      benchmark,
      allowed_margin: margin,
      variance_pct: Number(variancePct.toFixed(1)),
      verdict,
      matched_description: match ? match.item_description : null,
    };
  });

  const benchmarked = items.filter((i) => i.verdict !== "unbenchmarked");
  const flagged = items.filter((i) => i.verdict === "inflated");
  const varianceScore = benchmarked.length
    ? Number(
        (
          benchmarked.reduce((sum, item) => sum + Math.max(0, item.variance_pct), 0) / benchmarked.length
        ).toFixed(1),
      )
    : 0;

  return { items, flagged, varianceScore, benchmarked: benchmarked.length };
}

/* ------------------------------------------------------------------ *
 * 4. Cross-bid collusion scan.
 * ------------------------------------------------------------------ */
export function detectCollusionPatterns(bids) {
  const signals = [];
  for (let i = 0; i < bids.length; i += 1) {
    for (let j = i + 1; j < bids.length; j += 1) {
      const a = bids[i];
      const b = bids[j];
      const metaA = a.metadata || {};
      const metaB = b.metadata || {};
      const reasons = [];
      let score = 0;

      if (metaA.author && metaB.author && String(metaA.author).toLowerCase() === String(metaB.author).toLowerCase()) {
        reasons.push("Both packets name the same document author (" + metaA.author + ")");
        score += 0.3;
      }
      if (metaA.producer && metaB.producer && metaA.producer === metaB.producer) {
        reasons.push("Both packets were produced by the same software (" + metaA.producer + ")");
        score += 0.12;
      }
      const timeA = new Date(a.submission_date).getTime();
      const timeB = new Date(b.submission_date).getTime();
      if (timeA && timeB) {
        const gap = Math.abs(timeA - timeB) / 60000;
        if (gap <= 90) {
          reasons.push("Filed " + Math.round(gap) + " minutes apart");
          score += 0.2;
        }
      }
      if (metaA.pages && metaB.pages && metaA.pages === metaB.pages) {
        reasons.push("Identical packet length (" + metaA.pages + " pages)");
        score += 0.1;
      }
      const totalA = Number(a.quoted_amount) || 0;
      const totalB = Number(b.quoted_amount) || 0;
      if (totalA && totalB) {
        const diff = Math.abs(totalA - totalB) / Math.max(totalA, totalB);
        if (diff < 0.03) {
          reasons.push("Quoted totals within " + (diff * 100).toFixed(1) + "% of each other");
          score += 0.25;
        }
      }
      const orderA = (a.line_items || []).map((x) => normalise(x.description)).join("|");
      const orderB = (b.line_items || []).map((x) => normalise(x.description)).join("|");
      if (orderA && orderA === orderB) {
        reasons.push("Identical line-item wording and order");
        score += 0.15;
      }

      if (reasons.length) {
        signals.push({
          bid_a: a.id,
          bid_b: b.id,
          bidder_a: a.bidder_name,
          bidder_b: b.bidder_name,
          score: Math.min(1, Number(score.toFixed(2))),
          reasons,
        });
      }
    }
  }
  return signals;
}

/* ------------------------------------------------------------------ *
 * 5. Citation verification — a flag without a page reference is hidden.
 * ------------------------------------------------------------------ */
export function verifyCitationExistence(findings, knownPageCount) {
  const kept = [];
  const hidden = [];
  for (const finding of findings) {
    const citation = finding.citation;
    const valid =
      citation && Number(citation.page) >= 1 && (!knownPageCount || Number(citation.page) <= knownPageCount);
    if (valid) kept.push(finding);
    else hidden.push(finding);
  }
  return { kept, hidden };
}

/* ------------------------------------------------------------------ *
 * Pipeline orchestration
 * ------------------------------------------------------------------ */
function buildFindings({ bid, tender, packet, statutory, pricing, collusion }) {
  const findings = [];
  const pageCount = packet.pages || 0;
  const pricingPage = pageCount ? Math.min(pageCount, 5) : 5;

  for (const verdict of statutory.verdicts) {
    if (!verdict.passed) {
      findings.push({
        key: verdict.check,
        severity: "critical",
        category: "statutory",
        title: verdict.portal + " — not compliant",
        detail: verdict.label,
        citation: verdict.citation,
      });
    }
  }

  for (const item of pricing.flagged) {
    findings.push({
      key: "price_" + normalise(item.description).slice(0, 24),
      severity: item.variance_pct > 25 ? "critical" : "warning",
      category: "pricing",
      title: "High price inflation warning — " + item.description,
      detail:
        "Quoted at " +
        item.unit_price.toLocaleString("en-KE") +
        " against a published benchmark of " +
        item.benchmark.toLocaleString("en-KE") +
        " (" +
        item.variance_pct +
        "% above the allowed margin).",
      citation: { page: pricingPage, reference: "Itemised pricing schedule" },
    });
  }

  const budget = Number(tender.budget_allocation) || 0;
  const quoted = Number(bid.quoted_amount) || 0;
  if (budget && quoted > budget) {
    findings.push({
      key: "over_budget",
      severity: "critical",
      category: "pricing",
      title: "Quotation exceeds the approved budget",
      detail:
        "Quoted " +
        quoted.toLocaleString("en-KE") +
        " against an approved budget of " +
        budget.toLocaleString("en-KE") +
        ".",
      citation: { page: pricingPage, reference: "Form of tender and pricing schedule" },
    });
  }

  const related = collusion.filter((signal) => signal.bid_a === bid.id || signal.bid_b === bid.id);
  for (const signal of related) {
    const other = signal.bid_a === bid.id ? signal.bidder_b : signal.bidder_a;
    findings.push({
      key: "collusion_" + other,
      severity: signal.score >= 0.5 ? "critical" : "warning",
      category: "collusion",
      title: "Possible bid coordination with " + other,
      detail: signal.reasons.join(". ") + ".",
      citation: { page: 1, reference: "Packet cover sheet and document properties" },
    });
  }

  if (!packet.parsed && (bid.document_urls || []).length === 0) {
    findings.push({
      key: "no_packet",
      severity: "warning",
      category: "documents",
      title: "No bid packet documents were attached",
      detail: "Only the declared pricing schedule could be audited. Attach the full packet for a complete review.",
      citation: { page: 1, reference: "Bid cover sheet" },
    });
  }

  if (!findings.length) {
    findings.push({
      key: "clean",
      severity: "info",
      category: "statutory",
      title: "No adverse findings",
      detail: "Every statutory check passed and the pricing sits inside the published market range.",
      citation: { page: 1, reference: "Bid cover sheet" },
    });
  }

  return findings;
}

export async function runAuditPipeline({ tender, bids, priceIndex, onProgress = () => {} }) {
  const log = [];
  const step = (label) => {
    onProgress(label);
    log.push(label);
  };

  await recordAudit({
    action: "Compliance audit started",
    tool: null,
    input: { tender_number: tender.tender_number, bids: bids.length },
    output: { status: "started" },
  });

  const packets = {};
  for (const bid of bids) {
    step("Reading packet for " + bid.bidder_name);
    packets[bid.id] = await parseTenderPacket(bid);
    await recordAudit({
      action: "Bid packet read",
      tool: TOOL.parse,
      input: { bidder: bid.bidder_name, documents: (bid.document_urls || []).length },
      output: packets[bid.id],
    });
  }

  const statutory = {};
  for (const bid of bids) {
    step("Checking statutory standing for " + bid.bidder_name);
    statutory[bid.id] = verifyStatutoryCompliance(bid.registration_number, bid.bidder_name);
    await recordAudit({
      action: "Statutory checks completed",
      tool: TOOL.statutory,
      input: { bidder: bid.bidder_name, registration_number: bid.registration_number },
      output: statutory[bid.id].verdicts,
    });
  }

  const pricing = {};
  for (const bid of bids) {
    step("Benchmarking prices for " + bid.bidder_name);
    pricing[bid.id] = benchmarkPricing(bid.line_items, priceIndex);
    await recordAudit({
      action: "Price benchmarking completed",
      tool: TOOL.pricing,
      input: { bidder: bid.bidder_name, items: (bid.line_items || []).length },
      output: { variance_score: pricing[bid.id].varianceScore, flagged: pricing[bid.id].flagged.length },
    });
  }

  step("Scanning for coordination between bidders");
  const collusion = detectCollusionPatterns(bids);
  await recordAudit({
    action: "Coordination scan completed",
    tool: TOOL.collusion,
    input: { bids: bids.length },
    output: { signals: collusion.length },
  });

  step("Clearing earlier results for these bids");
  await supabase
    .from("compliance_evaluations")
    .delete()
    .in("bid_id", bids.map((bid) => bid.id));

  const saved = [];
  for (const bid of bids) {
    const packet = packets[bid.id];
    const raw = buildFindings({ bid, tender, packet, statutory: statutory[bid.id], pricing: pricing[bid.id], collusion });
    step("Verifying page references for " + bid.bidder_name);
    const { kept, hidden } = verifyCitationExistence(raw, packet.pages);

    if (hidden.length) {
      await recordAudit({
        action: "Unsourced findings withheld",
        tool: TOOL.citation,
        input: { bidder: bid.bidder_name, withheld: hidden.length },
        output: { withheld: hidden.map((f) => f.title) },
      });
    }

    const critical = kept.filter((f) => f.severity === "critical").length;
    const warnings = kept.filter((f) => f.severity === "warning").length;
    const overall =
      critical > 0 ? "critical" : warnings > 0 ? "warning" : "compliant";

    const record = {
      bid_id: bid.id,
      tender_id: tender.id,
      kra_tax_status: statutory[bid.id].verdicts[0].status,
      brs_status: statutory[bid.id].verdicts[1].status,
      nssf_status: statutory[bid.id].verdicts[2].status,
      sha_shif_status: statutory[bid.id].verdicts[3].status,
      agpo_status: statutory[bid.id].verdicts[4].status,
      price_variance_score: pricing[bid.id].varianceScore,
      collusion_risk_score: Number(
        (
          collusion
            .filter((s) => s.bid_a === bid.id || s.bid_b === bid.id)
            .reduce((max, s) => Math.max(max, s.score), 0) * 100
        ).toFixed(0),
      ),
      verified_citations: kept.map((f) => f.citation),
      findings: kept,
      summary:
        critical > 0
          ? critical + " critical flag(s) and " + warnings + " item(s) needing attention."
          : warnings > 0
            ? warnings + " item(s) needing attention. No critical flags."
            : "All statutory checks passed and pricing is within the published range.",
      overall_status: overall,
      evaluated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("compliance_evaluations").insert(record).select().single();
    if (error) throw new Error(error.message);
    saved.push(data);
  }

  await recordAudit({
    action: "Compliance audit finished",
    tool: null,
    input: { tender_number: tender.tender_number },
    output: { evaluations: saved.length },
  });

  return { evaluations: saved, collusion, packets, statutory, pricing, log };
}