"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { uid } from "@/lib/ids";
import type { Milestone, Phase } from "@/lib/types";
import { Button, cx, NumberInput } from "./ui";

function move<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const rowBtn = "rounded p-1 text-ink-3 hover:bg-hover hover:text-ink";

export function MilestonesEditor({ value, onChange, total }: { value: Milestone[]; onChange: (v: Milestone[]) => void; total?: number }) {
  const sum = value.reduce((s, m) => s + (Number(m.pct) || 0), 0);
  return (
    <div>
      <div className="divide-y divide-line rounded-md border border-line bg-white">
        {value.map((m, i) => (
          <div key={m.id} className="group flex items-center gap-2 px-2 py-1">
            <span className="w-5 text-center text-xs text-ink-3">{i + 1}</span>
            <input
              value={m.label}
              onChange={(e) => onChange(value.map((x) => (x.id === m.id ? { ...x, label: e.target.value } : x)))}
              className="cell-input flex-1"
            />
            <NumberInput
              value={m.pct}
              allowNull={false}
              onChange={(v) => onChange(value.map((x) => (x.id === m.id ? { ...x, pct: v ?? 0 } : x)))}
              className="cell-input num w-16"
            />
            <span className="text-xs text-ink-3">%</span>
            {total !== undefined && <span className="tabular w-24 text-right text-xs text-ink-2">₹{Math.round((total * m.pct) / 100).toLocaleString("en-IN")}</span>}
            <div className="flex opacity-0 group-hover:opacity-100">
              <button className={rowBtn} onClick={() => onChange(move(value, i, -1))} title="Move up"><ArrowUp size={12} /></button>
              <button className={rowBtn} onClick={() => onChange(move(value, i, 1))} title="Move down"><ArrowDown size={12} /></button>
              <button className={rowBtn} onClick={() => onChange(value.filter((x) => x.id !== m.id))} title="Remove"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => onChange([...value, { id: uid("m"), label: "New milestone", pct: 0 }])}>
          <Plus size={13} /> Add milestone
        </Button>
        <span className={cx("text-xs", Math.abs(sum - 100) > 0.01 ? "font-medium text-red-700" : "text-ink-3")}>Total {sum}%</span>
      </div>
    </div>
  );
}

export function PhasesEditor({ value, onChange }: { value: Phase[]; onChange: (v: Phase[]) => void }) {
  const weeks = value.reduce((s, p) => s + (Number(p.weeks) || 0), 0);
  return (
    <div>
      <div className="divide-y divide-line rounded-md border border-line bg-white">
        {value.map((p, i) => (
          <div key={p.id} className="group flex items-center gap-2 px-2 py-1">
            <span className="w-5 text-center text-xs text-ink-3">{i + 1}</span>
            <input value={p.label} onChange={(e) => onChange(value.map((x) => (x.id === p.id ? { ...x, label: e.target.value } : x)))} className="cell-input flex-1" />
            <NumberInput
              value={p.weeks}
              allowNull={false}
              onChange={(v) => onChange(value.map((x) => (x.id === p.id ? { ...x, weeks: v ?? 0 } : x)))}
              className="cell-input num w-14"
            />
            <span className="text-xs text-ink-3">wk</span>
            <div className="flex opacity-0 group-hover:opacity-100">
              <button className={rowBtn} onClick={() => onChange(move(value, i, -1))} title="Move up"><ArrowUp size={12} /></button>
              <button className={rowBtn} onClick={() => onChange(move(value, i, 1))} title="Move down"><ArrowDown size={12} /></button>
              <button className={rowBtn} onClick={() => onChange(value.filter((x) => x.id !== p.id))} title="Remove"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => onChange([...value, { id: uid("t"), label: "New phase", weeks: 1 }])}>
          <Plus size={13} /> Add phase
        </Button>
        <span className="text-xs text-ink-3">Total {weeks} weeks</span>
      </div>
    </div>
  );
}

export function LinesEditor({ value, onChange, addLabel }: { value: string[]; onChange: (v: string[]) => void; addLabel: string }) {
  return (
    <div>
      <div className="divide-y divide-line rounded-md border border-line bg-white">
        {value.map((t, i) => (
          <div key={i} className="group flex items-start gap-2 px-2 py-1">
            <span className="mt-1.5 w-5 text-center text-xs text-ink-3">{i + 1}</span>
            <textarea
              value={t}
              rows={Math.max(1, Math.ceil(t.length / 95))}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
              className="cell-input flex-1 resize-none leading-relaxed"
            />
            <div className="mt-1 flex opacity-0 group-hover:opacity-100">
              <button className={rowBtn} onClick={() => onChange(move(value, i, -1))} title="Move up"><ArrowUp size={12} /></button>
              <button className={rowBtn} onClick={() => onChange(move(value, i, 1))} title="Move down"><ArrowDown size={12} /></button>
              <button className={rowBtn} onClick={() => onChange(value.filter((_, j) => j !== i))} title="Remove"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" variant="ghost" className="mt-2" onClick={() => onChange([...value, ""])}>
        <Plus size={13} /> {addLabel}
      </Button>
    </div>
  );
}
