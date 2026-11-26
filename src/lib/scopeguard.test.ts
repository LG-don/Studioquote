import { describe, expect, it } from "vitest";
import { calcQuote } from "./calc";
import { newProject, sampleProject, sampleSettings } from "./defaults";
import { detectColumns, rowsToItems } from "./excel";
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
