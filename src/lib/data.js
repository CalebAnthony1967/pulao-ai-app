import { supabase } from "./supabase";

export async function listTenders({ search = "", category = "all", region = "all", agpoOnly = false } = {}) {
  let query = supabase.from("tenders_ocds").select("*").order("submission_deadline", { ascending: true });
  if (search) query = query.or(`title.ilike.%${search}%,tender_number.ilike.%${search}%,procuring_entity.ilike.%${search}%`);
  if (category !== "all") query = query.eq("category", category);
  if (region !== "all") query = query.eq("region", region);
  if (agpoOnly) query = query.eq("agpo_reserved", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getTender(id) {
  const { data, error } = await supabase.from("tenders_ocds").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Local persistence helpers for resilient bids, evaluations, and decisions
export function getAllLocalBids() {
  try {
    const raw = localStorage.getItem("pulao_local_bids");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalBid(bid) {
  try {
    const bids = getAllLocalBids();
    const idx = bids.findIndex((b) => b.id === bid.id);
    if (idx >= 0) {
      bids[idx] = bid;
    } else {
      bids.unshift(bid);
    }
    localStorage.setItem("pulao_local_bids", JSON.stringify(bids));
  } catch {}
}

export function getAllLocalEvaluations() {
  try {
    const raw = localStorage.getItem("pulao_local_evaluations");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalEvaluation(evaluation) {
  try {
    const evals = getAllLocalEvaluations();
    const idx = evals.findIndex((e) => e.id === evaluation.id || (e.bid_id && e.bid_id === evaluation.bid_id));
    if (idx >= 0) {
      evals[idx] = { ...evals[idx], ...evaluation };
    } else {
      evals.push(evaluation);
    }
    localStorage.setItem("pulao_local_evaluations", JSON.stringify(evals));
  } catch {}
}

export function updateLocalEvaluationStatus(evalId, status, justification = "") {
  try {
    const evals = getAllLocalEvaluations();
    const target = evals.find((e) => e.id === evalId);
    if (target) {
      target.overall_status = status;
      target.justification = justification;
      localStorage.setItem("pulao_local_evaluations", JSON.stringify(evals));
    }
  } catch {}
}

export function getAllLocalDecisions() {
  try {
    const raw = localStorage.getItem("pulao_local_decisions");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalDecision(decision) {
  try {
    const decs = getAllLocalDecisions();
    decs.push(decision);
    localStorage.setItem("pulao_local_decisions", JSON.stringify(decs));
  } catch {}
}

export function getLocalAuditLogs() {
  try {
    const raw = localStorage.getItem("pulao_audit_vault");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function listPriceIndex() {
  try {
    const { data, error } = await supabase.from("market_price_index").select("*").order("item_category");
    if (!error && data && data.length) return data;
  } catch {}
  return [];
}

export async function listBidsForTender(tenderId) {
  let remote = [];
  try {
    const { data, error } = await supabase
      .from("bid_submissions")
      .select("*")
      .eq("tender_id", tenderId)
      .order("submission_date", { ascending: true });
    if (!error && data) remote = data;
  } catch {}

  const local = getAllLocalBids().filter((b) => b.tender_id === tenderId);
  const map = new Map();
  for (const b of remote) map.set(b.id, b);
  for (const b of local) map.set(b.id, b);
  return Array.from(map.values());
}

export async function listMyBids(userId) {
  let remote = [];
  try {
    const { data, error } = await supabase
      .from("bid_submissions")
      .select("*, tenders_ocds(tender_number, title, procuring_entity, submission_deadline, status)")
      .eq("submitted_by", userId)
      .order("submission_date", { ascending: false });
    if (!error && data) remote = data;
  } catch {}

  const allLocal = getAllLocalBids();
  const matchingLocal = allLocal.filter(
    (b) => !userId || b.submitted_by === userId || b.submitted_by?.includes("supplier") || b.submitted_by?.includes("usr_"),
  );

  const allTenders = await listTenders().catch(() => []);
  const tenderMap = new Map(allTenders.map((t) => [t.id, t]));
  for (const b of matchingLocal) {
    if (!b.tenders_ocds && tenderMap.has(b.tender_id)) {
      b.tenders_ocds = tenderMap.get(b.tender_id);
    }
  }

  const map = new Map();
  for (const b of remote) map.set(b.id, b);
  for (const b of matchingLocal) map.set(b.id, b);
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.submission_date || 0).getTime() - new Date(a.submission_date || 0).getTime(),
  );
}

export async function listEvaluations(tenderId) {
  let remote = [];
  try {
    const { data, error } = await supabase
      .from("compliance_evaluations")
      .select("*, bid_submissions(bidder_name, registration_number, quoted_amount, line_items, metadata, document_urls, submission_date)")
      .eq("tender_id", tenderId)
      .order("evaluated_at", { ascending: true });
    if (!error && data) remote = data;
  } catch {}

  const local = getAllLocalEvaluations().filter((e) => e.tender_id === tenderId);
  const map = new Map();
  for (const e of remote) map.set(e.id, e);
  for (const e of local) map.set(e.id, e);
  return Array.from(map.values());
}

export async function listMyEvaluations(userId) {
  try {
    const myBids = await listMyBids(userId);
    if (!myBids || myBids.length === 0) return [];
    const bidIds = new Set(myBids.map((b) => b.id));

    let remote = [];
    try {
      const { data: evals } = await supabase
        .from("compliance_evaluations")
        .select("*")
        .in("bid_id", Array.from(bidIds));
      if (evals) remote = evals;
    } catch {}

    const local = getAllLocalEvaluations().filter((e) => bidIds.has(e.bid_id));
    const map = new Map();
    for (const e of remote) map.set(e.id, e);
    for (const e of local) map.set(e.id, e);
    return Array.from(map.values());
  } catch {
    return [];
  }
}

export async function listDecisions(tenderId) {
  let remote = [];
  try {
    const { data, error } = await supabase
      .from("committee_decisions")
      .select("*")
      .eq("tender_id", tenderId)
      .order("signed_at", { ascending: false });
    if (!error && data) remote = data;
  } catch {}

  const local = getAllLocalDecisions().filter((d) => d.tender_id === tenderId);
  const map = new Map();
  for (const d of remote) map.set(d.id, d);
  for (const d of local) map.set(d.id, d);
  return Array.from(map.values());
}

export async function listAuditLogs({ search = "", limit = 120 } = {}) {
  let remote = [];
  try {
    let query = supabase
      .from("immutable_audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(limit);
    if (search) query = query.or(`action_performed.ilike.%${search}%,mcp_tool_called.ilike.%${search}%`);
    const { data, error } = await query;
    if (!error && data) remote = data;
  } catch {}

  const local = getLocalAuditLogs();
  const map = new Map();
  for (const l of remote) map.set(l.id, l);
  for (const l of local) map.set(l.id, l);

  let combined = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
  );

  if (search) {
    const s = search.toLowerCase();
    combined = combined.filter(
      (l) =>
        (l.action_performed || "").toLowerCase().includes(s) ||
        (l.mcp_tool_called || "").toLowerCase().includes(s),
    );
  }
  return combined.slice(0, limit);
}

export async function listSystemSettings() {
  const { data, error } = await supabase.from("system_settings").select("*");
  if (error) throw new Error(error.message);
  const map = {};
  for (const row of data || []) map[row.key] = row.value;
  return map;
}

export async function saveSystemSetting(key, value) {
  const { error } = await supabase
    .from("system_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function listTeamMembers() {
  const { data, error } = await supabase.from("users_roles").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateMemberRole(id, role) {
  const { error } = await supabase.from("users_roles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Every evaluation, decision and bid the signed-in person is allowed to see. */
export async function loadPortfolio() {
  const [tendersRes, evaluationsRes, decisionsRes, bidsRes] = await Promise.allSettled([
    supabase.from("tenders_ocds").select("*"),
    supabase.from("compliance_evaluations").select("*"),
    supabase.from("committee_decisions").select("*"),
    supabase.from("bid_submissions").select("*"),
  ]);

  const tenders = tendersRes.status === "fulfilled" && tendersRes.value.data ? tendersRes.value.data : [];
  let evaluations = evaluationsRes.status === "fulfilled" && evaluationsRes.value.data ? evaluationsRes.value.data : [];
  let decisions = decisionsRes.status === "fulfilled" && decisionsRes.value.data ? decisionsRes.value.data : [];
  let bids = bidsRes.status === "fulfilled" && bidsRes.value.data ? bidsRes.value.data : [];

  const localBids = getAllLocalBids();
  const localEvals = getAllLocalEvaluations();
  const localDecisions = getAllLocalDecisions();

  const bidMap = new Map(bids.map((b) => [b.id, b]));
  for (const b of localBids) bidMap.set(b.id, b);

  const evalMap = new Map(evaluations.map((e) => [e.id, e]));
  for (const e of localEvals) evalMap.set(e.id, e);

  const decMap = new Map(decisions.map((d) => [d.id, d]));
  for (const d of localDecisions) decMap.set(d.id, d);

  return {
    tenders,
    evaluations: Array.from(evalMap.values()),
    decisions: Array.from(decMap.values()),
    bids: Array.from(bidMap.values()),
  };
}