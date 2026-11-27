"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { costProject, defaultPlan, monthLabel, ongoingPortfolio } from "@/lib/costing";
import { useData, useProject } from "@/lib/data";
import { rupees } from "@/lib/format";
import type { CostPlan, Project } from "@/lib/types";
import { Button, Card, cx, NumberInput } from "@/components/ui";

const box = "h-9 w-full rounded-md border border-line-2 bg-white px-3 text-sm outline-none focus:border-accent";

/**
 * What a design fee really leaves the studio: team, site visits, renders and running
 * costs, shared month by month with the other ongoing projects. Internal only.
 */
export function CostPlanPanel() {
  const { project, update } = useProject();
  const { store, settings } = useData();
  const [all, setAll] = useState<Project[]>([]);
  useEffect(() => {
    store.listProjects().then(setAll).catch(() => setAll([]));
  }, [store]);

  const costs = settings?.studioCosts;
  const hasCosts = !!costs && (costs.ownMonthlyPay > 0 || costs.otherMonthly > 0 || costs.staff.length > 0 || costs.renderCost > 0);
  const portfolio = useMemo(() => ongoingPortfolio(all.filter((p) => p.id !== project.id)), [all, project.id]);
  const result = useMemo(() => costProject(project, portfolio, costs), [project, portfolio, costs]);
  const plan = project.plan;
  const setPlan = (patch: Partial<CostPlan>) => update((p) => ({ ...p, plan: { ...(p.plan ?? defaultPlan()), ...patch } }));

  const header = (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="flex items-center gap-1.5 text-[15px] font-semibold">
          <Lock size={14} className="text-ink-3" /> What this fee costs you
        </h3>
        <p className="text-xs text-ink-3">Internal only — the client sees just the fee and its stage payments.</p>
      </div>
    </div>
  );

  if (!plan || !result) {
    return (
      <Card className="mt-6 p-5">
        {header}
        <p className="mb-3 text-sm text-ink-2">Plan the duration, site visits and 3D renders to see what this fee leaves you after team and running costs.</p>
        <Button variant="primary" onClick={() => setPlan({})}>
          Plan this project&apos;s costs
        </Button>
      </Card>
    );
  }

  const perVisit = result.months.map((m) => m.perVisit).filter((v): v is number => v !== null);
  const minV = perVisit.length ? Math.min(...perVisit) : 0;
  const maxV = perVisit.length ? Math.max(...perVisit) : 0;
  const tiles: [string, number, string?][] = [
    ["Fee (excl. GST)", result.fee],
    ["Team", -result.staff],
    ["Running costs", -result.running],
    ["3D renders", -result.renders],
  ];

  return (
    <Card className="mt-6 p-5">
      {header}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <label className="text-xs text-ink-3">
          Starts
          <input type="month" value={plan.startMonth} onChange={(e) => e.target.value && setPlan({ startMonth: e.target.value })} className={box} />
        </label>
        <label className="text-xs text-ink-3">
          Duration (months)
          <NumberInput value={plan.months} allowNull={false} onChange={(v) => setPlan({ months: Math.max(1, Math.min(60, Math.round(v ?? 1))) })} className={box} />
        </label>
        <label className="text-xs text-ink-3">
          Site visits
          <NumberInput value={plan.visits} allowNull={false} onChange={(v) => setPlan({ visits: Math.max(0, Math.round(v ?? 0)) })} className={box} />
        </label>
        <label className="text-xs text-ink-3">
          3D renders
          <NumberInput value={plan.renders} allowNull={false} onChange={(v) => setPlan({ renders: Math.max(0, Math.round(v ?? 0)) })} className={box} />
        </label>
        <label className="text-xs text-ink-3">
          Cost per render (₹)
          <NumberInput value={plan.renderCost} onChange={(v) => setPlan({ renderCost: v })} placeholder={costs?.renderCost ? String(costs.renderCost) : "set in Settings"} className={box} />
        </label>
      </div>

      {!hasCosts && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Add your monthly pay, team salaries and running costs in{" "}
          <Link href="/settings" className="font-medium underline">
            Settings
          </Link>{" "}
          to see the full picture.
        </p>
      )}
      {result.fee === 0 && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">Add your design fee above — costs are shared by what each project earns.</p>}

      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-6">
        {tiles.map(([label, v]) => (
          <div key={label} className="bg-white px-3 py-2.5">
            <div className="text-[11px] text-ink-3">{label}</div>
            <div className="tabular text-[15px] font-semibold">{v < 0 ? `− ${rupees(-v)}` : rupees(v)}</div>
          </div>
        ))}
        <div className="bg-emerald-50/60 px-3 py-2.5">
          <div className="text-[11px] text-ink-3">You keep</div>
          <div className={cx("tabular text-[15px] font-semibold", result.keep < 0 ? "text-red-700" : "text-emerald-700")}>{rupees(result.keep)}</div>
        </div>
        <div className="bg-white px-3 py-2.5">
          <div className="text-[11px] text-ink-3">After your own pay ({rupees(result.ownPay)})</div>
          <div className={cx("tabular text-[15px] font-semibold", result.profitAfterPay < 0 ? "text-red-700" : "text-ink")}>{rupees(result.profitAfterPay)}</div>
        </div>
      </div>

      {result.avgPerVisit !== null && (
        <p className="mt-3 text-sm text-ink-2">
          A site visit costs you about <strong>{rupees(result.avgPerVisit)}</strong>
          {minV !== maxV && (
            <span className="text-ink-3">
              {" "}
              — from {rupees(minV)} in busy months to {rupees(maxV)} when this is your only project
            </span>
          )}
          .
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead className="bg-canvas text-left text-xs text-ink-3">
            <tr>
              <th className="px-3 py-2 font-medium">Month</th>
              <th className="px-3 font-medium">Other projects</th>
              <th className="px-3 text-right font-medium">Share of costs</th>
              <th className="px-3 text-right font-medium">Fee earned</th>
              <th className="px-3 text-right font-medium">Team</th>
              <th className="px-3 text-right font-medium">Your time</th>
              <th className="px-3 text-right font-medium">Running</th>
              <th className="px-3 text-right font-medium">Visits</th>
              <th className="px-3 text-right font-medium">Per visit</th>
            </tr>
          </thead>
          <tbody>
            {result.months.map((m) => (
              <tr key={m.month} className="border-t border-line">
                <td className="px-3 py-1.5 font-medium">{monthLabel(m.month)}</td>
                <td className="px-3 text-ink-3">{m.sharingWith ? `${m.sharingWith} running` : "only this one"}</td>
                <td className="tabular px-3 text-right">{Math.round(m.share * 100)}%</td>
                <td className="tabular px-3 text-right">{rupees(m.fee)}</td>
                <td className="tabular px-3 text-right">{rupees(m.staff)}</td>
                <td className="tabular px-3 text-right">{rupees(m.ownPay)}</td>
                <td className="tabular px-3 text-right">{rupees(m.running)}</td>
                <td className="tabular px-3 text-right">{m.visits}</td>
                <td className="tabular px-3 text-right font-medium">{m.perVisit !== null ? rupees(m.perVisit) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        {result.others.length
          ? `Sharing costs with: ${result.others.map((o) => `${o.name} (${monthLabel(o.months[0])}–${monthLabel(o.months[o.months.length - 1])}, ${rupees(o.monthlyFee)}/month)`).join(" · ")}.`
          : "No other ongoing projects overlap these months, so this project carries the studio's costs alone."}{" "}
        Projects count as ongoing once marked Sent or Approved and planned here. Each month&apos;s costs are split by what each project earns that month.
      </p>
    </Card>
  );
}
