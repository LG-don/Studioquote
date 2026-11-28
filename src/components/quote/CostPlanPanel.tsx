"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { costProject, defaultPlan, monthLabel, notCounted, ongoingPortfolio, salaryOf } from "@/lib/costing";
import { useData, useProject } from "@/lib/data";
import { rupees } from "@/lib/format";
import type { CostPlan, Project } from "@/lib/types";
import { Button, Card, cx, NumberInput } from "@/components/ui";

const box = "h-9 w-full rounded-md border border-line-2 bg-white px-3 text-sm outline-none focus:border-accent";

/**
 * What a project really earns the studio after team, your salary (if you draw one),
 * running costs and renders — shared month by month with the other ongoing projects.
 * Internal only.
 */
export function CostPlanPanel() {
  const { project, update } = useProject();
  const { store, settings } = useData();
  const [all, setAll] = useState<Project[]>([]);
  useEffect(() => {
    store.listProjects().then(setAll).catch(() => setAll([]));
  }, [store]);

  const costs = settings?.studioCosts;
  const hasCosts = !!costs && (salaryOf(costs) > 0 || costs.otherMonthly > 0 || costs.staff.length > 0 || costs.renderCost > 0);
  const portfolio = useMemo(() => ongoingPortfolio(all.filter((p) => p.id !== project.id)), [all, project.id]);
  const missing = useMemo(() => notCounted(all, project.id), [all, project.id]);
  const r = useMemo(() => costProject(project, portfolio, costs), [project, portfolio, costs]);
  const plan = project.plan;
  const engagement = project.engagement ?? "turnkey";
  const setPlan = (patch: Partial<CostPlan>) => update((p) => ({ ...p, plan: { ...(p.plan ?? defaultPlan()), ...patch } }));

  const header = (
    <div className="mb-4">
      <h3 className="flex items-center gap-1.5 text-[15px] font-semibold">
        <Lock size={14} className="text-ink-3" /> What this project earns your studio
      </h3>
      <p className="text-xs text-ink-3">Internal only — the client never sees this.</p>
    </div>
  );

  if (!plan || !r) {
    return (
      <Card className="mt-6 p-5">
        {header}
        <p className="mb-3 text-sm text-ink-2">
          Add the months, site visits and 3D renders to see your cost per site visit and what the studio really earns after team and running costs.
        </p>
        <Button variant="primary" onClick={() => setPlan({})}>
          Plan this project
        </Button>
      </Card>
    );
  }

  const earnedLabel = engagement === "design_only" ? "Fee (excl. GST)" : "Earned after material & labour";
  const parts: [string, number][] = [
    [earnedLabel, r.earned],
    ["Team", -r.team],
    ...(r.drawsSalary ? ([["Your salary", -r.salary]] as [string, number][]) : []),
    ["Running costs", -r.running],
    ["3D renders", -r.renders],
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
          Add your team, running costs and salary choice in{" "}
          <Link href="/settings" className="font-medium underline">
            Settings → Studio running costs
          </Link>{" "}
          to see the full picture.
        </p>
      )}
      {r.earned === 0 && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">Price the quote first — costs are shared by what each project earns.</p>}

      {/* Two headline numbers */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-white px-4 py-3">
          <div className="text-xs text-ink-3">Cost of one site visit</div>
          <div className="tabular text-2xl font-semibold tracking-tight">{r.perVisit !== null ? rupees(r.perVisit) : "—"}</div>
          <div className="text-xs text-ink-3">
            {r.perVisit === null
              ? "Add site visits to see this."
              : r.perVisitRange && r.perVisitRange[0] !== r.perVisitRange[1]
                ? `Between ${rupees(r.perVisitRange[0])} and ${rupees(r.perVisitRange[1])} depending on the month — cheaper when more projects run alongside or you visit more often.`
                : `Your ${r.drawsSalary ? "salary and " : ""}running costs for this project ÷ ${plan.visits} visits. Drops as more projects run alongside.`}
          </div>
        </div>
        <div className={cx("rounded-lg border px-4 py-3", r.studioEarns < 0 ? "border-red-200 bg-red-50/50" : "border-emerald-200 bg-emerald-50/50")}>
          <div className="text-xs text-ink-3">Studio earns from this project</div>
          <div className={cx("tabular text-2xl font-semibold tracking-tight", r.studioEarns < 0 ? "text-red-700" : "text-emerald-700")}>{rupees(r.studioEarns)}</div>
          <div className="text-xs text-ink-3">
            {r.drawsSalary
              ? `After paying your fixed salary (${rupees(salaryOf(costs))}/month, ${rupees(r.salary)} charged to this project).`
              : "You don't draw a fixed salary, so this is what the studio — and you — earn."}
          </div>
        </div>
      </div>

      {/* How it adds up */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-canvas px-3 py-2 text-[13px]">
        {parts.map(([label, v], i) => (
          <span key={label} className="whitespace-nowrap">
            {i > 0 && <span className="mr-2 text-ink-3">−</span>}
            <span className="text-ink-3">{label}</span> <span className="tabular font-medium">{rupees(Math.abs(v))}</span>
          </span>
        ))}
        <span className="whitespace-nowrap">
          <span className="mr-2 text-ink-3">=</span>
          <span className="tabular font-semibold">{rupees(r.studioEarns)}</span>
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead className="bg-canvas text-left text-xs text-ink-3">
            <tr>
              <th className="px-3 py-2 font-medium">Month</th>
              <th className="px-3 font-medium">Projects running</th>
              <th className="px-3 text-right font-medium">Share of costs</th>
              <th className="px-3 text-right font-medium">Earned</th>
              <th className="px-3 text-right font-medium">Team</th>
              {r.drawsSalary && <th className="px-3 text-right font-medium">Your salary</th>}
              <th className="px-3 text-right font-medium">Running</th>
              <th className="px-3 text-right font-medium">Visits</th>
              <th className="px-3 text-right font-medium">Per visit</th>
            </tr>
          </thead>
          <tbody>
            {r.months.map((m) => (
              <tr key={m.month} className="border-t border-line">
                <td className="px-3 py-1.5 font-medium">{monthLabel(m.month)}</td>
                <td className="px-3 text-ink-3">{m.sharingWith ? `${m.sharingWith + 1} (this + ${m.sharingWith})` : "only this one"}</td>
                <td className="tabular px-3 text-right">{Math.round(m.share * 100)}%</td>
                <td className="tabular px-3 text-right">{rupees(m.earned)}</td>
                <td className="tabular px-3 text-right">{rupees(m.team)}</td>
                {r.drawsSalary && <td className="tabular px-3 text-right">{rupees(m.salary)}</td>}
                <td className="tabular px-3 text-right">{rupees(m.running)}</td>
                <td className="tabular px-3 text-right">{m.visits}</td>
                <td className="tabular px-3 text-right font-medium">{m.perVisit !== null ? rupees(m.perVisit) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-1 text-xs leading-relaxed text-ink-3">
        <p>
          {r.others.length
            ? `Sharing costs with: ${r.others.map((o) => `${o.name} (${monthLabel(o.months[0])}–${monthLabel(o.months[o.months.length - 1])})`).join(" · ")}.`
            : "No other ongoing project overlaps these months, so this one carries the studio's costs alone."}{" "}
          Each month&apos;s costs are split by what each project earns that month.
        </p>
        {(missing.drafts > 0 || missing.unplanned > 0) && (
          <p className="text-amber-800">
            Not counted yet:{" "}
            {[
              missing.drafts ? `${missing.drafts} project${missing.drafts === 1 ? " is" : "s are"} still Draft` : "",
              missing.unplanned ? `${missing.unplanned} ongoing project${missing.unplanned === 1 ? " has" : "s have"} no months planned` : "",
            ]
              .filter(Boolean)
              .join(" and ")}
            . Mark running projects as <strong>Approved</strong> and plan them on their Quote tab, and your visit cost here updates automatically.{" "}
            <Link href="/projects" className="underline">
              Open projects
            </Link>
          </p>
        )}
      </div>
    </Card>
  );
}
