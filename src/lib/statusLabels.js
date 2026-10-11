export const STATUTORY_LABELS = {
  VALID_TAX_CERTIFICATE: { label: "Tax certificate valid", pass: true },
  EXPIRED_TAX_CERTIFICATE: { label: "Tax certificate expired", pass: false },
  NOT_REGISTERED: { label: "No tax registration found", pass: false },
  ACTIVE_COMPANY: { label: "Company active", pass: true },
  DORMANT: { label: "Company dormant", pass: false },
  STRUCK_OFF: { label: "Company struck off", pass: false },
  NSSF_COMPLIANT: { label: "Social security current", pass: true },
  NSSF_ARREARS: { label: "Social security in arrears", pass: false },
  NSSF_NOT_REGISTERED: { label: "Not on social security", pass: false },
  SHA_SHIF_ACTIVE: { label: "Health cover active", pass: true },
  SHA_SHIF_ARREARS: { label: "Health cover in arrears", pass: false },
  SHA_SHIF_NOT_REGISTERED: { label: "No health registration", pass: false },
  AGPO_YOUTH_REGISTERED: { label: "Preference: youth", pass: true },
  AGPO_WOMEN_REGISTERED: { label: "Preference: women", pass: true },
  AGPO_PWD_REGISTERED: { label: "Preference: disability", pass: true },
  NOT_AGPO_REGISTERED: { label: "Not on preference register", pass: false },
};

export const STATUTORY_CHECKS = [
  { key: "kra_tax_status", short: "Tax", portal: "Kenya Revenue Authority" },
  { key: "brs_status", short: "Company", portal: "Business Registration Service" },
  { key: "nssf_status", short: "NSSF", portal: "National Social Security Fund" },
  { key: "sha_shif_status", short: "Health", portal: "Social Health Authority" },
  { key: "agpo_status", short: "Preference", portal: "AGPO Register" },
];

export function statutoryLabel(status) {
  return STATUTORY_LABELS[status] || { label: "Not checked", pass: null };
}

export const OVERALL = {
  compliant: { label: "No adverse findings", tone: "compliance" },
  warning: { label: "Needs committee attention", tone: "caution" },
  critical: { label: "Critical flags raised", tone: "critical" },
  pending: { label: "Awaiting audit", tone: "neutral" },
  signed_off: { label: "Signed off", tone: "compliance" },
};

export function overallStyle(status) {
  return OVERALL[status] || OVERALL.pending;
}