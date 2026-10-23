// Deterministic domain insights over the app's own feature_records.
// No provider call is made here; callers label results aiGenerated:false.
export function parseRecordFilters(query = {}) {
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 200) : "";
  const status = ["Open","Investigating","Review","Approved","Closed"].includes(query.status) ? query.status : "";
  const risk = ["Low","Moderate","High","Critical"].includes(query.risk) ? query.risk : "";
  return { q, status, risk };
}
export function applyRecordFilters(rows, filters) {
  const { q, status, risk } = filters || {};
  const needle = String(q || "").toLowerCase();
  return (rows || []).filter((r) => {
    if (status && r.status !== status) return false;
    if (risk && r.risk !== risk) return false;
    if (!needle) return true;
    return [r.reference, r.title, r.owner, r.status, r.risk].some((v) => String(v ?? "").toLowerCase().includes(needle));
  });
}
function csvCell(v) { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
export function recordsToCsv(rows) {
  const cols = ["id","reference","title","status","owner","risk","due_date","amount"];
  return [cols.join(","), ...(rows || []).map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
}
export function recordsToJson(rows) { return JSON.stringify(rows ?? [], null, 2); }
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export function buildInsight(rows, feature, kind) {
  const list = Array.isArray(rows) ? rows : [];
  const totalValue = list.reduce((s, r) => s + num(r.amount), 0);
  const highRisk = list.filter((r) => ["High","Critical"].includes(r.risk));
  const open = list.filter((r) => !["Approved","Closed"].includes(r.status));
  const closedCount = list.filter((r) => r.status === "Closed").length;
  const base = { aiGenerated: false, source: "deterministic-fallback", provider: "none", kind, featureId: feature?.id ?? "", featureTitle: feature?.title ?? "" };
  // Preserve false/0/empty explicitly in metrics and flags.
  const metrics = [
    { label: "Record count", value: list.length },
    { label: "Total represented value", value: totalValue },
    { label: "High-risk count", value: highRisk.length },
    { label: "Open count", value: open.length },
    { label: "Closed count", value: closedCount },
  ];
  const flags = { hasRecords: list.length > 0, hasHighRisk: highRisk.length > 0, hasOpenWork: open.length > 0, allClosed: list.length > 0 && closedCount === list.length };
  if (kind === "risk-queue") return { ...base, title: `${feature?.title ?? "Feature"} — Risk queue (deterministic)`, metrics, flags, sections: [
    { title: "Risk queue", detail: highRisk.length ? highRisk.slice(0,10).map((r)=>`${r.reference}: ${r.title} (${r.risk})`).join("; ") : "No high-risk records in this register." },
    { title: "Open exposure", detail: `${open.length} open record(s) representing ${totalValue} in recorded value.` },
    { title: "Review note", detail: "Deterministic fallback over saved records only. Validate source evidence before any operational action." } ] };
  if (kind === "next-actions") return { ...base, title: `${feature?.title ?? "Feature"} — Next actions (deterministic)`, metrics, flags, sections: [
    { title: "Next actions", detail: open.length ? open.slice(0,10).map((r)=>`Follow up ${r.reference} (${r.status}, owner ${r.owner ?? "unassigned"})`).join("; ") : "No open records require follow-up." },
    { title: "Empty-state check", detail: list.length ? "" : "Register is empty; create an operational case first." },
    { title: "Review note", detail: "Suggested from record status and ownership only; a reviewer must approve any action." } ] };
  return { ...base, title: `${feature?.title ?? "Feature"} — Portfolio summary (deterministic)`, metrics, flags, sections: [
    { title: "Portfolio summary", detail: `${list.length} record(s), ${open.length} open, ${closedCount} closed, ${highRisk.length} high-risk.` },
    { title: "Value concentration", detail: `Total represented value is ${totalValue}. Zero or missing amounts are counted as 0.` },
    { title: "Review note", detail: "Deterministic fallback over saved records only; no external provider was called." } ] };
}
export const INSIGHT_KINDS = ["portfolio-summary","risk-queue","next-actions"];
