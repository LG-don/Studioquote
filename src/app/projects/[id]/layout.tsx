"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useMemo } from "react";
import { Check, ChevronLeft, CloudOff, Loader2 } from "lucide-react";
import { calcProject } from "@/lib/calc";
import { ENGAGEMENT_LABEL } from "@/lib/constants";
import { ProjectProvider, useData, useProjectState } from "@/lib/data";
import { rupees } from "@/lib/format";
import { runScopeGuard } from "@/lib/scopeguard";
import type { ProjectStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/components/ProjectTable";
import { useKeep } from "@/components/useKeep";
import { cx, EmptyState, LinkButton, Loading } from "@/components/ui";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const { rates } = useData();
  const state = useProjectState(id);
  const { project, loading, saveState, update } = state;

  const calc = useMemo(() => (project ? calcProject(project) : null), [project]);
  const keep = useKeep(project);
  const findings = useMemo(() => (project && calc ? runScopeGuard(project, calc, rates) : []), [project, calc, rates]);

  if (loading) return <Loading />;
  if (!project || !calc)
    return (
      <div className="mx-auto max-w-3xl px-8 py-16">
        <EmptyState title="Project not found" action={<LinkButton href="/projects">Back to projects</LinkButton>} />
      </div>
    );

  const blockers = findings.filter((f) => f.severity === "blocker").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const base = `/projects/${id}`;
  const tabs = [
    { href: base, label: "Details", n: "1" },
    { href: `${base}/quote`, label: "Quote", n: "2", count: (project.engagement === "design_only" ? project.items.filter((i) => i.category === "Design services").length : project.items.length) || undefined },
    { href: `${base}/proposal`, label: "Check & send", n: "3", alert: blockers + warnings || undefined },
    { href: `${base}/versions`, label: "History", count: project.versions.length || undefined },
  ];

  return (
    <ProjectProvider value={{ ...state, project }}>
      <div className="border-b border-line bg-white">
        <div className="px-4 pt-5 md:px-8">
          <Link href="/projects" className="mb-2 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink">
            <ChevronLeft size={13} /> Projects
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="truncate text-xl font-semibold tracking-tight">{project.name || "Untitled project"}</h1>
                <select
                  value={project.status}
                  onChange={(e) => update((p) => ({ ...p, status: e.target.value as ProjectStatus }))}
                  className="rounded border border-line bg-hover px-1.5 py-0.5 text-xs text-ink-2 outline-none"
                >
                  {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <SaveIndicator state={saveState} />
              </div>
              <div className="mt-0.5 text-sm text-ink-3">
                {[ENGAGEMENT_LABEL[project.engagement ?? "turnkey"], project.clientName, project.propertyType, project.location, project.quoteNumber].filter(Boolean).join(" · ")}
                {project.isSample && <span className="ml-2 rounded bg-amber-50 px-1.5 py-px text-xs text-amber-800">Sample data</span>}
              </div>
            </div>
            <div className="flex shrink-0 gap-6 text-right">
              <div>
                <div className="text-xs text-ink-3">Quote total</div>
                <div className="tabular text-[17px] font-semibold">{rupees(calc.grandTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-ink-3">{keep?.planned ? "You keep (after costs)" : "Your profit"}</div>
                <div className={cx("tabular text-[17px] font-semibold", (keep?.value ?? calc.profit) < 0 ? "text-red-700" : "text-emerald-700")}>
                  {rupees(keep?.value ?? calc.profit)}
                  <span className="ml-1 text-xs font-normal text-ink-3">{calc.taxable ? `${(keep?.pct ?? calc.marginPct).toFixed(1)}%` : ""}</span>
                </div>
              </div>
            </div>
          </div>
          <nav className="mt-4 flex gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cx(
                    "-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm",
                    active ? "border-ink font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink",
                  )}
                >
                  {t.n && <span className={cx("text-xs", active ? "text-ink-3" : "text-ink-3/70")}>{t.n}</span>}
                  {t.label}
                  {t.count !== undefined && <span className="rounded bg-hover px-1.5 text-[11px] text-ink-3">{t.count}</span>}
                  {t.alert !== undefined && (
                    <span className={cx("rounded px-1.5 text-[11px]", blockers ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}>{t.alert}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="px-4 py-6 md:px-8">{children}</div>
    </ProjectProvider>
  );
}

function SaveIndicator({ state }: { state: string }) {
  if (state === "saving")
    return (
      <span className="flex items-center gap-1 text-xs text-ink-3">
        <Loader2 size={12} className="animate-spin" /> Saving
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1 text-xs text-ink-3">
        <Check size={12} /> Saved
      </span>
    );
  if (state === "error")
    return (
      <span className="flex items-center gap-1 text-xs text-red-700">
        <CloudOff size={12} /> Not saved — check connection
      </span>
    );
  return null;
}
