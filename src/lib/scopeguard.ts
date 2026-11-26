// ScopeGuard — deterministic checks for missing or unclear information.
// Runs without AI. An optional AI review can add further notes on top.

import type { QuoteCalc } from "./calc";
import { BRAND_SENSITIVE } from "./constants";
import type { Project, Rate } from "./types";

export type Severity = "blocker" | "warning" | "info";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  itemId?: string;
  target: "brief" | "scope" | "pricing" | "proposal";
  source: "rule" | "ai";
}

const has = (s: string | undefined) => !!s && s.trim().length > 0;

export function runScopeGuard(p: Project, calc: QuoteCalc, rates: Rate[]): Finding[] {
  const f: Finding[] = [];
  const add = (x: Omit<Finding, "source">) => f.push({ ...x, source: "rule" });
  const rateById = new Map(rates.map((r) => [r.id, r]));
  const allText = (p.items.map((i) => `${i.item} ${i.specification} ${i.included} ${i.excluded}`).join(" ") +
    " " + p.terms.join(" ") + " " + p.generalExclusions.join(" ")).toLowerCase();

  // ---- Project level
  if (!has(p.clientName)) add({ id: "client", severity: "blocker", title: "Client name missing", detail: "Add the client's name before sending the quotation.", target: "brief" });
  if (!has(p.location)) add({ id: "location", severity: "warning", title: "Project location missing", detail: "Location appears on the cover and affects GST treatment.", target: "brief" });
  if (p.items.length === 0) add({ id: "noitems", severity: "blocker", title: "No scope items", detail: "Generate a scope from templates or add items manually.", target: "scope" });

  const pctSum = p.payment.reduce((s, m) => s + (Number(m.pct) || 0), 0);
  if (p.payment.length === 0) add({ id: "payment", severity: "blocker", title: "Payment milestones not specified", detail: "Add a payment schedule so the client knows when each payment is due.", target: "proposal" });
  else if (Math.abs(pctSum - 100) > 0.01) add({ id: "payment-sum", severity: "blocker", title: `Payment milestones add up to ${pctSum}%`, detail: "Milestone percentages must total 100%.", target: "proposal" });

  if (p.timeline.length === 0) add({ id: "timeline", severity: "warning", title: "Project timeline missing", detail: "Add the main phases and their duration.", target: "proposal" });
  if (p.terms.length === 0) add({ id: "terms", severity: "warning", title: "No terms and conditions", detail: "Add terms to protect both parties.", target: "proposal" });

  if (p.quote.gstMode === "none") add({ id: "gst-none", severity: "info", title: "GST is not applied", detail: "Confirm this is intended (e.g. studio not GST-registered). Set GST under Pricing → Tax.", target: "pricing" });
  if (p.quote.gstMode !== "none" && !has(p.clientState)) add({ id: "gst-state", severity: "warning", title: "Client state missing", detail: "Needed to decide between CGST + SGST and IGST.", target: "brief" });

  if (p.budget && calc.grandTotal > p.budget * 1.1) {
    const over = Math.round(((calc.grandTotal - p.budget) / p.budget) * 100);
    add({ id: "budget", severity: "warning", title: `Quote is ${over}% over the client's budget`, detail: "Consider value-engineering options or discuss scope priorities with the client.", target: "pricing" });
  }

  if (calc.taxable > 0 && calc.marginPct < 8) {
    add({ id: "margin", severity: "warning", title: `Low profit margin (${calc.marginPct.toFixed(1)}%)`, detail: "Your profit after overheads and discount is thin. Review discount or profit %.", target: "pricing" });
  }

  // ---- Coverage checks (by category presence)
  const cats = new Set(p.items.map((i) => i.category));
  const hasTransport = /transport/.test(allText);
  if (!hasTransport) add({ id: "transport", severity: "warning", title: "Transportation charges missing", detail: "Add a transportation line or state in terms that transport is included / excluded.", target: "scope" });

  if (cats.has("Civil and demolition")) {
    const civil = p.items.filter((i) => i.category === "Civil and demolition");
    if (civil.every((i) => !has(i.excluded))) add({ id: "civil-excl", severity: "warning", title: "Civil work exclusions not defined", detail: "State what civil work is not included (structural repairs, debris disposal, etc.).", target: "scope" });
  }
  if (cats.has("Electrical") && !/fixture|light/.test(p.items.filter((i) => i.category === "Electrical").map((i) => i.excluded + i.included).join(" ").toLowerCase()) && !cats.has("Lighting")) {
    add({ id: "fixtures", severity: "warning", title: "Light fixtures — supply responsibility unclear", detail: "Electrical work is quoted but light fixtures are neither included nor excluded.", target: "scope" });
  }
  if (cats.has("Modular kitchen") && !p.items.some((i) => /appliance|hob|chimney/.test((i.excluded + i.included + i.dependencies).toLowerCase()))) {
    add({ id: "appliances", severity: "warning", title: "Kitchen appliances not addressed", detail: "State whether hob, chimney and built-in appliances are supplied by client or studio.", target: "scope" });
  }
  if (!p.items.some((i) => i.category === "Painting and polishing") && p.items.length > 0) {
    add({ id: "painting", severity: "info", title: "No painting in scope", detail: "If painting is excluded, mention it in general exclusions.", target: "scope" });
  }

  // ---- Item level
  for (const it of p.items) {
    const line = calc.lines[it.id];
    const name = `${it.room} — ${it.item || "Untitled item"}`;
    if (!has(it.item)) add({ id: `name-${it.id}`, severity: "blocker", title: "Item without description", detail: `${it.room}: an item has no description.`, itemId: it.id, target: "scope" });
    if (it.qty === null || it.qty <= 0) add({ id: `qty-${it.id}`, severity: "blocker", title: `Quantity missing`, detail: `${name} — measure and enter the quantity.`, itemId: it.id, target: "pricing" });
    if ((it.materialRate ?? 0) + (it.labourRate ?? 0) <= 0) add({ id: `rate-${it.id}`, severity: "blocker", title: `Rate missing`, detail: `${name} — pick a rate from the library or enter material / labour rates.`, itemId: it.id, target: "pricing" });
    if (!has(it.specification)) add({ id: `spec-${it.id}`, severity: "warning", title: "Specification missing", detail: `${name} — describe material and finish.`, itemId: it.id, target: "scope" });
    if (BRAND_SENSITIVE.includes(it.category) && !has(it.brand) && it.materialRate !== 0 && /hardware|internals|switch|fitting|light|downlight/i.test(it.item))
      add({ id: `brand-${it.id}`, severity: "warning", title: "Brand not specified", detail: `${name} — name the brand or say "equivalent approved".`, itemId: it.id, target: "scope" });
    if (/counter/i.test(it.item) && !has(it.installation)) add({ id: `counter-${it.id}`, severity: "warning", title: "Countertop installation responsibility unclear", detail: `${name} — state who templates and installs the countertop.`, itemId: it.id, target: "scope" });
    for (const m of it.missing) {
      // Skip brand notes once a brand is filled in.
      if (/brand/i.test(m) && has(it.brand)) continue;
      add({ id: `miss-${it.id}-${m}`, severity: "info", title: m, detail: name, itemId: it.id, target: "scope" });
    }
    // Underpricing vs the studio's own rate library
    const lib = it.rateId ? rateById.get(it.rateId) : undefined;
    if (lib && line && line.costRate > 0) {
      const libRate = lib.materialRate + lib.labourRate;
      if (libRate > 0 && line.costRate < libRate * 0.75) {
        add({ id: `under-${it.id}`, severity: "warning", title: "Rate well below your library", detail: `${name} — cost rate ₹${line.costRate} vs library ₹${libRate}. Check this isn't a typo.`, itemId: it.id, target: "pricing" });
      }
    }
  }

  // Collapse long runs of the same per-line problem into one finding so the list stays readable.
  const collapse = (prefix: string, title: (n: number) => string, detail: string) => {
    const hits = f.filter((x) => x.id.startsWith(prefix));
    if (hits.length <= 3) return;
    const examples = hits.slice(0, 3).map((h) => h.detail.split(" — ").slice(0, 2).join(" — ")).join("; ");
    const first = f.indexOf(hits[0]);
    const rest = f.filter((x) => !x.id.startsWith(prefix));
    rest.splice(first, 0, { ...hits[0], id: `${prefix}all`, itemId: undefined, title: title(hits.length), detail: `${detail} e.g. ${examples}…` });
    f.splice(0, f.length, ...rest);
  };
  collapse("qty-", (n) => `${n} lines have no quantity`, "Measure and enter quantities on the Pricing tab.");
  collapse("rate-", (n) => `${n} lines have no rate`, "Pick rates from your library or enter material / labour rates.");
  collapse("spec-", (n) => `${n} lines have no specification`, "Describe material and finish.");
  collapse("brand-", (n) => `${n} lines without a brand`, 'Name the brand or say "equivalent approved".');

  const order: Record<Severity, number> = { blocker: 0, warning: 1, info: 2 };
  return f.sort((a, b) => order[a.severity] - order[b.severity]);
}
