import { describe, expect, it } from "vitest";
import { calcQuote } from "./calc";
import { newProject, sampleProject, sampleSettings } from "./defaults";
import { detectColumns, parsePasted, rowsToItems } from "./excel";
import { applyRoomSizes, quantityFor } from "./measure";
import { SAMPLE_RATES } from "./sampleRates";
import { runScopeGuard } from "./scopeguard";
import { generateFromTemplates } from "./templates";

const settings = sampleSettings();

describe("templates", () => {
  it("never invents quantities", () => {
    const items = generateFromTemplates(["Kitchen", "Master Bedroom", "Bathroom 1"], SAMPLE_RATES);
    expect(items.length).toBeGreaterThan(20);
    expect(items.every((i) => i.qty === null)).toBe(true);
    expect(items.every((i) => i.rateId)).toBe(true);
  });
});

describe("ScopeGuard", () => {
  it("sample project has no blockers", () => {
    const p = sampleProject(settings);
    const f = runScopeGuard(p, calcQuote(p.items, p.quote), SAMPLE_RATES);
    expect(f.filter((x) => x.severity === "blocker")).toEqual([]);
  });

  it("flags missing quantities, payment totals and transport", () => {
    const p = newProject(settings, { clientName: "", items: generateFromTemplates(["Kitchen"], SAMPLE_RATES, false) });
    p.payment = [{ id: "a", label: "Advance", pct: 50 }];
    const f = runScopeGuard(p, calcQuote(p.items, p.quote), SAMPLE_RATES);
    const titles = f.map((x) => x.title);
    expect(titles).toContain("Client name missing");
    expect(titles.some((t) => /lines have no quantity|Quantity missing/.test(t))).toBe(true);
    expect(titles).toContain("Payment milestones add up to 50%");
    expect(titles).toContain("Transportation charges missing");
  });

  it("flags rates far below the library", () => {
    const p = sampleProject(settings);
    p.items[0] = { ...p.items[0], materialRate: 1, labourRate: 1 };
    const f = runScopeGuard(p, calcQuote(p.items, p.quote), SAMPLE_RATES);
    expect(f.some((x) => x.title === "Rate well below your library")).toBe(true);
  });
});

describe("Excel import", () => {
  it("maps common BOQ headings and section rows", () => {
    const rows = [
      ["Interior BOQ"],
      ["Sr. No", "Description", "Unit", "Qty", "Material Rate", "Labour Rate", "Amount"],
      [null, "False Ceiling", null, null, null, null, null],
      [1, "Gypsum ceiling plain", "sq.ft", 120, 70, 35, 12600],
      [2, "Cove ceiling", "sq.ft", "80", "95", "45", null],
    ];
    const m = detectColumns(rows)!;
    expect(m.headerRow).toBe(1);
    const items = rowsToItems(rows, m, "Living");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ item: "Gypsum ceiling plain", qty: 120, materialRate: 70, labourRate: 35, category: "False ceiling", room: "Living" });
    expect(items[1].qty).toBe(80);
  });
});

describe("paste from Excel", () => {
  it("parses rows without a header", () => {
    const items = parsePasted("Wardrobe\t42\tsq.ft\t1100\t260\nLoft\t14\tsq.ft\t700\t170\n", "Bedroom 2");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ item: "Wardrobe", qty: 42, unit: "sq.ft", materialRate: 1100, labourRate: 260, room: "Bedroom 2" });
  });
  it("uses headings when present", () => {
    const items = parsePasted("Description\tUnit\tQty\tRate\nTV unit\tr.ft\t8\t5100", "Living");
    expect(items[0]).toMatchObject({ item: "TV unit", qty: 8, unit: "r.ft", materialRate: 5100 });
  });
});

describe("room measurements", () => {
  const size = { l: 12, w: 10, h: 10 };
  it("computes each basis from the entered size", () => {
    expect(quantityFor(size, "floor")).toBe(120);
    expect(quantityFor(size, "perimeter")).toBe(44);
    expect(quantityFor(size, "walls")).toBe(440);
    expect(quantityFor({ l: 12, w: 10, h: null }, "walls")).toBeNull();
  });
  it("only updates lines that are linked to measurements", () => {
    const items = generateFromTemplates(["Living"], SAMPLE_RATES, false);
    const out = applyRoomSizes(items, { Living: size });
    const floor = out.find((i) => i.rateId === "r-fl-vitrified")!;
    const tv = out.find((i) => i.rateId === "r-cf-tv")!;
    expect(floor.qty).toBe(120);
    expect(tv.qty).toBeNull();
    const manual = applyRoomSizes([{ ...floor, qty: 99, qtyAuto: false }], { Living: size });
    expect(manual[0].qty).toBe(99);
  });
});

describe("ScopeGuard and engagement", () => {
  it("design-only quotes need a design fee and skip execution checks", () => {
    const p = newProject(settings, { clientName: "X", engagement: "design_only", items: [] });
    const titles = runScopeGuard(p, calcQuote(p.items, p.quote), SAMPLE_RATES).map((f) => f.title);
    expect(titles).toContain("No design fee lines");
    expect(titles).not.toContain("Transportation charges missing");
  });
  it("ignores missing quantities on vendor-handled lines", () => {
    const items = generateFromTemplates(["Kitchen"], SAMPLE_RATES, false).filter((i) => i.category === "Modular kitchen");
    const p = newProject(settings, { clientName: "X", engagement: "mixed", delegated: { "Modular kitchen": { vendor: "Acme" } }, items });
    const f = runScopeGuard(p, calcQuote(p.items, p.quote, new Set(["Modular kitchen"])), SAMPLE_RATES);
    expect(f.some((x) => /quantity/i.test(x.title))).toBe(false);
  });
});

describe("room suggestions", () => {
  it("does not suggest extra bedroom types once bedrooms are counted", async () => {
    const { roomSuggestions } = await import("./constants");
    const s = roomSuggestions("Apartment", 4, 4, 5);
    expect(s).toContain("Bedroom 4");
    expect(s).toContain("Balcony 5");
    expect(s).not.toContain("Kids Bedroom");
    expect(s).not.toContain("Guest Bedroom");
    expect(s).not.toContain("Study");
    expect(roomSuggestions("Apartment", null, null, null)).toContain("Kids Bedroom");
  });
});
