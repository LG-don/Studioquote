// Excel / CSV import and export. Imports are deterministic column mapping — no AI.
import * as XLSX from "xlsx";
import type { QuoteCalc } from "./calc";
import { CATEGORIES } from "./constants";
import { uid } from "./ids";
import type { Project, Rate, ScopeItem } from "./types";

type Row = (string | number | null)[];

export async function readSheets(file: File | Blob): Promise<{ name: string; rows: Row[] }[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { header: 1, blankrows: false, defval: null }),
  }));
}

/** Short CSV-like text of a workbook, used as AI context. */
export async function sheetText(file: File, maxRows = 150): Promise<string> {
  const sheets = await readSheets(file);
  return sheets
    .map((s) => `# Sheet: ${s.name}\n` + s.rows.slice(0, maxRows).map((r) => r.map((c) => (c ?? "")).join(" | ")).join("\n"))
    .join("\n\n")
    .slice(0, 20000);
}

type Col = "item" | "spec" | "qty" | "unit" | "material" | "labour" | "rate" | "category" | "room" | "brand";
const MATCHERS: [Col, RegExp][] = [
  ["material", /material/i],
  ["labour", /labou?r/i],
  ["qty", /^(qty|quantity|qnty|nos?\.?)$|quantity/i],
  ["unit", /^(unit|uom|units)$/i],
  ["rate", /rate|price|cost/i],
  ["spec", /spec|finish|make/i],
  ["brand", /brand/i],
  ["category", /category|trade|section|head/i],
  ["room", /room|area|location|space/i],
  ["item", /item|description|particular|work|name/i],
];

export interface Mapping {
  headerRow: number;
  cols: Partial<Record<Col, number>>;
}

/** Finds the header row (first row with ≥2 recognised headers) and maps columns. */
export function detectColumns(rows: Row[]): Mapping | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cols: Partial<Record<Col, number>> = {};
    rows[r].forEach((cell, ci) => {
      const h = String(cell ?? "").trim();
      if (!h || /amount|total|sr\.?|s\.?no/i.test(h)) return;
      for (const [col, re] of MATCHERS) {
        if (cols[col] === undefined && re.test(h)) {
          cols[col] = ci;
          break;
        }
      }
    });
    if (cols.item !== undefined && Object.keys(cols).length >= 2) return { headerRow: r, cols };
  }
  return null;
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[₹,\s]|rs\.?/gi, ""));
  return isFinite(n) ? n : null;
};

const guessCategory = (text: string): string => {
  const t = text.toLowerCase();
  const rules: [RegExp, string][] = [
    [/kitchen|counter|backsplash/, "Modular kitchen"],
    [/wardrobe|loft/, "Wardrobes"],
    [/ceiling|gypsum|pop/, "False ceiling"],
    [/tile|marble|floor|skirting|granite/, "Flooring"],
    [/paint|putty|polish|texture/, "Painting and polishing"],
    [/wire|wiring|switch|point|mcb|electric/, "Electrical"],
    [/plumb|cp fitting|sanitary|pipe/, "Plumbing"],
    [/light|led|lamp|pendant/, "Lighting"],
    [/curtain|blind|cushion|rug/, "Soft furnishings"],
    [/wallpaper|panel|cladding/, "Wall treatments"],
    [/demoli|dismantl|brick|plaster|waterproof|civil/, "Civil and demolition"],
    [/upholster|fabric/, "Upholstery"],
    [/bed|table|unit|cabinet|desk|rack|vanity/, "Custom furniture"],
  ];
  return rules.find(([re]) => re.test(t))?.[1] ?? "Site & general";
};

export function rowsToItems(rows: Row[], m: Mapping, defaultRoom: string): ScopeItem[] {
  const items: ScopeItem[] = [];
  let currentCategory = "";
  for (const row of rows.slice(m.headerRow + 1)) {
    const get = (c: Col) => (m.cols[c] !== undefined ? row[m.cols[c]!] : null);
    const name = String(get("item") ?? "").trim();
    if (!name) continue;
    const qty = toNum(get("qty"));
    const mat = toNum(get("material"));
    const lab = toNum(get("labour"));
    const rate = toNum(get("rate"));
    // A row with only a name and no numbers is treated as a section heading.
    if (qty === null && mat === null && lab === null && rate === null) {
      const matched = CATEGORIES.find((c) => c.toLowerCase() === name.toLowerCase());
      currentCategory = matched ?? (name.length < 40 ? name : currentCategory);
      continue;
    }
    const category = String(get("category") ?? "").trim() || currentCategory || guessCategory(name);
    items.push({
      id: uid("it"),
      room: String(get("room") ?? "").trim() || defaultRoom,
      category,
      item: name,
      specification: String(get("spec") ?? "").trim(),
      brand: String(get("brand") ?? "").trim(),
      included: "",
      excluded: "",
      installation: "",
      assumptions: "",
      dependencies: "",
      qty,
      unit: String(get("unit") ?? "").trim() || "nos",
      // If the sheet only has a single "rate" column, treat it as material cost and flag it.
      materialRate: mat ?? (lab === null ? rate : null),
      labourRate: lab,
      source: "import",
      missing: mat === null && lab === null && rate !== null ? ["Imported single rate — check if it is your cost or the client price"] : [],
    });
  }
  return items;
}

export function rowsToRates(rows: Row[], m: Mapping): Rate[] {
  const out: Rate[] = [];
  for (const row of rows.slice(m.headerRow + 1)) {
    const get = (c: Col) => (m.cols[c] !== undefined ? row[m.cols[c]!] : null);
    const name = String(get("item") ?? "").trim();
    if (!name) continue;
    const mat = toNum(get("material"));
    const lab = toNum(get("labour"));
    const rate = toNum(get("rate"));
    if (mat === null && lab === null && rate === null) continue;
    out.push({
      id: uid("r"),
      category: String(get("category") ?? "").trim() || guessCategory(name),
      name,
      specification: String(get("spec") ?? "").trim(),
      unit: String(get("unit") ?? "").trim() || "nos",
      materialRate: mat ?? (lab === null ? rate ?? 0 : 0),
      labourRate: lab ?? 0,
      notes: "Imported",
      isSample: false,
    });
  }
  return out;
}

// ---------------------------------------------------------------- Export

export function exportProjectWorkbook(p: Project, calc: QuoteCalc) {
  const wb = XLSX.utils.book_new();

  const client: (string | number)[][] = [
    [p.name], [`Client: ${p.clientName}`], [`Quotation: ${p.quoteNumber}`], [],
    ["Sr.", "Room", "Category", "Item", "Specification", "Brand / finish", "Qty", "Unit", "Rate (₹)", "Amount (₹)"],
  ];
  p.items.filter((it) => !calc.lines[it.id].excluded).forEach((it, i) => {
    const l = calc.lines[it.id];
    client.push([i + 1, it.room, it.category, it.item, it.specification, it.brand, it.qty ?? "", it.unit, l.clientRate, l.clientAmount]);
  });
  client.push([]);
  client.push(["", "", "", "", "", "", "", "", "Subtotal", calc.clientSubtotal]);
  if (calc.contingencyAmount) client.push(["", "", "", "", "", "", "", "", `Contingency (${p.quote.contingencyPct}%)`, calc.contingencyAmount]);
  if (calc.discountAmount) client.push(["", "", "", "", "", "", "", "", "Discount", -calc.discountAmount]);
  client.push(["", "", "", "", "", "", "", "", "Taxable value", calc.taxable]);
  calc.taxLines.forEach((t) => client.push(["", "", "", "", "", "", "", "", t.label, t.amount]));
  if (calc.roundOff) client.push(["", "", "", "", "", "", "", "", "Round off", calc.roundOff]);
  client.push(["", "", "", "", "", "", "", "", "Grand total", calc.grandTotal]);
  const ws1 = XLSX.utils.aoa_to_sheet(client);
  ws1["!cols"] = [{ wch: 5 }, { wch: 16 }, { wch: 18 }, { wch: 36 }, { wch: 44 }, { wch: 22 }, { wch: 8 }, { wch: 7 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Client BOQ");

  const internal: (string | number)[][] = [
    ["INTERNAL — do not share with client"], [],
    ["Room", "Category", "Item", "Qty", "Unit", "Material rate", "Labour rate", "Cost rate", "Cost amount", "Client rate", "Client amount"],
  ];
  p.items.forEach((it) => {
    const l = calc.lines[it.id];
    internal.push([it.room, it.category, it.item, it.qty ?? "", it.unit, it.materialRate ?? "", it.labourRate ?? "", l.costRate, l.costAmount, l.clientRate, l.clientAmount]);
  });
  internal.push([]);
  internal.push(["Material total", calc.materialTotal]);
  internal.push(["Labour total", calc.labourTotal]);
  internal.push(["Cost subtotal", calc.costSubtotal]);
  internal.push([`Overhead allowance (${p.quote.overheadPct}%)`, calc.overheadAmount]);
  internal.push([`Contingency buffer (${p.quote.contingencyPct}%)`, calc.contingencyBuffer]);
  internal.push(["Discount", calc.discountAmount]);
  internal.push(["Client pays (excl. GST)", calc.taxable]);
  internal.push(["Your profit", calc.profit]);
  internal.push(["Margin %", Number(calc.marginPct.toFixed(2))]);
  const ws2 = XLSX.utils.aoa_to_sheet(internal);
  ws2["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 36 }, { wch: 8 }, { wch: 7 }, { wch: 13 }, { wch: 13 }, { wch: 11 }, { wch: 13 }, { wch: 11 }, { wch: 13 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Internal costing");

  XLSX.writeFile(wb, `${(p.quoteNumber || "quote").replace(/\W+/g, "-")}-${(p.name || "project").replace(/\W+/g, "-")}.xlsx`);
}

export function exportRates(rates: Rate[]) {
  const rows = [["Category", "Item", "Specification", "Unit", "Material rate", "Labour rate", "Notes"]];
  rates.forEach((r) => rows.push([r.category, r.name, r.specification, r.unit, String(r.materialRate), String(r.labourRate), r.notes]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Rates");
  XLSX.writeFile(wb, "rate-library.xlsx");
}

/**
 * Rows copied from Excel / Google Sheets arrive as tab-separated text.
 * With a header row, columns are matched by heading; without one, the order
 * Item · Qty · Unit · Material rate · Labour rate is assumed.
 */
export function parsePasted(text: string, defaultRoom: string): ScopeItem[] {
  const rows: Row[] = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => l.split("\t").map((c) => (c.trim() === "" ? null : c.trim())));
  if (!rows.length) return [];
  const detected = detectColumns(rows);
  if (detected) return rowsToItems(rows, detected, defaultRoom);
  const fallback: Mapping = { headerRow: -1, cols: { item: 0, qty: 1, unit: 2, material: 3, labour: 4 } };
  return rowsToItems(rows, fallback, defaultRoom);
}
