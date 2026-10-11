export function formatCurrency(value) {
  const amount = Number(value || 0);
  return "KES " + amount.toLocaleString("en-KE", { maximumFractionDigits: 0 });
}

export function formatCompactCurrency(value) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return "KES " + (amount / 1_000_000_000).toFixed(1) + "B";
  if (amount >= 1_000_000) return "KES " + (amount / 1_000_000).toFixed(1) + "M";
  if (amount >= 1_000) return "KES " + (amount / 1_000).toFixed(0) + "K";
  return "KES " + amount.toFixed(0);
}

export function formatDate(value) {
  if (!value) return "Not stated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not stated";
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(value) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function deadlineLabel(value) {
  const days = daysUntil(value);
  if (days === null) return "Deadline not stated";
  if (days < 0) return "Closed " + Math.abs(days) + " days ago";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return "Closes in " + days + " days";
}

export const SEVERITY = {
  critical: {
    label: "Critical flag",
    chip: "bg-critical-soft text-critical border-critical/30",
    dot: "bg-critical",
    tone: "critical",
  },
  warning: {
    label: "Needs attention",
    chip: "bg-caution-soft text-caution border-caution/30",
    dot: "bg-caution",
    tone: "caution",
  },
  info: {
    label: "Verified",
    chip: "bg-compliance-soft text-compliance border-compliance/30",
    dot: "bg-compliance",
    tone: "compliance",
  },
};

export function severityStyle(severity) {
  return SEVERITY[severity] || SEVERITY.info;
}

export const ROLE_LABELS = {
  supplier: "Supplier",
  committee: "Evaluation committee",
  researcher: "Policy researcher",
  admin: "System administrator",
  superadmin: "Super administrator",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || "Public visitor";
}

export function plainStatus(status) {
  const map = {
    open: "Open for bids",
    closed: "Closed",
    evaluating: "Under evaluation",
    awarded: "Awarded",
    submitted: "Submitted",
    pending: "Awaiting audit",
    signed_off: "Signed off by committee",
  };
  return map[status] || status;
}

export function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}