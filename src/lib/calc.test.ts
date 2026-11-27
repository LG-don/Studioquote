import { describe, expect, it } from "vitest";
import { calcProject, calcQuote, milestoneAmounts, roundClientRate } from "./calc";
import { amountInWords, indianWords, rupees } from "./format";
import type { QuoteSettings, ScopeItem } from "./types";

const base: QuoteSettings = {
  overheadPct: 10,
  profitPct: 15,
  contingencyPct: 5,
  showContingency: true,
  discountType: "pct",
  discountValue: 0,
  gstMode: "cgst_sgst",
  gstRatePct: 18,
  categoryGst: {},
  validityDays: 15,
};

function item(p: Partial<ScopeItem>): ScopeItem {
  return {
    id: Math.random().toString(36).slice(2),
    room: "Living",
    category: "Flooring",
    item: "x",
    specification: "",
    brand: "",
    included: "",
    excluded: "",
    installation: "",
    assumptions: "",
    dependencies: "",
    qty: 100,
    unit: "sq.ft",
    materialRate: 100,
    labourRate: 50,
    source: "manual",
    missing: [],
    ...p,
  };
}

describe("calcQuote", () => {
  it("loads overhead and profit into client rate", () => {
    const it1 = item({});
    const r = calcQuote([it1], base);
    // 150 × 1.10 × 1.15 = 189.75 → 190
    expect(r.lines[it1.id].clientRate).toBe(190);
    expect(r.lines[it1.id].clientAmount).toBe(19000);
    expect(r.costSubtotal).toBe(15000);
    expect(r.clientSubtotal).toBe(19000);
    expect(r.contingencyAmount).toBe(950);
    expect(r.taxable).toBe(19950);
    // 18% split 9/9
    expect(r.taxLines.map((t) => t.amount)).toEqual([1795.5, 1795.5]);
    expect(r.grandTotal).toBe(Math.round(19950 + 3591));
  });

  it("folds contingency into rates when hidden", () => {
    const it1 = item({});
    const r = calcQuote([it1], { ...base, showContingency: false });
    // 150 × 1.1 × 1.15 × 1.05 = 199.2375 → 199
    expect(r.lines[it1.id].clientRate).toBe(199);
    expect(r.contingencyAmount).toBe(0);
    expect(r.contingencyBuffer).toBeGreaterThan(0);
  });

  it("applies discount before GST and reduces profit", () => {
    const it1 = item({});
    const noDisc = calcQuote([it1], base);
    const disc = calcQuote([it1], { ...base, discountValue: 10 });
    expect(disc.discountAmount).toBe(1995);
    expect(disc.taxable).toBe(19950 - 1995);
    expect(disc.profit).toBeCloseTo(noDisc.profit - 1995, 2);
  });

  it("caps fixed discount at subtotal", () => {
    const r = calcQuote([item({})], { ...base, discountType: "amount", discountValue: 1e9 });
    expect(r.taxable).toBe(0);
    expect(r.taxTotal).toBe(0);
  });

  it("uses IGST for inter-state", () => {
    const r = calcQuote([item({})], { ...base, gstMode: "igst" });
    expect(r.taxLines).toHaveLength(1);
    expect(r.taxLines[0].label).toBe("IGST @ 18%");
    expect(r.taxLines[0].amount).toBe(3591);
  });

  it("respects per-category GST overrides", () => {
    const a = item({ category: "Flooring" });
    const b = item({ category: "Soft furnishings" });
    const r = calcQuote([a, b], { ...base, showContingency: false, gstMode: "igst", categoryGst: { "Soft furnishings": 12 } });
    expect(r.taxLines.map((t) => t.ratePct)).toEqual([18, 12]);
    const sumBase = r.taxLines.reduce((s, t) => s + t.base, 0);
    expect(sumBase).toBeCloseTo(r.taxable, 1);
  });

  it("no GST when mode is none", () => {
    const r = calcQuote([item({})], { ...base, gstMode: "none" });
    expect(r.taxTotal).toBe(0);
    expect(r.grandTotal).toBe(r.taxable);
  });

  it("treats missing qty or rates as incomplete and zero", () => {
    const a = item({ qty: null });
    const b = item({ materialRate: null, labourRate: null });
    const r = calcQuote([a, b], base);
    expect(r.incompleteCount).toBe(2);
    expect(r.clientSubtotal).toBe(0);
  });

  it("profit equals taxable minus cost, overhead and contingency", () => {
    const r = calcQuote([item({ qty: 1234.5, materialRate: 812, labourRate: 133 })], base);
    expect(r.profit).toBeCloseTo(r.taxable - r.costSubtotal - r.overheadAmount - r.contingencyBuffer, 2);
    expect(r.profit).toBeGreaterThan(0);
  });

  it("grand total rounding is reported", () => {
    const r = calcQuote([item({ qty: 3, materialRate: 33.33, labourRate: 0 })], base);
    expect(Number.isInteger(r.grandTotal)).toBe(true);
    expect(Math.abs(r.roundOff)).toBeLessThanOrEqual(0.5);
  });
});

describe("helpers", () => {
  it("rounds client rates", () => {
    expect(roundClientRate(189.75)).toBe(190);
    expect(roundClientRate(45.678)).toBe(45.68);
  });
  it("splits milestones exactly", () => {
    const a = milestoneAmounts(100001, [
      { id: "1", label: "a", pct: 33.33 },
      { id: "2", label: "b", pct: 33.33 },
      { id: "3", label: "c", pct: 33.34 },
    ]);
    expect(a.reduce((s, x) => s + x, 0)).toBe(100001);
  });
  it("formats Indian numbers and words", () => {
    expect(rupees(1245000)).toBe("₹12,45,000");
    expect(indianWords(1245000)).toBe("Twelve Lakh Forty-Five Thousand");
    expect(indianWords(10150099)).toBe("One Crore One Lakh Fifty Thousand Ninety-Nine");
    expect(amountInWords(512)).toBe("Rupees Five Hundred Twelve Only");
  });
});

describe("engagement types", () => {
  it("prices design fees as entered, with no markup and no cost", () => {
    const fee = item({ category: "Design services", qty: 1450, materialRate: 0, labourRate: 150 });
    const r = calcQuote([fee], { ...base, showContingency: false, gstMode: "none" });
    expect(r.lines[fee.id].clientRate).toBe(150);
    expect(r.clientSubtotal).toBe(217500);
    expect(r.costSubtotal).toBe(0);
    expect(r.profit).toBe(217500);
  });
  it("leaves vendor-handled categories out of every total", () => {
    const own = item({ category: "Flooring" });
    const vendor = item({ category: "Modular kitchen", qty: null });
    const mixed = calcProject({ items: [own, vendor], quote: base, engagement: "mixed", delegated: { "Modular kitchen": { vendor: "Acme Kitchens" } } });
    const solo = calcQuote([own], base);
    expect(mixed.grandTotal).toBe(solo.grandTotal);
    expect(mixed.lines[vendor.id].excluded).toBe(true);
    expect(mixed.incompleteCount).toBe(0);
    // Delegations only count in a mixed engagement
    const turnkey = calcProject({ items: [own, vendor], quote: base, engagement: "turnkey", delegated: { "Modular kitchen": { vendor: "" } } });
    expect(turnkey.incompleteCount).toBe(1);
  });
});
