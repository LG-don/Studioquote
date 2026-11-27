import { calcProject } from "./calc";
import { uid } from "./ids";
import type { Project, ScopeItem, Version, VersionSnapshot } from "./types";

export function snapshotOf(p: Project): VersionSnapshot {
  return JSON.parse(JSON.stringify({ items: p.items, quote: p.quote, payment: p.payment, timeline: p.timeline, terms: p.terms }));
}

export function sameAsLatest(p: Project): boolean {
  const last = p.versions[p.versions.length - 1];
  return !!last && JSON.stringify(last.snapshot) === JSON.stringify(snapshotOf(p));
}

export function makeVersion(p: Project, note: string): Version {
  const c = calcProject(p);
  return {
    id: uid("v"),
    number: (p.versions[p.versions.length - 1]?.number ?? 0) + 1,
    note,
    createdAt: new Date().toISOString(),
    snapshot: snapshotOf(p),
    grandTotal: c.grandTotal,
    profit: c.profit,
  };
}

export interface ItemChange {
  item: ScopeItem;
  fields: { field: string; from: string; to: string }[];
}

export interface VersionDiff {
  added: ScopeItem[];
  removed: ScopeItem[];
  changed: ItemChange[];
  settingsChanged: string[];
}

const FIELDS: [keyof ScopeItem, string][] = [
  ["item", "Item"], ["room", "Room"], ["category", "Category"], ["specification", "Specification"], ["brand", "Brand"],
  ["qty", "Qty"], ["unit", "Unit"], ["materialRate", "Material rate"], ["labourRate", "Labour rate"],
  ["included", "Included"], ["excluded", "Excluded"], ["installation", "Installation"],
];

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

/** Differences going from `a` (older) to `b` (newer). */
export function diffSnapshots(a: VersionSnapshot, b: VersionSnapshot): VersionDiff {
  const aMap = new Map(a.items.map((i) => [i.id, i]));
  const bMap = new Map(b.items.map((i) => [i.id, i]));
  const added = b.items.filter((i) => !aMap.has(i.id));
  const removed = a.items.filter((i) => !bMap.has(i.id));
  const changed: ItemChange[] = [];
  for (const nb of b.items) {
    const na = aMap.get(nb.id);
    if (!na) continue;
    const fields = FIELDS.filter(([k]) => show(na[k]) !== show(nb[k])).map(([k, label]) => ({ field: label, from: show(na[k]), to: show(nb[k]) }));
    if (fields.length) changed.push({ item: nb, fields });
  }
  const settingsChanged: string[] = [];
  const qa = a.quote, qb = b.quote;
  if (qa.overheadPct !== qb.overheadPct) settingsChanged.push(`Overheads ${qa.overheadPct}% → ${qb.overheadPct}%`);
  if (qa.profitPct !== qb.profitPct) settingsChanged.push(`Profit ${qa.profitPct}% → ${qb.profitPct}%`);
  if (qa.contingencyPct !== qb.contingencyPct) settingsChanged.push(`Contingency ${qa.contingencyPct}% → ${qb.contingencyPct}%`);
  if (qa.discountValue !== qb.discountValue || qa.discountType !== qb.discountType)
    settingsChanged.push(`Discount ${qa.discountValue}${qa.discountType === "pct" ? "%" : " ₹"} → ${qb.discountValue}${qb.discountType === "pct" ? "%" : " ₹"}`);
  if (qa.gstMode !== qb.gstMode || qa.gstRatePct !== qb.gstRatePct) settingsChanged.push(`GST ${qa.gstMode} ${qa.gstRatePct}% → ${qb.gstMode} ${qb.gstRatePct}%`);
  if (JSON.stringify(a.payment) !== JSON.stringify(b.payment)) settingsChanged.push("Payment schedule changed");
  if (JSON.stringify(a.timeline) !== JSON.stringify(b.timeline)) settingsChanged.push("Timeline changed");
  if (JSON.stringify(a.terms) !== JSON.stringify(b.terms)) settingsChanged.push("Terms changed");
  return { added, removed, changed, settingsChanged };
}
