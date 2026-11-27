"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Download, ListChecks, Plus, Search, SlidersHorizontal, Sparkles, Upload, Wand2, X } from "lucide-react";
import { UNITS } from "@/lib/constants";
import { useData, useProject } from "@/lib/data";
import { exportProjectWorkbook } from "@/lib/excel";
import { rupees } from "@/lib/format";
import { uid } from "@/lib/ids";
import { applyRoomSizes, setRoomSize } from "@/lib/measure";
import { DESIGN_ROOM, designServiceItems, GENERAL_ROOM, generateFromTemplates, itemFromRate } from "@/lib/templates";
import { calcProject, delegatedCategories } from "@/lib/calc";
import type { Rate, RoomSize, ScopeItem } from "@/lib/types";
import { RatePickerDialog } from "@/components/RatePicker";
import { DraftModal } from "@/components/quote/DraftModal";
import { ImportModal } from "@/components/quote/ImportModal";
import { PricingPanel } from "@/components/quote/PricingPanel";
import { needsAttention, QuoteRow } from "@/components/quote/QuoteRow";
import { Button, cx, EmptyState, LinkButton, Modal, NumberInput } from "@/components/ui";

const COLS_KEY = "sq.quote.detailed";

export default function QuotePageWrapper() {
  return (
    <Suspense>
      <QuotePage />
    </Suspense>
  );
}

function QuotePage() {
  const { project, update } = useProject();
  const { rates } = useData();
  const search = useSearchParams();
  const calc = useMemo(() => calcProject(project), [project]);

  const [groupBy, setGroupBy] = useState<"room" | "category">("room");
  const [detailed, setDetailed] = useState(true);
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [highlight, setHighlight] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [pickerRoom, setPickerRoom] = useState<string | null>(null);
  const nextIdx = useRef(0);

  // Per-browser preference for showing the material / labour split.
  useEffect(() => {
    try {
      const v = localStorage.getItem(COLS_KEY);
      if (v !== null) setDetailed(v === "1");
    } catch {}
  }, []);
  const toggleDetailed = () => {
    setDetailed((d) => {
      try {
        localStorage.setItem(COLS_KEY, d ? "0" : "1");
      } catch {}
      return !d;
    });
  };

  const engagement = project.engagement ?? "turnkey";
  const delegated = delegatedCategories(project);
  // Design fees sit in their own section at the top. In a design-only job that is the whole quote.
  const rooms = useMemo(() => {
    const physical = [...new Set([...project.rooms, ...project.items.map((i) => i.room)])].filter((r) => r !== DESIGN_ROOM);
    return engagement === "design_only" ? [DESIGN_ROOM, ...physical.filter((r) => project.items.some((i) => i.room === r))] : [DESIGN_ROOM, ...physical];
  }, [project.rooms, project.items, engagement]);
  const attentionItems = project.items.filter((it) => needsAttention(it, calc.lines[it.id]));

  const focusItem = (id: string, expand = false) => {
    setOnlyAttention(false);
    setQ("");
    if (expand) setExpanded((e) => ({ ...e, [id]: true }));
    setHighlight(id);
    setTimeout(() => {
      document.getElementById(`row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      (document.querySelector(`[data-qty="${id}"]`) as HTMLInputElement | null)?.focus({ preventScroll: true });
    }, 60);
    setTimeout(() => setHighlight((h) => (h === id ? null : h)), 2500);
  };

  // Deep link from ScopeGuard: /quote?item=<id>
  useEffect(() => {
    const id = search.get("item");
    if (id && project.items.some((i) => i.id === id)) focusItem(id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const setItem = (id: string, patch: Partial<ScopeItem>) =>
    update((p) => {
      const items = p.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
      // Re-linking a line to room measurements recalculates it straight away.
      return { ...p, items: patch.qtyAuto ? applyRoomSizes(items, p.roomSizes) : items };
    });
  const removeItem = (id: string) => update((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));
  const duplicate = (it: ScopeItem) =>
    update((p) => {
      const idx = p.items.findIndex((i) => i.id === it.id);
      const items = [...p.items];
      items.splice(idx + 1, 0, { ...it, id: uid("it"), source: "manual" });
      return { ...p, items };
    });
  const addItems = (room: string, newItems: ScopeItem[]) =>
    update((p) => {
      const items = [...p.items];
      let at = -1;
      items.forEach((i, idx) => i.room === room && (at = idx));
      items.splice(at === -1 ? items.length : at + 1, 0, ...newItems);
      return { ...p, items: applyRoomSizes(items, p.roomSizes), rooms: p.rooms.includes(room) ? p.rooms : [...p.rooms, room] };
    });
  const addFromRate = (room: string, r: Rate) => {
    const it = itemFromRate(r, r.id, room, "manual");
    addItems(room, [it]);
    setPickerRoom(null);
    focusItem(it.id);
  };
  const addBlank = (room: string) => {
    const it: ScopeItem = {
      id: uid("it"), room, category: "Custom furniture", item: "", specification: "", brand: "", included: "", excluded: "",
      installation: "", assumptions: "", dependencies: "", qty: null, unit: "nos", materialRate: null, labourRate: null, source: "manual", missing: [],
    };
    addItems(room, [it]);
    setPickerRoom(null);
    focusItem(it.id, true);
  };

  // Opt-in: typical lines for one room, with library rates and standard scope wording.
  const suggestFor = (room: string) => {
    const items =
      room === DESIGN_ROOM
        ? designServiceItems(rates, { carpetArea: project.carpetArea, coordination: engagement !== "turnkey" })
        : room === GENERAL_ROOM
          ? generateFromTemplates([], rates, true, delegated)
          : generateFromTemplates([room], rates, false, delegated);
    addItems(room, items);
  };

  const nextAttention = () => {
    if (!attentionItems.length) return;
    const it = attentionItems[nextIdx.current % attentionItems.length];
    nextIdx.current += 1;
    focusItem(it.id);
  };

  // Enter in a quantity cell jumps to the next line's quantity — spreadsheet style.
  const visibleOrder: string[] = [];
  const onQtyEnter = (id: string) => {
    const i = visibleOrder.indexOf(id);
    const next = visibleOrder[i + 1];
    if (next) (document.querySelector(`[data-qty="${next}"]`) as HTMLInputElement | null)?.focus();
  };

  const filtered = project.items.filter((it) => {
    if (onlyAttention && !needsAttention(it, calc.lines[it.id])) return false;
    if (q && !`${it.item} ${it.specification} ${it.brand} ${it.category}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const groupKeys = groupBy === "room" ? rooms : [...new Set(project.items.map((i) => i.category))];
  const groups = groupKeys
    .map((k) => ({ key: k, items: filtered.filter((i) => (groupBy === "room" ? i.room : i.category) === k) }))
    .filter((g) => g.items.length > 0 || (groupBy === "room" && !onlyAttention && !q));
  groups.forEach((g) => g.items.forEach((i) => visibleOrder.push(i.id)));

  const complete = project.items.length - attentionItems.length;

  return (
    <div className="mx-auto max-w-[1240px] pb-24">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Quote</h2>
          <p className="text-sm text-ink-3">
            {engagement === "design_only" ? "Your design fees, line by line. Click a line to see what it covers." : "Every line carries its scope (click a line to see what's included) and its price. Client rates include your overheads and profit."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setDraftOpen(true)}>
            <Wand2 size={15} /> Suggest lines
          </Button>
          <Button onClick={() => setImportOpen(true)}>
            <Upload size={14} /> From Excel
          </Button>
          <Button onClick={() => exportProjectWorkbook(project, calc)} disabled={!project.items.length} title="Download as Excel">
            <Download size={14} />
          </Button>
        </div>
      </div>

      {project.items.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a line"
              className="h-8 w-48 rounded-md border border-line-2 bg-white pl-8 pr-2 text-[13px] outline-none focus:border-accent"
            />
          </div>
          <Segmented value={groupBy} onChange={setGroupBy} options={[["room", "By room"], ["category", "By category"]]} />
          <button
            onClick={toggleDetailed}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-2.5 text-[13px] text-ink-2 hover:bg-hover"
            title="Show or hide the material / labour split"
          >
            <SlidersHorizontal size={13} /> {detailed ? "Material + labour" : "Single cost rate"}
          </button>
          <div className="ml-auto flex items-center gap-2">
            {attentionItems.length > 0 ? (
              <>
                <button
                  onClick={() => setOnlyAttention(!onlyAttention)}
                  className={cx(
                    "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px]",
                    onlyAttention ? "border-amber-300 bg-amber-50 text-amber-900" : "border-line-2 bg-white text-ink-2 hover:bg-hover",
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {attentionItems.length} need a quantity or rate
                </button>
                <Button size="sm" onClick={nextAttention}>
                  Next <ArrowRight size={13} />
                </Button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-emerald-700">
                <ListChecks size={14} /> {project.items.length === 1 ? "The only line is priced" : `All ${project.items.length} lines priced`}
              </span>
            )}
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <div className="mb-1 flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} /> Notes from AI drafting
            </span>
            <button onClick={() => setNotes([])} className="text-sky-700 hover:text-sky-900">
              <X size={14} />
            </button>
          </div>
          <ul className="list-disc space-y-0.5 pl-5">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {project.items.length === 0 && (
        <div className="mb-4 rounded-lg border border-line bg-white px-4 py-3 text-sm text-ink-2">
          Add lines to each room below — pick from your rate library, paste from Excel, or use <em>Suggest lines</em> on a room to start from typical items.
        </div>
      )}
      {rooms.length === 0 ? (
        <EmptyState title="No rooms yet" body="Add rooms on the Details tab, then come back to build the quote." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead className="bg-white">
              <tr className="border-b border-line text-left text-xs text-ink-3">
                <th className="py-2.5 pl-9 pr-2 font-medium">Item</th>
                <th className="w-[92px] px-1 text-right font-medium">Qty</th>
                <th className="w-[68px] px-1 font-medium">Unit</th>
                {detailed ? (
                  <>
                    <th className="w-[92px] px-1 text-right font-medium">Material ₹</th>
                    <th className="w-[86px] px-1 text-right font-medium">Labour ₹</th>
                    <th className="w-[80px] px-2 text-right font-medium">Cost rate</th>
                  </>
                ) : (
                  <th className="w-[100px] px-1 text-right font-medium" title="Material + labour, before overheads and profit">
                    Your cost ₹
                  </th>
                )}
                <th className="w-[88px] bg-accent-soft/50 px-2 text-right font-medium text-accent">Client rate</th>
                <th className="w-[108px] bg-accent-soft/50 px-3 text-right font-medium text-accent">Amount</th>
                <th className="w-[84px]" />
              </tr>
            </thead>
            {groups.map((g) => {
              const sub = g.items.reduce((s, i) => s + (calc.lines[i.id].excluded ? 0 : calc.lines[i.id].clientAmount), 0);
              return (
                <tbody key={g.key}>
                  <tr className="border-b border-line bg-canvas">
                    <td colSpan={detailed ? 9 : 7} className="py-2 pl-3 pr-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                          {g.key} <span className="ml-1 font-normal normal-case tracking-normal text-ink-3">{g.items.length} lines</span>
                        </span>
                        {groupBy === "room" && g.key === DESIGN_ROOM && (
                          <span className="text-xs text-ink-3">Your fees — entered as charged, no markup</span>
                        )}
                        {groupBy === "room" && g.key !== DESIGN_ROOM && (
                          <RoomSizeInput
                            size={project.roomSizes?.[g.key]}
                            onChange={(size) => update((p) => setRoomSize(p, g.key, size))}
                          />
                        )}
                        <span className="ml-auto flex items-center gap-3">
                          {groupBy === "room" && (
                            <Button size="sm" variant="ghost" onClick={() => setPickerRoom(g.key)}>
                              <Plus size={13} /> Add line
                            </Button>
                          )}
                          <span className="tabular min-w-[96px] text-right font-semibold">{rupees(sub)}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                  {g.items.length === 0 && (
                    <tr className="border-b border-line">
                      <td colSpan={detailed ? 9 : 7} className="py-3 pl-9 text-[13px] text-ink-3">
                        No lines yet.{" "}
                        <button onClick={() => setPickerRoom(g.key)} className="text-ink underline-offset-2 hover:underline">Add a line</button>
                        {" or "}
                        <button onClick={() => suggestFor(g.key)} className="text-ink underline-offset-2 hover:underline">
                          {g.key === DESIGN_ROOM ? "add your standard design fees" : "suggest typical lines"}
                        </button>
                        {g.key === DESIGN_ROOM ? (engagement === "turnkey" ? " (optional — skip if fees are built into your rates)." : ".") : " for this room."}
                      </td>
                    </tr>
                  )}
                  {g.items.map((it) => (
                    <QuoteRow
                      key={it.id}
                      it={it}
                      byVendor={delegated.has(it.category) ? project.delegated?.[it.category]?.vendor || "Client's vendor" : null}
                      line={calc.lines[it.id]}
                      detailed={detailed}
                      expanded={!!expanded[it.id]}
                      highlighted={highlight === it.id}
                      showRoom={groupBy === "category"}
                      rooms={rooms}
                      rates={rates}
                      roomSize={project.roomSizes?.[it.room]}
                      onToggle={() => setExpanded((e) => ({ ...e, [it.id]: !e[it.id] }))}
                      onChange={(patch) => setItem(it.id, patch)}
                      onDelete={() => removeItem(it.id)}
                      onDuplicate={() => duplicate(it)}
                      onQtyEnter={() => onQtyEnter(it.id)}
                    />
                  ))}
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

      {project.items.length > 0 && (
        <div className="mt-6 flex justify-end">
          <LinkButton href={`/projects/${project.id}/proposal`} variant="primary">
            Next: check & send <ArrowRight size={15} />
          </LinkButton>
        </div>
      )}

      {/* Sticky totals */}
      {project.items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-white/95 backdrop-blur md:left-[232px] print:hidden">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 md:px-8">
            <Total label="Priced" value={`${complete}/${project.items.length} lines`} />
            <Total label="Subtotal" value={rupees(calc.clientSubtotal)} />
            {calc.discountAmount > 0 && <Total label="Discount" value={`− ${rupees(calc.discountAmount)}`} />}
            <Total label="GST" value={calc.taxTotal ? rupees(calc.taxTotal) : project.quote.gstMode === "none" ? "Not applied" : "—"} />
            <Total label="Client pays" value={rupees(calc.grandTotal)} strong />
            <Total
              label="Your profit"
              value={
                <span className={calc.profit < 0 ? "text-red-700" : "text-emerald-700"}>
                  {rupees(calc.profit)} <span className="text-xs font-normal text-ink-3">{calc.taxable ? `${calc.marginPct.toFixed(1)}%` : ""}</span>
                </span>
              }
              strong
            />
            <Button size="sm" className="ml-auto" onClick={() => setPricingOpen(true)}>
              <SlidersHorizontal size={13} /> Markup, discount & GST
            </Button>
          </div>
        </div>
      )}

      <RatePickerDialog
        open={pickerRoom !== null}
        title={`Add a line to ${pickerRoom ?? ""}`}
        subtitle="Pick from your rate library — rates and scope wording come with it."
        rates={pickerRoom === DESIGN_ROOM ? rates.filter((r) => r.category === "Design services") : rates}
        onPick={(r) => pickerRoom && addFromRate(pickerRoom, r)}
        onBlank={() => pickerRoom && addBlank(pickerRoom)}
        onClose={() => setPickerRoom(null)}
      />

      <Modal open={pricingOpen} onClose={() => setPricingOpen(false)} title="Markup, discount & GST" wide>
        <PricingPanel calc={calc} />
      </Modal>

      <DraftModal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        rooms={rooms}
        onDone={(newItems, replaceRooms, aiNotes) => {
          update((p) => {
            const kept = p.items.filter((i) => !replaceRooms.includes(i.room));
            const order = [...p.rooms];
            const merged = [...kept, ...newItems].sort((a, b) => order.indexOf(a.room) - order.indexOf(b.room));
            return { ...p, items: applyRoomSizes(merged, p.roomSizes) };
          });
          setNotes(aiNotes);
          setDraftOpen(false);
        }}
      />
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

function Total({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="leading-tight">
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className={cx("tabular text-sm", strong && "text-[15px] font-semibold")}>{value}</div>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex h-8 items-center rounded-md border border-line-2 bg-white p-0.5 text-[13px]">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={cx("h-full rounded px-2.5", value === v ? "bg-ink text-white" : "text-ink-2 hover:bg-hover")}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** L × W × H in feet. Lines measured by area or perimeter fill themselves in. */
function RoomSizeInput({ size, onChange }: { size?: RoomSize; onChange: (s: RoomSize) => void }) {
  const s = size ?? { l: null, w: null, h: null };
  const box = "h-7 w-12 rounded border border-line-2 bg-white px-1.5 text-right text-xs outline-none focus:border-accent";
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-3" title="Room size in feet. Floor, ceiling, wall and skirting quantities are calculated from it.">
      <span className="hidden sm:inline">Size</span>
      <NumberInput value={s.l} onChange={(l) => onChange({ ...s, l })} className={box} placeholder="L" aria-label="Room length (ft)" />
      ×
      <NumberInput value={s.w} onChange={(w) => onChange({ ...s, w })} className={box} placeholder="W" aria-label="Room width (ft)" />
      ×
      <NumberInput value={s.h} onChange={(h) => onChange({ ...s, h })} className={box} placeholder="H" aria-label="Room height (ft)" />
      ft
    </span>
  );
}
