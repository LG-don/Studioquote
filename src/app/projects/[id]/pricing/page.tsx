"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Download, FileSpreadsheet, Link2, Trash2, Upload } from "lucide-react";
import { calcQuote, type QuoteCalc } from "@/lib/calc";
import { UNITS } from "@/lib/constants";
import { useData, useProject } from "@/lib/data";
import { detectColumns, exportProjectWorkbook, readSheets, rowsToItems, type Mapping } from "@/lib/excel";
import { num, rupees } from "@/lib/format";
import type { GstMode, QuoteSettings, Rate, ScopeItem } from "@/lib/types";
import { RatePicker } from "@/components/RatePicker";
import { Button, Card, cx, Field, LinkButton, Modal, NumberInput, Select, SectionTitle } from "@/components/ui";

export default function PricingPage() {
  const { project, update } = useProject();
  const { rates, settings } = useData();
  const [groupBy, setGroupBy] = useState<"room" | "category">("room");
  const [picker, setPicker] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const calc = useMemo(() => calcQuote(project.items, project.quote), [project.items, project.quote]);

  const setItem = (id: string, patch: Partial<ScopeItem>) =>
    update((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const setQuote = (patch: Partial<QuoteSettings>) => update((p) => ({ ...p, quote: { ...p.quote, ...patch } }));

  const groups = useMemo(() => {
    const keyOf = (i: ScopeItem) => (groupBy === "room" ? i.room : i.category);
    const order: string[] = [];
    const map = new Map<string, ScopeItem[]>();
    for (const it of project.items) {
      const k = keyOf(it);
      if (!map.has(k)) {
        map.set(k, []);
        order.push(k);
      }
      map.get(k)!.push(it);
    }
    return order.map((k) => ({ key: k, items: map.get(k)! }));
  }, [project.items, groupBy]);

  const applyRate = (id: string, r: Rate) => {
    setItem(id, { rateId: r.id, materialRate: r.materialRate, labourRate: r.labourRate, unit: r.unit });
    setPicker(null);
  };

  const sameState = project.clientState && settings?.state ? project.clientState === settings.state : true;
  const categories = [...new Set(project.items.map((i) => i.category))];

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Pricing</h2>
          <p className="text-sm text-ink-3">
            Enter quantities and your cost rates. Client rates include your overheads and profit and are calculated for you.
            {calc.incompleteCount > 0 && <span className="text-amber-700"> {calc.incompleteCount} line{calc.incompleteCount === 1 ? "" : "s"} still need a quantity or rate.</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-md border border-line-2 bg-white p-0.5 text-[13px]">
            {(["room", "category"] as const).map((g) => (
              <button key={g} onClick={() => setGroupBy(g)} className={cx("rounded px-2.5 py-1", groupBy === g ? "bg-ink text-white" : "text-ink-2 hover:bg-hover")}>
                By {g}
              </button>
            ))}
          </div>
          <Button onClick={() => setImportOpen(true)}>
            <Upload size={14} /> Import BOQ
          </Button>
          <Button onClick={() => exportProjectWorkbook(project, calc)} disabled={!project.items.length}>
            <Download size={14} /> Excel
          </Button>
        </div>
      </div>

      {project.items.length === 0 ? (
        <Card className="px-6 py-10 text-center text-sm text-ink-3">
          No items yet. Draft a scope on the Scope tab, or import an existing BOQ from Excel.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[960px] border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-line text-left text-xs text-ink-3">
                <th className="py-2.5 pl-4 pr-2 font-medium">Item</th>
                <th className="w-[84px] px-1 text-right font-medium">Qty</th>
                <th className="w-[72px] px-1 font-medium">Unit</th>
                <th className="w-[96px] px-1 text-right font-medium">Material ₹</th>
                <th className="w-[90px] px-1 text-right font-medium">Labour ₹</th>
                <th className="w-[84px] px-2 text-right font-medium">Cost rate</th>
                <th className="w-[92px] bg-accent-soft/50 px-2 text-right font-medium text-accent">Client rate</th>
                <th className="w-[110px] bg-accent-soft/50 px-3 text-right font-medium text-accent">Amount</th>
                <th className="w-[60px]" />
              </tr>
            </thead>
            {groups.map((g) => {
              const sub = g.items.reduce((s, i) => s + calc.lines[i.id].clientAmount, 0);
              const cost = g.items.reduce((s, i) => s + calc.lines[i.id].costAmount, 0);
              return (
                <tbody key={g.key}>
                  <tr className="border-b border-line bg-canvas">
                    <td colSpan={5} className="py-2 pl-4 text-xs font-semibold uppercase tracking-wide text-ink-2">
                      {g.key} <span className="ml-1 font-normal normal-case tracking-normal text-ink-3">{g.items.length} items</span>
                    </td>
                    <td className="tabular px-2 text-right text-xs text-ink-3">{rupees(cost)}</td>
                    <td className="bg-accent-soft/30" />
                    <td className="tabular bg-accent-soft/30 px-3 text-right font-semibold">{rupees(sub)}</td>
                    <td />
                  </tr>
                  {g.items.map((it) => {
                    const l = calc.lines[it.id];
                    const lib = it.rateId ? rates.find((r) => r.id === it.rateId) : undefined;
                    const changed = lib && (lib.materialRate !== it.materialRate || lib.labourRate !== it.labourRate);
                    return (
                      <tr key={it.id} className="group border-b border-line last:border-0 hover:bg-canvas/70">
                        <td className="py-1.5 pl-4 pr-2 align-top">
                          <div className="font-medium leading-5">{it.item || <span className="text-ink-3">Untitled item</span>}</div>
                          <div className="truncate text-xs text-ink-3" style={{ maxWidth: 380 }} title={it.specification}>
                            {groupBy === "category" ? `${it.room} · ` : ""}
                            {it.specification || "—"}
                            {it.brand && ` · ${it.brand}`}
                          </div>
                        </td>
                        <td className="px-1 py-1.5 align-top">
                          <NumberInput
                            value={it.qty}
                            onChange={(v) => setItem(it.id, { qty: v })}
                            className={cx("cell-input num", (it.qty === null || it.qty <= 0) && "empty")}
                            placeholder="—"
                            aria-label="Quantity"
                          />
                        </td>
                        <td className="px-1 py-1.5 align-top">
                          <input
                            list="units"
                            value={it.unit}
                            onChange={(e) => setItem(it.id, { unit: e.target.value })}
                            className="cell-input"
                            aria-label="Unit"
                          />
                        </td>
                        <td className="px-1 py-1.5 align-top">
                          <NumberInput
                            value={it.materialRate}
                            onChange={(v) => setItem(it.id, { materialRate: v })}
                            className={cx("cell-input num", it.materialRate === null && it.labourRate === null && "empty")}
                            placeholder="—"
                            aria-label="Material rate"
                          />
                        </td>
                        <td className="px-1 py-1.5 align-top">
                          <NumberInput
                            value={it.labourRate}
                            onChange={(v) => setItem(it.id, { labourRate: v })}
                            className={cx("cell-input num", it.materialRate === null && it.labourRate === null && "empty")}
                            placeholder="—"
                            aria-label="Labour rate"
                          />
                        </td>
                        <td className="tabular px-2 py-2 text-right align-top text-ink-2">{l.costRate ? num(l.costRate) : "—"}</td>
                        <td className="tabular bg-accent-soft/20 px-2 py-2 text-right align-top">{l.clientRate ? num(l.clientRate) : "—"}</td>
                        <td className="tabular bg-accent-soft/20 px-3 py-2 text-right align-top font-medium">{l.clientAmount ? rupees(l.clientAmount) : "—"}</td>
                        <td className="relative px-1 py-1.5 text-right align-top">
                          <div className="flex justify-end gap-0.5">
                            <button
                              onClick={() => setPicker(picker === it.id ? null : it.id)}
                              className={cx("rounded p-1 hover:bg-hover", lib ? (changed ? "text-amber-600" : "text-accent") : "text-ink-3")}
                              title={lib ? (changed ? `Linked to "${lib.name}" — rates edited for this project` : `Linked to "${lib.name}"`) : "Pick rate from library"}
                            >
                              <Link2 size={13} />
                            </button>
                            <button
                              onClick={() => update((p) => ({ ...p, items: p.items.filter((x) => x.id !== it.id) }))}
                              className="rounded p-1 text-ink-3 opacity-0 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
                              title="Delete line"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          {picker === it.id && (
                            <div className="absolute right-0 top-8 text-left">
                              <RatePicker rates={rates} initialQuery={it.item.split(" ").slice(0, 2).join(" ")} onPick={(r) => applyRate(it.id, r)} onClose={() => setPicker(null)} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
          <datalist id="units">
            {UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
      )}

      <div className="mt-6 grid grid-cols-[1fr_1fr_1.1fr] gap-4">
        <Card className="p-4">
          <SectionTitle>Markup</SectionTitle>
          <div className="space-y-3">
            <PctField label="Overheads" hint="Office, staff, design time" value={project.quote.overheadPct} onChange={(v) => setQuote({ overheadPct: v })} />
            <PctField label="Profit" value={project.quote.profitPct} onChange={(v) => setQuote({ profitPct: v })} />
            <PctField label="Contingency" hint="Buffer for surprises on site" value={project.quote.contingencyPct} onChange={(v) => setQuote({ contingencyPct: v })} />
            <label className="flex items-center gap-2 text-[13px] text-ink-2">
              <input
                type="checkbox"
                checked={project.quote.showContingency}
                onChange={(e) => setQuote({ showContingency: e.target.checked })}
                className="accent-[var(--color-ink)]"
              />
              Show contingency as a separate line to the client
            </label>
            <p className="text-xs text-ink-3">Overheads and profit are built into client rates and never shown on the proposal.</p>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle>Discount & tax</SectionTitle>
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <Field label="Discount" className="flex-1">
                <NumberInput
                  value={project.quote.discountValue}
                  allowNull={false}
                  onChange={(v) => setQuote({ discountValue: Math.max(0, v ?? 0) })}
                  className="h-9 w-full rounded-md border border-line-2 bg-white px-3 text-right text-sm outline-none focus:border-accent"
                />
              </Field>
              <Select value={project.quote.discountType} onChange={(e) => setQuote({ discountType: e.target.value as "pct" | "amount" })} className="w-20">
                <option value="pct">%</option>
                <option value="amount">₹</option>
              </Select>
            </div>
            <Field label="GST treatment" hint={settings?.gstin ? `Studio in ${settings.state} · client in ${project.clientState || "—"}${sameState ? " (same state)" : " (inter-state)"}` : "No GSTIN in Settings — confirm whether GST applies."}>
              <Select value={project.quote.gstMode} onChange={(e) => setQuote({ gstMode: e.target.value as GstMode })}>
                <option value="none">No GST</option>
                <option value="cgst_sgst">CGST + SGST (same state)</option>
                <option value="igst">IGST (inter-state)</option>
              </Select>
            </Field>
            {project.quote.gstMode !== "none" && (
              <>
                <PctField label="Default GST rate" value={project.quote.gstRatePct} onChange={(v) => setQuote({ gstRatePct: v })} />
                <details className="text-[13px]">
                  <summary className="cursor-pointer text-ink-2">Different rate for some categories</summary>
                  <div className="mt-2 space-y-1.5">
                    {categories.map((c) => (
                      <div key={c} className="flex items-center justify-between gap-2">
                        <span className="truncate text-ink-2">{c}</span>
                        <NumberInput
                          value={project.quote.categoryGst[c] ?? null}
                          placeholder={String(project.quote.gstRatePct)}
                          onChange={(v) => {
                            const next = { ...project.quote.categoryGst };
                            if (v === null) delete next[c];
                            else next[c] = v;
                            setQuote({ categoryGst: next });
                          }}
                          className="h-7 w-16 rounded border border-line-2 px-2 text-right text-[13px] outline-none focus:border-accent"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-ink-3">Leave blank to use the default rate. Check applicable rates with your CA.</p>
                  </div>
                </details>
              </>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <ClientSummary calc={calc} q={project.quote} />
          <ProfitPanel calc={calc} q={project.quote} budget={project.budget} />
        </div>
      </div>

      <div className="mt-8 flex justify-end border-t border-line pt-5">
        <LinkButton href={`/projects/${project.id}/proposal`} variant="primary">
          Next: check & proposal <ArrowRight size={15} />
        </LinkButton>
      </div>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(items) => {
          update((p) => ({ ...p, items: [...p.items, ...items], rooms: [...new Set([...p.rooms, ...items.map((i) => i.room)])] }));
          setImportOpen(false);
        }}
      />
    </div>
  );
}

function PctField({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[13px] text-ink-2">{label}</div>
        {hint && <div className="text-xs text-ink-3">{hint}</div>}
      </div>
      <div className="flex items-center gap-1">
        <NumberInput
          value={value}
          allowNull={false}
          onChange={(v) => onChange(Math.max(0, Math.min(500, v ?? 0)))}
          className="h-8 w-16 rounded-md border border-line-2 bg-white px-2 text-right text-sm outline-none focus:border-accent"
        />
        <span className="text-sm text-ink-3">%</span>
      </div>
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-3 py-1 text-[13px]", strong && "text-[15px] font-semibold", muted && "text-ink-3")}>
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

function ClientSummary({ calc, q }: { calc: QuoteCalc; q: QuoteSettings }) {
  return (
    <Card className="p-4">
      <SectionTitle>What the client sees</SectionTitle>
      <Row label="Subtotal" value={rupees(calc.clientSubtotal)} />
      {calc.contingencyAmount > 0 && <Row label={`Contingency (${q.contingencyPct}%)`} value={rupees(calc.contingencyAmount)} />}
      {calc.discountAmount > 0 && <Row label={`Discount${q.discountType === "pct" ? ` (${q.discountValue}%)` : ""}`} value={`− ${rupees(calc.discountAmount)}`} />}
      <Row label="Taxable value" value={rupees(calc.taxable)} />
      {calc.taxLines.map((t) => (
        <Row key={t.label + t.base} label={t.label} value={rupees(t.amount)} muted />
      ))}
      {calc.roundOff !== 0 && <Row label="Round off" value={calc.roundOff.toFixed(2)} muted />}
      <div className="mt-1 border-t border-line pt-1">
        <Row label="Grand total" value={rupees(calc.grandTotal)} strong />
      </div>
    </Card>
  );
}

function ProfitPanel({ calc, q, budget }: { calc: QuoteCalc; q: QuoteSettings; budget: number | null }) {
  const low = calc.taxable > 0 && calc.marginPct < 8;
  return (
    <Card className={cx("p-4", calc.profit < 0 ? "border-red-200 bg-red-50/40" : "border-emerald-200 bg-emerald-50/40")}>
      <SectionTitle>Your numbers · internal only</SectionTitle>
      <Row label="Material cost" value={rupees(calc.materialTotal)} muted />
      <Row label="Labour cost" value={rupees(calc.labourTotal)} muted />
      <Row label="Cost to you" value={rupees(calc.costSubtotal)} />
      <Row label={`Overhead allowance (${q.overheadPct}%)`} value={rupees(calc.overheadAmount)} muted />
      <Row label={`Contingency buffer (${q.contingencyPct}%)`} value={rupees(calc.contingencyBuffer)} muted />
      {calc.discountAmount > 0 && <Row label="Discount given" value={`− ${rupees(calc.discountAmount)}`} muted />}
      <div className="mt-1 border-t border-line pt-1">
        <Row
          label="Your profit"
          value={
            <span className={calc.profit < 0 ? "text-red-700" : "text-emerald-700"}>
              {rupees(calc.profit)} · {calc.marginPct.toFixed(1)}%
            </span>
          }
          strong
        />
      </div>
      {low && <p className="mt-2 text-xs text-red-700">Margin is below 8%. Check the discount and profit settings.</p>}
      {budget ? (
        <p className="mt-2 text-xs text-ink-3">
          Client budget {rupees(budget)} — quote is{" "}
          <span className={calc.grandTotal > budget ? "text-amber-700" : "text-emerald-700"}>
            {calc.grandTotal > budget ? `${rupees(calc.grandTotal - budget)} over` : `${rupees(budget - calc.grandTotal)} under`}
          </span>
          .
        </p>
      ) : null}
    </Card>
  );
}

function ImportModal({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (items: ScopeItem[]) => void }) {
  const { project } = useProject();
  const { store } = useData();
  const [sheets, setSheets] = useState<{ name: string; rows: (string | number | null)[][] }[] | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async (blob: Blob) => {
    setError(null);
    try {
      const s = await readSheets(blob);
      setSheets(s);
      setSheetIdx(0);
    } catch (e) {
      setError(`Could not read file: ${(e as Error).message}`);
    }
  };

  const mapping: Mapping | null = sheets ? detectColumns(sheets[sheetIdx]?.rows ?? []) : null;
  const preview = sheets && mapping ? rowsToItems(sheets[sheetIdx].rows, mapping, room || project.rooms[0] || "General / site") : [];
  const spreadsheetFiles = project.files.filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name));

  const close = () => {
    setSheets(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Import an existing BOQ"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!preview.length} onClick={() => { onImport(preview); setSheets(null); }}>
            Add {preview.length} items
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line-2 px-3 py-1.5 text-sm hover:bg-hover">
            <FileSpreadsheet size={14} /> Choose Excel / CSV
            <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
          </label>
          {spreadsheetFiles.map((f) => (
            <button
              key={f.id}
              onClick={async () => {
                const url = await store.fileUrl(f.path);
                load(await (await fetch(url)).blob());
              }}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-2 hover:bg-hover"
            >
              Use {f.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-3">
          Columns are matched by their headings (Item / Description, Qty, Unit, Material rate, Labour rate, Rate, Room, Category). Rows without numbers are treated as section headings.
          Rates are imported as your cost — check them after import.
        </p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {sheets && (
          <div className="flex gap-3">
            <Field label="Sheet" className="flex-1">
              <Select value={sheetIdx} onChange={(e) => setSheetIdx(Number(e.target.value))}>
                {sheets.map((s, i) => (
                  <option key={s.name} value={i}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Room for rows without a room column" className="flex-1">
              <Select value={room} onChange={(e) => setRoom(e.target.value)}>
                {project.rooms.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        {sheets && !mapping && <p className="text-sm text-amber-700">Couldn&apos;t find a header row with an Item / Description column in this sheet.</p>}
        {preview.length > 0 && (
          <div className="overflow-hidden rounded-md border border-line">
            <table className="w-full text-xs">
              <thead className="bg-canvas text-left text-ink-3">
                <tr>
                  <th className="px-2 py-1.5">Item</th>
                  <th className="px-2">Category</th>
                  <th className="px-2 text-right">Qty</th>
                  <th className="px-2">Unit</th>
                  <th className="px-2 text-right">Material</th>
                  <th className="px-2 text-right">Labour</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 8).map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="max-w-[240px] truncate px-2 py-1.5">{p.item}</td>
                    <td className="px-2">{p.category}</td>
                    <td className="tabular px-2 text-right">{num(p.qty)}</td>
                    <td className="px-2">{p.unit}</td>
                    <td className="tabular px-2 text-right">{num(p.materialRate)}</td>
                    <td className="tabular px-2 text-right">{num(p.labourRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 8 && <div className="border-t border-line px-2 py-1.5 text-xs text-ink-3">…and {preview.length - 8} more</div>}
          </div>
        )}
      </div>
    </Modal>
  );
}
