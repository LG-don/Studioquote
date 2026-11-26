// Deterministic quotation maths. No AI is involved anywhere in this file.
//
// Order of operations
//   1. Cost rate        = material rate + labour rate            (studio's cost)
//   2. Client rate      = cost rate × load factor, rounded
//                         load factor = (1 + overhead%) × (1 + profit%)
//                                       × (1 + contingency%)  ← only when contingency is folded in
//   3. Line amount      = qty × client rate, rounded to the rupee
//   4. Client subtotal  = Σ line amounts
//   5. Contingency line = subtotal × contingency%                 ← only when shown separately
//   6. Discount         = % of (subtotal + contingency) or a fixed amount
//   7. Taxable value    = subtotal + contingency − discount
//   8. GST              = taxable value split by category GST rate (CGST+SGST or IGST)
//   9. Grand total      = taxable + GST, rounded to the rupee (round-off shown)
//
// Clients only ever see client rates. Overhead and profit are internal.

import type { Milestone, QuoteSettings, ScopeItem } from "./types";

export interface LineCalc {
  id: string;
  qty: number;
  costRate: number;
  materialAmount: number;
  labourAmount: number;
  costAmount: number;
  clientRate: number;
  clientAmount: number;
  complete: boolean; // has qty and at least one rate
}

export interface GroupTotal {
  key: string;
  cost: number;
  client: number;
  count: number;
}

export interface TaxLine {
  label: string;
  ratePct: number;
  base: number;
  amount: number;
}

export interface QuoteCalc {
  lines: Record<string, LineCalc>;
  loadFactor: number;
  materialTotal: number;
  labourTotal: number;
  costSubtotal: number;
  overheadAmount: number;
  contingencyBuffer: number; // internal: money reserved for surprises
  clientSubtotal: number;
  contingencyAmount: number; // shown line on the quote (0 when folded)
  discountAmount: number;
  taxable: number;
  taxLines: TaxLine[];
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
  profit: number;
  marginPct: number; // profit / taxable
  byCategory: GroupTotal[];
  byRoom: GroupTotal[];
  incompleteCount: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function roundClientRate(n: number): number {
  // Rates of ₹100 and above round to the rupee; small rates keep paise.
  return n >= 100 ? Math.round(n) : round2(n);
}

export function loadFactor(q: QuoteSettings): number {
  const oh = 1 + (q.overheadPct || 0) / 100;
  const pr = 1 + (q.profitPct || 0) / 100;
  const ct = q.showContingency ? 1 : 1 + (q.contingencyPct || 0) / 100;
  return oh * pr * ct;
}

export function calcLine(item: ScopeItem, factor: number): LineCalc {
  const qty = item.qty ?? 0;
  const m = item.materialRate ?? 0;
  const l = item.labourRate ?? 0;
  const costRate = m + l;
  const clientRate = roundClientRate(costRate * factor);
  return {
    id: item.id,
    qty,
    costRate,
    materialAmount: round2(qty * m),
    labourAmount: round2(qty * l),
    costAmount: round2(qty * costRate),
    clientRate,
    clientAmount: Math.round(qty * clientRate),
    complete: item.qty !== null && item.qty > 0 && (item.materialRate !== null || item.labourRate !== null) && costRate > 0,
  };
}

function group(items: ScopeItem[], lines: Record<string, LineCalc>, key: (i: ScopeItem) => string): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  for (const it of items) {
    const k = key(it) || "Unassigned";
    const g = map.get(k) ?? { key: k, cost: 0, client: 0, count: 0 };
    g.cost += lines[it.id].costAmount;
    g.client += lines[it.id].clientAmount;
    g.count += 1;
    map.set(k, g);
  }
  return [...map.values()];
}

export function calcQuote(items: ScopeItem[], q: QuoteSettings): QuoteCalc {
  const factor = loadFactor(q);
  const lines: Record<string, LineCalc> = {};
  let materialTotal = 0;
  let labourTotal = 0;
  let clientSubtotal = 0;
  let incompleteCount = 0;

  for (const it of items) {
    const l = calcLine(it, factor);
    lines[it.id] = l;
    materialTotal += l.materialAmount;
    labourTotal += l.labourAmount;
    clientSubtotal += l.clientAmount;
    if (!l.complete) incompleteCount++;
  }
  materialTotal = round2(materialTotal);
  labourTotal = round2(labourTotal);
  const costSubtotal = round2(materialTotal + labourTotal);

  const ohPct = (q.overheadPct || 0) / 100;
  const prPct = (q.profitPct || 0) / 100;
  const ctPct = (q.contingencyPct || 0) / 100;
  const overheadAmount = round2(costSubtotal * ohPct);

  const contingencyAmount = q.showContingency ? Math.round(clientSubtotal * ctPct) : 0;
  const contingencyBuffer = q.showContingency
    ? contingencyAmount
    : round2(costSubtotal * (1 + ohPct) * (1 + prPct) * ctPct);

  const discountBase = clientSubtotal + contingencyAmount;
  let discountAmount = 0;
  if (q.discountValue > 0) {
    discountAmount =
      q.discountType === "pct"
        ? Math.round((discountBase * Math.min(q.discountValue, 100)) / 100)
        : Math.min(Math.round(q.discountValue), discountBase);
  }
  const taxable = discountBase - discountAmount;

  const byCategory = group(items, lines, (i) => i.category);
  const byRoom = group(items, lines, (i) => i.room);

  // GST: allocate taxable value to categories in proportion to their subtotal,
  // then bucket by applicable rate.
  const taxLines: TaxLine[] = [];
  if (q.gstMode !== "none" && taxable > 0) {
    const buckets = new Map<number, number>();
    if (clientSubtotal > 0) {
      for (const g of byCategory) {
        const rate = q.categoryGst?.[g.key] ?? q.gstRatePct;
        const base = (taxable * g.client) / clientSubtotal;
        buckets.set(rate, (buckets.get(rate) ?? 0) + base);
      }
    } else {
      buckets.set(q.gstRatePct, taxable);
    }
    const rates = [...buckets.keys()].sort((a, b) => b - a);
    for (const rate of rates) {
      const base = round2(buckets.get(rate)!);
      if (rate <= 0 || base <= 0) continue;
      if (q.gstMode === "cgst_sgst") {
        const half = round2((base * rate) / 200);
        taxLines.push({ label: `CGST @ ${rate / 2}%`, ratePct: rate / 2, base, amount: half });
        taxLines.push({ label: `SGST @ ${rate / 2}%`, ratePct: rate / 2, base, amount: half });
      } else {
        taxLines.push({ label: `IGST @ ${rate}%`, ratePct: rate, base, amount: round2((base * rate) / 100) });
      }
    }
  }
  const taxTotal = round2(taxLines.reduce((s, t) => s + t.amount, 0));
  const beforeRound = taxable + taxTotal;
  const grandTotal = Math.round(beforeRound);
  const roundOff = round2(grandTotal - beforeRound);

  const profit = round2(taxable - costSubtotal - overheadAmount - contingencyBuffer);
  const marginPct = taxable > 0 ? (profit / taxable) * 100 : 0;

  return {
    lines,
    loadFactor: factor,
    materialTotal,
    labourTotal,
    costSubtotal,
    overheadAmount,
    contingencyBuffer,
    clientSubtotal,
    contingencyAmount,
    discountAmount,
    taxable,
    taxLines,
    taxTotal,
    roundOff,
    grandTotal,
    profit,
    marginPct,
    byCategory,
    byRoom,
    incompleteCount,
  };
}

/** Splits the grand total across milestones; the last milestone absorbs rounding. */
export function milestoneAmounts(total: number, milestones: Milestone[]): number[] {
  const amounts = milestones.map((m) => Math.round((total * m.pct) / 100));
  const pctSum = milestones.reduce((s, m) => s + m.pct, 0);
  if (amounts.length && Math.abs(pctSum - 100) < 0.001) {
    const diff = total - amounts.reduce((s, a) => s + a, 0);
    amounts[amounts.length - 1] += diff;
  }
  return amounts;
}
