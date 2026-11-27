import { describe, expect, it } from "vitest";
import { costProject, monthsOf, spread } from "./costing";
import { newProject, sampleSettings } from "./defaults";
import type { Project, ScopeItem, StudioCosts } from "./types";

const settings = sampleSettings();

function feeProject(name: string, fee: number, startMonth: string, months: number, visits = 0): Project {
  const line: ScopeItem = {
    id: `fee-${name}`, room: "Design services", category: "Design services", item: "Design fee", specification: "", brand: "",
    included: "", excluded: "", installation: "", assumptions: "", dependencies: "",
    qty: 1, unit: "lot", materialRate: 0, labourRate: fee, source: "manual", missing: [],
  };
  const p = newProject(settings, { name, engagement: "design_only", items: [line], status: "approved", plan: { startMonth, months, visits, renders: 0, renderCost: null } });
  p.quote = { ...p.quote, gstMode: "none", contingencyPct: 0, discountValue: 0 };
  return p;
}

const costs: StudioCosts = { ownMonthlyPay: 0, staff: [{ id: "s1", role: "Junior designer", monthlySalary: 25000 }], otherMonthly: 0, renderCost: 1500 };

describe("internal costing", () => {
  it("splits a salary between projects by monthly earnings (user's example)", () => {
    const a = feeProject("A", 300000, "2027-01", 6);
    const b = feeProject("B", 300000, "2027-01", 6);
    const r = costProject(a, [a, b], costs)!;
    expect(r.months).toHaveLength(6);
    expect(r.months[0].share).toBeCloseTo(0.5);
    expect(r.months[0].staff).toBeCloseTo(12500);
    expect(r.staff).toBe(75000);
    expect(r.keep).toBe(300000 - 75000);
  });

  it("shifts the share month by month as projects start and finish", () => {
    const a = feeProject("A", 600000, "2027-01", 6); // ₹1L / month
    const b = feeProject("B", 300000, "2027-01", 3); // ₹1L / month, Jan–Mar only
    const r = costProject(a, [a, b], costs)!;
    expect(r.months[0].share).toBeCloseTo(0.5); // Jan: shared with B
    expect(r.months[3].share).toBeCloseTo(1); // Apr: alone
    expect(r.months[0].sharingWith).toBe(1);
    expect(r.months[3].sharingWith).toBe(0);
  });

  it("prices a visit from your pay and running costs, so busy months make visits cheaper", () => {
    const withPay = { ...costs, ownMonthlyPay: 100000, otherMonthly: 20000 };
    const a = feeProject("A", 600000, "2027-01", 6, 30);
    const b = feeProject("B", 300000, "2027-01", 3);
    const r = costProject(a, [a, b], withPay)!;
    expect(r.months[0].visits).toBe(5);
    expect(r.months[0].perVisit).toBeCloseTo((120000 * 0.5) / 5); // ₹12,000 in a shared month
    expect(r.months[3].perVisit).toBeCloseTo(120000 / 5); // ₹24,000 when alone
  });

  it("counts renders at the studio's fixed cost", () => {
    const a = feeProject("A", 300000, "2027-01", 3);
    a.plan!.renders = 12;
    expect(costProject(a, [a], costs)!.renders).toBe(18000);
  });

  it("helpers", () => {
    expect(spread(30, 4)).toEqual([8, 8, 7, 7]);
    expect(monthsOf({ startMonth: "2026-11", months: 3, visits: 0, renders: 0, renderCost: null })).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});
