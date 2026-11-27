"use client";

import { Plus, Trash2 } from "lucide-react";
import { EMPTY_COSTS } from "@/lib/costing";
import { rupees } from "@/lib/format";
import { uid } from "@/lib/ids";
import type { StudioCosts } from "@/lib/types";
import { Button, Field, NumberInput } from "./ui";

const numCls = "h-9 w-full rounded-md border border-line-2 bg-white px-3 text-right text-sm outline-none focus:border-accent";

/** Monthly running costs used to work out what a design fee really leaves you. Internal only. */
export function StudioCostsEditor({ value, onChange }: { value?: StudioCosts; onChange: (v: StudioCosts) => void }) {
  const c = value ?? EMPTY_COSTS;
  const set = (patch: Partial<StudioCosts>) => onChange({ ...c, ...patch });
  const salaries = c.staff.reduce((s, x) => s + (Number(x.monthlySalary) || 0), 0);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Your own monthly pay (₹)" hint="What you want to earn per month">
          <NumberInput value={c.ownMonthlyPay || null} onChange={(v) => set({ ownMonthlyPay: v ?? 0 })} className={numCls} />
        </Field>
        <Field label="Other monthly costs (₹)" hint="Rent, software, travel, utilities">
          <NumberInput value={c.otherMonthly || null} onChange={(v) => set({ otherMonthly: v ?? 0 })} className={numCls} />
        </Field>
        <Field label="Cost of one 3D render (₹)" hint="Your fixed cost to produce it">
          <NumberInput value={c.renderCost || null} onChange={(v) => set({ renderCost: v ?? 0 })} className={numCls} />
        </Field>
      </div>
      <div>
        <div className="mb-1.5 text-[13px] font-medium text-ink-2">Team (monthly salaries)</div>
        <div className="divide-y divide-line rounded-md border border-line bg-white">
          {c.staff.length === 0 && <p className="px-3 py-2.5 text-[13px] text-ink-3">No team members yet — add junior designers, interns, site supervisors…</p>}
          {c.staff.map((m) => (
            <div key={m.id} className="group flex items-center gap-2 px-2 py-1">
              <input
                value={m.role}
                onChange={(e) => set({ staff: c.staff.map((x) => (x.id === m.id ? { ...x, role: e.target.value } : x)) })}
                placeholder="Role, e.g. Junior designer"
                className="cell-input flex-1"
              />
              <span className="text-xs text-ink-3">₹</span>
              <NumberInput
                value={m.monthlySalary || null}
                onChange={(v) => set({ staff: c.staff.map((x) => (x.id === m.id ? { ...x, monthlySalary: v ?? 0 } : x)) })}
                className="cell-input num w-28"
                placeholder="per month"
              />
              <button onClick={() => set({ staff: c.staff.filter((x) => x.id !== m.id) })} className="rounded p-1 text-ink-3 opacity-0 hover:text-red-700 group-hover:opacity-100" title="Remove">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={() => set({ staff: [...c.staff, { id: uid("st"), role: "", monthlySalary: 0 }] })}>
            <Plus size={13} /> Add team member
          </Button>
          <span className="text-xs text-ink-3">
            Studio runs at {rupees(salaries + c.ownMonthlyPay + c.otherMonthly)} / month including your pay
          </span>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-ink-3">
        Each month these costs are shared between your ongoing fee projects in proportion to what each one earns that month. Clients never see any of this.
      </p>
    </div>
  );
}
