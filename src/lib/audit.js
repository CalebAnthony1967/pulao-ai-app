import { supabase } from "./supabase";
import { maskPayload } from "./mask";

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Appends one tamper-evident entry to the audit vault. Hashing and chaining
 * happen inside the database so no one can rewrite history from the browser.
 */
export async function recordAudit({ action, tool = null, input = null, output = null, mask = true }) {
  const payload = mask
    ? { input: maskPayload(input), output: maskPayload(output) }
    : { input, output };

  const { data, error } = await supabase.rpc("append_audit_log", {
    p_action: action,
    p_tool: tool,
    p_input: payload.input ?? null,
    p_output: payload.output ?? null,
  });

  if (error) throw new Error("Audit trail write failed: " + error.message);
  return data;
}

/** Recomputes the chain so the vault can prove nothing was edited out. */
export async function verifyChain(entries) {
  const ordered = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  let previous = "GENESIS";
  const broken = [];
  for (const entry of ordered) {
    const expected = await sha256Hex(
      previous +
        "|" +
        entry.action_performed +
        "|" +
        (entry.input_payload === null || entry.input_payload === undefined
          ? "null"
          : JSON.stringify(entry.input_payload)) +
        "|" +
        (entry.output_payload === null || entry.output_payload === undefined
          ? "null"
          : JSON.stringify(entry.output_payload)) +
        "|" +
        entry.timestamp,
    );
    if (expected !== entry.tamper_proof_hash) broken.push(entry.id);
    previous = entry.tamper_proof_hash;
  }
  return { checked: ordered.length, broken };
}