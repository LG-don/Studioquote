// Internal costing for fee-based work (design only / design + part execution).
// Nothing here is ever shown to the client.
//
// The rule: in any month, each studio cost (staff salaries, your own pay, running costs)
// is shared between the projects running that month in proportion to what each project
// earns that month (its fee ÷ its duration).
//
//   Example: two ₹3 lakh projects over the same 6 months each earn ₹50k a month,
//   so a ₹25k salary costs each of them ₹12.5k a month.
//
// A site visit's cost = (this project's share of your pay + running costs that month)
// ÷ the visits planned that month. Busy months make each visit cheaper.

import { calcProject } from "./calc";
import { FEE_CATEGORY } from "./constants";
import type { CostPlan, Project, StudioCosts } from "./types";

export const EMPTY_COSTS: StudioCosts = { ownMonthlyPay: 0, staff: [], otherMonthly: 0, renderCost: 0 };

export function defaultPlan(): CostPlan {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return { startMonth: monthKey(d), months: 4, visits: 12, renders: 10, renderCost: null };
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthsOf(plan: CostPlan): string[] {
  const [y, m] = plan.startMonth.split("-").map(Number);
  if (!y || !m || plan.months <= 0) return [];
  return Array.from({ length: Math.min(Math.round(plan.months), 60) }, (_, i) => monthKey(new Date(y, m - 1 + i, 1)));
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

/** The project's fee income, excluding GST: its design-service lines after any discount. */
export function feeIncome(p: Project): number {
  const c = calcProject(p);
  const fees = p.items.filter((i) => i.category === FEE_CATEGORY && !c.lines[i.id].excluded).reduce((s, i) => s + c.lines[i.id].clientAmount, 0);
  if (fees <= 0 || c.clientSubtotal <= 0) return 0;
  // Spread contingency and discount in proportion, so the fee matches what is actually billed.
  return Math.round((fees * c.taxable) / c.clientSubtotal);
}

/** Splits a whole number of visits across months as evenly as possible. */
export function spread(total: number, n: number): number[] {
  if (n <= 0) return [];
  const t = Math.max(0, Math.round(total));
  const base = Math.floor(t / n);
  const extra = t % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

export interface MonthRow {
  month: string;
  sharingWith: number; // other projects running that month
  share: number; // 0..1 of the studio's costs carried by this project
  fee: number; // this project's fee earned that month
  staff: number;
  ownPay: number;
  running: number;
  visits: number;
  perVisit: number | null;
}

export interface CostResult {
  fee: number;
  months: MonthRow[];
  staff: number;
  ownPay: number;
  running: number;
  renders: number;
  totalCost: number; // excluding your own pay
  keep: number; // fee − staff − running − renders (what is left for you)
  profitAfterPay: number; // keep − your own pay share
  avgPerVisit: number | null;
  others: { id: string; name: string; months: string[]; monthlyFee: number }[];
}

/**
 * Costs for `project`, sharing each month with `portfolio` (other ongoing fee projects
 * that have a plan). The project itself is always counted, even while it is a draft.
 */
export function costProject(project: Project, portfolio: Project[], costs: StudioCosts = EMPTY_COSTS): CostResult | null {
  const plan = project.plan;
  if (!plan) return null;
  const months = monthsOf(plan);
  const fee = feeIncome(project);
  const myMonthly = months.length ? fee / months.length : 0;

  const others = portfolio
    .filter((o) => o.id !== project.id && o.plan)
    .map((o) => {
      const m = monthsOf(o.plan!);
      const f = feeIncome(o);
      return { id: o.id, name: o.name || "Untitled project", months: m, monthlyFee: m.length ? f / m.length : 0 };
    })
    .filter((o) => o.monthlyFee > 0 && o.months.some((m) => months.includes(m)));

  const salaries = costs.staff.reduce((s, x) => s + (Number(x.monthlySalary) || 0), 0);
  const visits = spread(plan.visits, months.length);

  const rows: MonthRow[] = months.map((month, i) => {
    const active = others.filter((o) => o.months.includes(month));
    const total = myMonthly + active.reduce((s, o) => s + o.monthlyFee, 0);
    // With no fee yet, the project carries the month alone so the costs stay visible.
    const share = total > 0 ? myMonthly / total : 1;
    const ownPay = costs.ownMonthlyPay * share;
    const running = costs.otherMonthly * share;
    return {
      month,
      sharingWith: active.length,
      share,
      fee: myMonthly,
      staff: salaries * share,
      ownPay,
      running,
      visits: visits[i],
      perVisit: visits[i] > 0 ? (ownPay + running) / visits[i] : null,
    };
  });

  const sum = (k: "staff" | "ownPay" | "running") => Math.round(rows.reduce((s, r) => s + r[k], 0));
  const staff = sum("staff");
  const ownPay = sum("ownPay");
  const running = sum("running");
  const renders = Math.round((plan.renders || 0) * (plan.renderCost ?? costs.renderCost ?? 0));
  const totalCost = staff + running + renders;
  const keep = fee - totalCost;
  const totalVisits = visits.reduce((s, v) => s + v, 0);
  return {
    fee,
    months: rows,
    staff,
    ownPay,
    running,
    renders,
    totalCost,
    keep,
    profitAfterPay: keep - ownPay,
    avgPerVisit: totalVisits ? Math.round((ownPay + running) / totalVisits) : null,
    others: others.map((o) => ({ id: o.id, name: o.name, months: o.months, monthlyFee: Math.round(o.monthlyFee) })),
  };
}

/** Projects that count as "ongoing" for sharing costs: approved or sent, with a plan and a fee. */
export function ongoingPortfolio(all: Project[]): Project[] {
  return all.filter((p) => p.plan && p.status !== "draft" && feeIncome(p) > 0);
}

/** "What you keep" for any project: the cost plan for fee work, quote profit otherwise. */
export function keepFor(p: Project, all: Project[], costs?: StudioCosts): { value: number; pct: number; planned: boolean } {
  if ((p.engagement ?? "turnkey") !== "turnkey" && p.plan) {
    const r = costProject(p, ongoingPortfolio(all.filter((o) => o.id !== p.id)), costs);
    if (r) return { value: r.keep, pct: r.fee > 0 ? (r.keep / r.fee) * 100 : 0, planned: true };
  }
  const c = calcProject(p);
  return { value: c.profit, pct: c.marginPct, planned: false };
}
