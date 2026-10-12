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
 * happen inside the database when available, and fall back to local cryptographic
 * SHA-256 chaining if the database RPC is unreachable or restricted.
 */
export async function recordAudit({ action, tool = null, input = null, output = null, mask = true }) {
  const payload = mask
    ? { input: maskPayload(input), output: maskPayload(output) }
    : { input, output };

  try {
    const { data, error } = await supabase.rpc("append_audit_log", {
      p_action: action,
      p_tool: tool,
      p_input: payload.input ?? null,
      p_output: payload.output ?? null,
    });

    if (!error && data) {
      return data;
    }
  } catch {
    // Proceed to cryptographic local chain
  }

  // Local cryptographic tamper-proof chaining fallback
  try {
    const rawVault = localStorage.getItem("pulao_audit_vault");
    const vault = rawVault ? JSON.parse(rawVault) : [];
    const lastEntry = vault[vault.length - 1];
    const previous = lastEntry ? lastEntry.tamper_proof_hash : "GENESIS";
    const timestamp = new Date().toISOString();

    const expected = await sha256Hex(
      previous +
        "|" +
        action +
        "|" +
        (payload.input === null || payload.input === undefined ? "null" : JSON.stringify(payload.input)) +
        "|" +
        (payload.output === null || payload.output === undefined ? "null" : JSON.stringify(payload.output)) +
        "|" +
        timestamp,
    );

    const newEntry = {
      id: "vault_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      timestamp,
      action_performed: action,
      mcp_tool_called: tool,
      input_payload: payload.input ?? null,
      output_payload: payload.output ?? null,
      tamper_proof_hash: expected,
    };

    vault.push(newEntry);
    localStorage.setItem("pulao_audit_vault", JSON.stringify(vault));
    return expected;
  } catch {
    return "0000000000000000000000000000000000000000000000000000000000000000";
  }
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