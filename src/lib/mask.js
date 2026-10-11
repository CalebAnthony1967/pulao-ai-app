const PII_KEYS = [
  "national_id",
  "id_number",
  "phone",
  "phone_number",
  "mobile",
  "email",
  "contact_email",
  "kra_pin",
  "pin",
  "passport",
  "address",
];

const PIN_RE = /\b[A-Z]\d{9}[A-Z]\b/g;
const PHONE_RE = /(\+?254|0)[\s-]?7\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g;
const ID_RE = /\b\d{8}\b/g;

export function maskString(value) {
  return value
    .replace(PIN_RE, "[hidden tax reference]")
    .replace(PHONE_RE, "[hidden phone number]")
    .replace(ID_RE, "[hidden identity number]");
}

function maskEmail(value) {
  const at = value.indexOf("@");
  if (at < 1) return "[hidden email]";
  return value.slice(0, 1) + "•••" + value.slice(at);
}

export function maskPayload(value, keyHint = "") {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (keyHint === "email" || keyHint === "contact_email") return maskEmail(value);
    return PII_KEYS.includes(keyHint) ? "[hidden personal detail]" : maskString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((entry) => maskPayload(entry, keyHint));
  if (typeof value === "object") {
    const out = {};
    for (const [key, entry] of Object.entries(value)) out[key] = maskPayload(entry, key);
    return out;
  }
  return value;
}