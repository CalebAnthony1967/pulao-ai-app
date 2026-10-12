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

export async function listPriceIndex() {
  const { data, error } = await supabase.from("market_price_index").select("*").order("item_category");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listBidsForTender(tenderId) {
  const { data, error } = await supabase
    .from("bid_submissions")
    .select("*")
    .eq("tender_id", tenderId)
    .order("submission_date", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listMyBids(userId) {
  const { data, error } = await supabase
    .from("bid_submissions")
    .select("*, tenders_ocds(tender_number, title, procuring_entity, submission_deadline, status)")
    .eq("submitted_by", userId)
    .order("submission_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listEvaluations(tenderId) {
  const { data, error } = await supabase
    .from("compliance_evaluations")
    .select("*, bid_submissions(bidder_name, registration_number, quoted_amount, line_items, metadata, document_urls, submission_date)")
    .eq("tender_id", tenderId)
    .order("evaluated_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listMyEvaluations(userId) {
  try {
    if (!userId) return [];
    const { data: myBids } = await supabase
      .from("bid_submissions")
      .select("id")
      .eq("submitted_by", userId);
    
    if (!myBids || myBids.length === 0) return [];
    const bidIds = myBids.map((b) => b.id);

    const { data: evals } = await supabase
      .from("compliance_evaluations")
      .select("*")
      .in("bid_id", bidIds);
    return evals || [];
  } catch {
    return [];
  }
}

export async function listDecisions(tenderId) {
  const { data, error } = await supabase
    .from("committee_decisions")
    .select("*")
    .eq("tender_id", tenderId)
    .order("signed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listAuditLogs({ search = "", limit = 120 } = {}) {
  let query = supabase
    .from("immutable_audit_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (search) query = query.or(`action_performed.ilike.%${search}%,mcp_tool_called.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
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
  const [tenders, evaluations, decisions, bids] = await Promise.all([
    supabase.from("tenders_ocds").select("*"),
    supabase.from("compliance_evaluations").select("*"),
    supabase.from("committee_decisions").select("*"),
    supabase.from("bid_submissions").select("*"),
  ]);
  return {
    tenders: tenders.data || [],
    evaluations: evaluations.data || [],
    decisions: decisions.data || [],
    bids: bids.data || [],
  };
}