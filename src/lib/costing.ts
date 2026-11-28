// Internal costing: what each project really earns the studio. Never shown to the client.
//
// The rule: in any month, each studio cost (team salaries, running costs, and your own
// salary if you draw a fixed one) is shared between the projects running that month in
// proportion to what each project earns that month.
//
//   Example: two ₹3 lakh, 6-month design projects each earn ₹50k a month,
//   so a ₹25k salary costs each of them ₹12.5k a month.
//
// What a project "earns" is the price excluding GST, minus material and labour bought
// for it. For design-only work that is simply the fee.
//
// A site visit's cost = this project's share of (your salary, if fixed, + running costs)
// that month ÷ the visits that month. More projects running → cheaper visits.

import { calcProject } from "./calc";
import type { CostPlan, Project, StudioCosts } from "./types";

export const EMPTY_COSTS: StudioCosts = { drawsSalary: false, ownMonthlyPay: 0, staff: [], otherMonthly: 0, renderCost: 0 };

/** Your salary counts as a cost only if you draw a fixed one. Older settings: any pay entered = yes. */
export function salaryOf(c?: StudioCosts): number {
  if (!c) return 0;
  const draws = c.drawsSalary ?? c.ownMonthlyPay > 0;
  return draws ? c.ownMonthlyPay || 0 : 0;
}

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

/** What the project earns the studio (excl. GST): price minus material and labour. For design-only, the fee. */
export function earning(p: Project): number {
  const c = calcProject(p);
  return Math.max(0, Math.round(c.taxable - c.costSubtotal));
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
  earned: number; // this project's earning that month
  team: number;
  salary: number; // your fixed salary share (0 if you don't draw one)
  running: number;
  visits: number;
  perVisit: number | null;
}

export interface CostResult {
  earned: number;
  months: MonthRow[];
  team: number;
  salary: number;
  running: number;
  renders: number;
  studioEarns: number; // earned − team − salary − running − renders
  perVisit: number | null; // average cost of one site visit
  perVisitRange: [number, number] | null;
  drawsSalary: boolean;
  others: { id: string; name: string; months: string[]; monthlyEarning: number }[];
}

/**
 * Costs for `project`, sharing each month with `portfolio` (other ongoing projects that
 * have a plan). The project itself is always counted, even while it is a draft.
 */
export function costProject(project: Project, portfolio: Project[], costs: StudioCosts = EMPTY_COSTS): CostResult | null {
  const plan = project.plan;
  if (!plan) return null;
  const months = monthsOf(plan);
  const earned = earning(project);
  const myMonthly = months.length ? earned / months.length : 0;

  const others = portfolio
    .filter((o) => o.id !== project.id && o.plan)
    .map((o) => {
      const m = monthsOf(o.plan!);
      const e = earning(o);
      return { id: o.id, name: o.name || "Untitled project", months: m, monthlyEarning: m.length ? e / m.length : 0 };
    })
    .filter((o) => o.monthlyEarning > 0 && o.months.some((m) => months.includes(m)));

  const teamMonthly = costs.staff.reduce((s, x) => s + (Number(x.monthlySalary) || 0), 0);
  const salary = salaryOf(costs);
  const visits = spread(plan.visits, months.length);

  const rows: MonthRow[] = months.map((month, i) => {
    const active = others.filter((o) => o.months.includes(month));
    const total = myMonthly + active.reduce((s, o) => s + o.monthlyEarning, 0);
    // With nothing earned yet, the project carries the month alone so the costs stay visible.
    const share = total > 0 ? myMonthly / total : 1;
    const mySalary = salary * share;
    const running = costs.otherMonthly * share;
    return {
      month,
      sharingWith: active.length,
      share,
      earned: myMonthly,
      team: teamMonthly * share,
      salary: mySalary,
      running,
      visits: visits[i],
      perVisit: visits[i] > 0 ? (mySalary + running) / visits[i] : null,
    };
  });

  const sum = (k: "team" | "salary" | "running") => Math.round(rows.reduce((s, r) => s + r[k], 0));
  const team = sum("team");
  const salaryTotal = sum("salary");
  const running = sum("running");
  const renders = Math.round((plan.renders || 0) * (plan.renderCost ?? costs.renderCost ?? 0));
  const totalVisits = visits.reduce((s, v) => s + v, 0);
  const pv = rows.map((r) => r.perVisit).filter((v): v is number => v !== null);
  return {
    earned,
    months: rows,
    team,
    salary: salaryTotal,
    running,
    renders,
    studioEarns: earned - team - salaryTotal - running - renders,
    perVisit: totalVisits ? Math.round((salaryTotal + running) / totalVisits) : null,
    perVisitRange: pv.length ? [Math.round(Math.min(...pv)), Math.round(Math.max(...pv))] : null,
    drawsSalary: salary > 0,
    others: others.map((o) => ({ id: o.id, name: o.name, months: o.months, monthlyEarning: Math.round(o.monthlyEarning) })),
  };
}

/** Projects that share costs: marked Sent or Approved, planned, and earning something. */
export function ongoingPortfolio(all: Project[]): Project[] {
  return all.filter((p) => p.plan && p.status !== "draft" && earning(p) > 0);
}

/** Why other projects aren't sharing costs — so the designer can fix it. */
export function notCounted(all: Project[], selfId: string): { drafts: number; unplanned: number } {
  const others = all.filter((p) => p.id !== selfId && !p.isSample);
  return {
    drafts: others.filter((p) => p.status === "draft").length,
    unplanned: others.filter((p) => p.status !== "draft" && !p.plan).length,
  };
}

/** What the studio earns on a project: after shared costs when planned, else quote profit. */
export function keepFor(p: Project, all: Project[], costs?: StudioCosts): { value: number; pct: number; planned: boolean } {
  if (p.plan) {
    const r = costProject(p, ongoingPortfolio(all.filter((o) => o.id !== p.id)), costs);
    if (r) return { value: r.studioEarns, pct: r.earned > 0 ? (r.studioEarns / r.earned) * 100 : 0, planned: true };
  }
  const c = calcProject(p);
  return { value: c.profit, pct: c.marginPct, planned: false };
}

/**
 * The studio's earnings for one month across all ongoing planned projects:
 * what they earn that month minus the studio's monthly costs (team, your salary
 * if fixed, running costs). Renders are one-off and left out here.
 */
export function studioMonth(all: Project[], costs: StudioCosts | undefined, month: string): { earned: number; costs: number; earns: number; projects: number } {
  const running = ongoingPortfolio(all).filter((p) => monthsOf(p.plan!).includes(month));
  const earned = Math.round(running.reduce((s, p) => s + earning(p) / monthsOf(p.plan!).length, 0));
  const c = costs ?? EMPTY_COSTS;
  const monthlyCosts = c.staff.reduce((s, x) => s + (Number(x.monthlySalary) || 0), 0) + salaryOf(c) + (c.otherMonthly || 0);
  return { earned, costs: monthlyCosts, earns: earned - monthlyCosts, projects: running.length };
}
