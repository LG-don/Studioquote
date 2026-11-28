"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { calcProject } from "@/lib/calc";
import { useData } from "@/lib/data";
import { DEFAULT_SETTINGS, sampleProject } from "@/lib/defaults";
import { keepFor, monthKey, monthLabel, salaryOf, studioMonth } from "@/lib/costing";
import { rupeesShort } from "@/lib/format";
import type { Project } from "@/lib/types";
import { ProjectTable } from "@/components/ProjectTable";
import { Button, Card, cx, EmptyState, LinkButton, Loading, PageHeader, SectionTitle } from "@/components/ui";

export default function Dashboard() {
  const { store, settings } = useData();
  const [projects, setProjects] = useState<Project[] | null>(null);

  const load = () => store.listProjects().then(setProjects);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  if (!projects || !settings) return <Loading />;

  const totals = projects.map((p) => ({ p, c: calcProject(p) }));
  const open = totals.filter((t) => t.p.status !== "approved");
  const approved = totals.filter((t) => t.p.status === "approved");
  const pipeline = open.reduce((s, t) => s + t.c.grandTotal, 0);
  const won = approved.reduce((s, t) => s + t.c.grandTotal, 0);
  const real = projects.filter((p) => !p.isSample);
  const ongoing = real.filter((p) => p.status !== "draft");
  const ongoingEarns = ongoing.reduce((s, p) => s + keepFor(p, real, settings.studioCosts).value, 0);
  // This month, or the next month (within a year) that has ongoing projects running.
  const upcoming = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + i);
    return monthKey(d);
  });
  const shownMonth = upcoming.find((m) => studioMonth(real, settings.studioCosts, m).projects > 0) ?? upcoming[0];
  const thisMonth = studioMonth(real, settings.studioCosts, shownMonth);
  const salary = salaryOf(settings.studioCosts);
  const earnsNote = salary > 0 ? `after your ${rupeesShort(salary)}/month salary` : "no fixed salary — this is your income";

  const loadSample = async () => {
    await store.saveProject(sampleProject(settings));
    load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <PageHeader
        title="Dashboard"
        subtitle={settings.studioName}
        actions={
          <LinkButton href="/projects/new" variant="primary">
            <Plus size={15} /> New project
          </LinkButton>
        }
      />

      {settings.studioName === DEFAULT_SETTINGS.studioName && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/20 bg-accent-soft px-4 py-3">
          <div>
            <div className="text-sm font-medium text-accent">Set up your studio — takes 2 minutes</div>
            <div className="text-xs text-ink-2">Add your studio name, logo and GSTIN so every proposal carries your branding and the right tax.</div>
          </div>
          <LinkButton href="/settings" variant="primary" size="sm">Open settings</LinkButton>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Ongoing projects", value: String(ongoing.length), sub: `${real.length - ongoing.length} in draft` },
          { label: "Quotes in progress", value: rupeesShort(pipeline), sub: approved.length ? `${rupeesShort(won)} approved · incl. GST` : "incl. GST" },
          {
            label: shownMonth === upcoming[0] ? "Studio earns this month" : `Studio earns in ${monthLabel(shownMonth)}`,
            value: thisMonth.projects ? rupeesShort(thisMonth.earns) : "—",
            sub: thisMonth.projects ? `${thisMonth.projects} project${thisMonth.projects === 1 ? "" : "s"} running · ${earnsNote}` : "approve and plan projects to see this",
            tone: thisMonth.earns < 0 ? "bad" : "good",
          },
          { label: "Studio earns on ongoing projects", value: rupeesShort(ongoingEarns), sub: earnsNote, tone: ongoingEarns < 0 ? "bad" : "good" },
        ].map((s: { label: string; value: string; sub?: string; tone?: string }) => (
          <Card key={s.label} className="px-4 py-3.5">
            <div className="text-xs text-ink-3">{s.label}</div>
            <div className={cx("tabular mt-1 text-xl font-semibold tracking-tight", s.tone === "bad" && "text-red-700", s.tone === "good" && "text-emerald-700")}>{s.value}</div>
            {s.sub && <div className="text-xs text-ink-3">{s.sub}</div>}
          </Card>
        ))}
      </div>

      <SectionTitle actions={projects.length > 0 && <LinkButton href="/projects" variant="ghost" size="sm">View all</LinkButton>}>
        Recent projects
      </SectionTitle>
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Create your first project, or load a sample 3BHK project to see how a quotation comes together."
          action={
            <>
              <Button onClick={loadSample}>Load sample project</Button>
              <LinkButton href="/projects/new" variant="primary">
                New project
              </LinkButton>
            </>
          }
        />
      ) : (
        <ProjectTable projects={projects.slice(0, 6)} all={projects} />
      )}

      <div className="mt-10 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        {[
          ["1", "Details", "Client, property, rooms and files"],
          ["2", "Quote", "Room-by-room lines with scope and price — quantities from room sizes"],
          ["3", "Check & send", "Catch gaps, then download or WhatsApp the PDF"],
        ].map(([n, t, d]) => (
          <div key={n} className="rounded-lg border border-line px-4 py-3">
            <div className="text-xs text-ink-3">Step {n}</div>
            <div className="font-medium">{t}</div>
            <div className="text-xs text-ink-3">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
