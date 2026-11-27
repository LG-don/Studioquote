"use client";

import { useState } from "react";
import { Calculator, ChevronDown, ChevronRight, Copy, Link2, Ruler, Trash2 } from "lucide-react";
import type { LineCalc } from "@/lib/calc";
import { CATEGORIES } from "@/lib/constants";
import { num, rupees } from "@/lib/format";
import { BASIS_LABEL, quantityFor } from "@/lib/measure";
import type { Rate, RoomSize, ScopeItem } from "@/lib/types";
import { RatePickerDialog } from "@/components/RatePicker";
import { Badge, Button, cx, Field, Input, NumberInput, Select, Textarea } from "@/components/ui";

export interface QuoteRowProps {
  it: ScopeItem;
  byVendor?: string | null; // executed by the client's vendor — not priced
  line: LineCalc;
  detailed: boolean;
  expanded: boolean;
  highlighted: boolean;
  showRoom: boolean;
  rooms: string[];
  rates: Rate[];
  roomSize?: RoomSize;
  onToggle: () => void;
  onChange: (patch: Partial<ScopeItem>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onQtyEnter: () => void;
}

export function needsAttention(it: ScopeItem, line: LineCalc) {
  return !line.complete || !it.item.trim();
}

export function QuoteRow(p: QuoteRowProps) {
  const { it, line, detailed, expanded } = p;
  const [picker, setPicker] = useState(false);
  const lib = it.rateId ? p.rates.find((r) => r.id === it.rateId) : undefined;
  const changed = lib && (lib.materialRate !== it.materialRate || lib.labourRate !== it.labourRate);
  const missingQty = it.qty === null || it.qty <= 0;
  const missingRate = it.materialRate === null && it.labourRate === null;
  const attention = !p.byVendor && needsAttention(it, line);
  const colCount = detailed ? 9 : 7;

  const setCostRate = (v: number | null) => {
    if (v === null) return p.onChange({ materialRate: null, labourRate: null });
    const m = it.materialRate ?? 0;
    const l = it.labourRate ?? 0;
    const old = m + l;
    // Keep the material/labour split in proportion when editing the combined rate.
    if (old > 0 && l > 0) p.onChange({ materialRate: Math.round((v * m) / old * 100) / 100, labourRate: Math.round((v * l) / old * 100) / 100 });
    else p.onChange({ materialRate: v, labourRate: it.labourRate === null ? null : 0 });
  };

  return (
    <>
      <tr
        id={`row-${it.id}`}
        className={cx(
          "group border-b border-line align-top",
          expanded ? "bg-canvas" : "hover:bg-canvas/70",
          p.highlighted && "outline outline-2 -outline-offset-2 outline-accent",
          p.byVendor && "text-ink-3",
        )}
      >
        <td className="py-1.5 pl-3 pr-2">
          <div className="flex items-start gap-1.5">
            <button onClick={p.onToggle} className="mt-0.5 rounded p-0.5 text-ink-3 hover:bg-hover hover:text-ink" title={expanded ? "Hide scope details" : "Show scope details"}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <div className="min-w-0 flex-1 cursor-pointer" onClick={p.onToggle}>
              <div className="flex flex-wrap items-center gap-1.5 leading-5">
                {attention && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Needs a quantity or rate" />}
                <span className="font-medium">{it.item || <span className="text-ink-3">Untitled item</span>}</span>
                {p.byVendor && <Badge tone="amber">{p.byVendor} · not in your price</Badge>}
                {line.isFee && <Badge tone="accent">Fee</Badge>}
                {it.source === "ai" && <Badge tone="blue">AI draft</Badge>}
                {it.missing.length > 0 && <Badge tone="amber">{it.missing.length} to confirm</Badge>}
              </div>
              <div className="truncate text-xs text-ink-3" style={{ maxWidth: 420 }} title={it.specification}>
                {p.showRoom ? `${it.room} · ` : ""}
                {[it.specification, it.brand].filter(Boolean).join(" · ") || "No specification"}
              </div>
            </div>
          </div>
        </td>
        <td className="px-1 py-1.5">
          <QtyCell it={it} roomSize={p.roomSize} missing={missingQty} onChange={p.onChange} onEnter={p.onQtyEnter} />
        </td>
        <td className="px-1 py-1.5">
          <input list="units" value={it.unit} onChange={(e) => p.onChange({ unit: e.target.value })} className="cell-input" aria-label="Unit" />
        </td>
        {line.isFee ? (
          <td colSpan={detailed ? 3 : 1} className="px-1 py-1.5">
            <div className="flex items-center justify-end gap-1.5">
              {detailed && <span className="text-[11px] text-ink-3">Your fee</span>}
              <NumberInput
                value={missingRate ? null : (it.materialRate ?? 0) + (it.labourRate ?? 0)}
                onChange={(v) => p.onChange({ materialRate: v === null ? null : 0, labourRate: v })}
                className={cx("cell-input num", detailed ? "w-[92px]" : "", missingRate && "empty")}
                placeholder="—"
                aria-label="Fee rate"
              />
            </div>
          </td>
        ) : detailed ? (
          <>
            <td className="px-1 py-1.5">
              <NumberInput value={it.materialRate} onChange={(v) => p.onChange({ materialRate: v })} className={cx("cell-input num", missingRate && "empty")} placeholder="—" aria-label="Material rate" />
            </td>
            <td className="px-1 py-1.5">
              <NumberInput value={it.labourRate} onChange={(v) => p.onChange({ labourRate: v })} className={cx("cell-input num", missingRate && "empty")} placeholder="—" aria-label="Labour rate" />
            </td>
            <td className="tabular px-2 py-2 text-right text-ink-2">{line.costRate ? num(line.costRate) : "—"}</td>
          </>
        ) : (
          <td className="px-1 py-1.5">
            <NumberInput
              value={missingRate ? null : (it.materialRate ?? 0) + (it.labourRate ?? 0)}
              onChange={setCostRate}
              className={cx("cell-input num", missingRate && "empty")}
              placeholder="—"
              aria-label="Your cost rate"
            />
          </td>
        )}
        <td className="tabular bg-accent-soft/20 px-2 py-2 text-right">{line.clientRate && !line.excluded ? num(line.clientRate) : "—"}</td>
        <td className="tabular bg-accent-soft/20 px-3 py-2 text-right font-medium">{line.clientAmount && !line.excluded ? rupees(line.clientAmount) : "—"}</td>
        <td className="relative px-1 py-1.5 text-right">
          <div className="flex justify-end gap-0.5">
            <button
              onClick={() => setPicker(!picker)}
              className={cx("rounded p-1 hover:bg-hover", lib ? (changed ? "text-amber-600" : "text-accent") : "text-ink-3")}
              title={lib ? (changed ? `From "${lib.name}" — rate edited for this project` : `Rate from "${lib.name}"`) : "Pick a rate from your library"}
            >
              <Link2 size={13} />
            </button>
            <button onClick={p.onDuplicate} className="rounded p-1 text-ink-3 opacity-0 hover:bg-hover hover:text-ink group-hover:opacity-100" title="Duplicate line">
              <Copy size={13} />
            </button>
            <button onClick={p.onDelete} className="rounded p-1 text-ink-3 opacity-0 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100" title="Delete line">
              <Trash2 size={13} />
            </button>
          </div>
          <RatePickerDialog
            open={picker}
            title={`Rate for “${it.item || "this line"}”`}
            subtitle="Replaces this line's material and labour rates with the library rate."
            rates={p.rates}
            initialQuery={it.item.split(" ").slice(0, 2).join(" ")}
            onPick={(r) => {
              p.onChange({ rateId: r.id, materialRate: r.materialRate, labourRate: r.labourRate, unit: r.unit });
              setPicker(false);
            }}
            onClose={() => setPicker(false)}
          />
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-line bg-canvas">
          <td colSpan={colCount} className="px-10 pb-5 pt-1">
            <ScopeDetails it={it} rooms={p.rooms} onChange={p.onChange} />
          </td>
        </tr>
      )}
    </>
  );
}

function QtyCell({
  it,
  roomSize,
  missing,
  onChange,
  onEnter,
}: {
  it: ScopeItem;
  roomSize?: RoomSize;
  missing: boolean;
  onChange: (p: Partial<ScopeItem>) => void;
  onEnter: () => void;
}) {
  const [calc, setCalc] = useState(false);
  const fromRoom = quantityFor(roomSize, it.qtyBasis);
  const isAuto = !!it.qtyAuto && fromRoom !== null && it.qty === fromRoom;
  return (
    <div className="relative">
      <div className="flex items-center">
        <NumberInput
          value={it.qty}
          onChange={(v) => onChange({ qty: v, qtyAuto: false })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          data-qty={it.id}
          className={cx("cell-input num", missing && "empty", isAuto && "text-accent")}
          placeholder="—"
          aria-label="Quantity"
          title={isAuto && it.qtyBasis ? `From the room's ${BASIS_LABEL[it.qtyBasis]} — type to override` : undefined}
        />
      </div>
      <div className="mt-0.5 flex justify-end gap-1 text-[10px] text-ink-3 opacity-70 group-hover:opacity-100">
        {it.qtyBasis && !isAuto && fromRoom !== null && (
          <button onClick={() => onChange({ qty: fromRoom, qtyAuto: true })} className="hover:text-accent" title={`Use ${BASIS_LABEL[it.qtyBasis]}: ${fromRoom}`}>
            <Ruler size={11} className="inline" /> {fromRoom}
          </button>
        )}
        {isAuto && <span className="text-accent">from room</span>}
        <button onClick={() => setCalc(!calc)} className="hover:text-ink" title="Calculate from measurements">
          <Calculator size={11} />
        </button>
      </div>
      {calc && <QtyCalculator unit={it.unit} onApply={(q) => { onChange({ qty: q, qtyAuto: false }); setCalc(false); }} onClose={() => setCalc(false)} />}
    </div>
  );
}

function QtyCalculator({ unit, onApply, onClose }: { unit: string; onApply: (q: number) => void; onClose: () => void }) {
  const linear = /r\.?\s?ft|r\.?\s?m|rft|running/i.test(unit);
  const count = /nos|set|pts|lot|ls/i.test(unit);
  const [l, setL] = useState<number | null>(null);
  const [w, setW] = useState<number | null>(null);
  const [n, setN] = useState<number | null>(1);
  const result = count ? (n ?? 0) : linear ? (l ?? 0) * (n ?? 1) : (l ?? 0) * (w ?? 0) * (n ?? 1);
  const rounded = Math.round(result * 100) / 100;
  const box = "h-8 w-full rounded border border-line-2 px-2 text-right text-sm outline-none focus:border-accent";
  return (
    <div className="absolute right-0 top-9 z-40 w-60 rounded-lg border border-line bg-white p-3 text-left shadow-lg">
      <div className="mb-2 text-xs font-medium text-ink-2">Quantity in {unit || "units"}</div>
      <div className="grid grid-cols-3 items-end gap-1.5 text-xs text-ink-3">
        {!count && (
          <label>
            {linear ? "Length" : "Length"}
            <NumberInput autoFocus value={l} onChange={setL} className={box} />
          </label>
        )}
        {!count && !linear && (
          <label>
            {/sq/i.test(unit) ? "Width / height" : "Width"}
            <NumberInput value={w} onChange={setW} className={box} />
          </label>
        )}
        <label className={count ? "col-span-3" : ""}>
          Count
          <NumberInput value={n} onChange={setN} className={box} />
        </label>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="tabular text-sm font-medium">= {num(rounded)}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" disabled={rounded <= 0} onClick={() => onApply(rounded)}>
            Use
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-ink-3">Measure in the same unit as the line (feet for sq.ft / r.ft).</p>
    </div>
  );
}

function ScopeDetails({ it, rooms, onChange }: { it: ScopeItem; rooms: string[]; onChange: (p: Partial<ScopeItem>) => void }) {
  return (
    <div className="space-y-3">
      {it.missing.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {it.missing.map((m) => (
            <span key={m} className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 py-0.5 pl-2 pr-1 text-xs text-amber-900">
              {m}
              <button onClick={() => onChange({ missing: it.missing.filter((x) => x !== m) })} className="rounded px-1 text-amber-700 hover:bg-amber-100" title="Mark as resolved">
                ✓
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-6 gap-3">
        <Field label="Item" className="col-span-6 md:col-span-3">
          <Input value={it.item} onChange={(e) => onChange({ item: e.target.value })} />
        </Field>
        <Field label="Category" className="col-span-3 md:col-span-2">
          <Select value={it.category} onChange={(e) => onChange({ category: e.target.value })}>
            {!CATEGORIES.includes(it.category as (typeof CATEGORIES)[number]) && <option>{it.category}</option>}
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Room" className="col-span-3 md:col-span-1">
          <Select value={it.room} onChange={(e) => onChange({ room: e.target.value })}>
            {rooms.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Material specification" className="col-span-6 md:col-span-4">
          <Input value={it.specification} onChange={(e) => onChange({ specification: e.target.value })} />
        </Field>
        <Field label="Brand / finish" className="col-span-6 md:col-span-2">
          <Input value={it.brand} onChange={(e) => onChange({ brand: e.target.value })} placeholder="e.g. Hettich, or 'equivalent approved'" />
        </Field>
        <Field label="Work included" className="col-span-6 md:col-span-3">
          <Textarea value={it.included} onChange={(e) => onChange({ included: e.target.value })} className="min-h-[60px]" />
        </Field>
        <Field label="Not included" className="col-span-6 md:col-span-3">
          <Textarea value={it.excluded} onChange={(e) => onChange({ excluded: e.target.value })} className="min-h-[60px]" />
        </Field>
        <Field label="Installation" className="col-span-6 md:col-span-2">
          <Textarea value={it.installation} onChange={(e) => onChange({ installation: e.target.value })} className="min-h-[60px]" />
        </Field>
        <Field label="Assumptions" className="col-span-6 md:col-span-2">
          <Textarea value={it.assumptions} onChange={(e) => onChange({ assumptions: e.target.value })} className="min-h-[60px]" />
        </Field>
        <Field label="Client to provide" className="col-span-6 md:col-span-2">
          <Textarea value={it.dependencies} onChange={(e) => onChange({ dependencies: e.target.value })} className="min-h-[60px]" />
        </Field>
      </div>
      {it.qtyBasis && (
        <label className="flex items-center gap-2 text-xs text-ink-2">
          <input type="checkbox" checked={!!it.qtyAuto} onChange={(e) => onChange({ qtyAuto: e.target.checked })} className="accent-[var(--color-ink)]" />
          Take quantity from the room&apos;s {BASIS_LABEL[it.qtyBasis]} (openings not deducted)
        </label>
      )}
    </div>
  );
}
