"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { calcQuote } from "@/lib/calc";
import { useData } from "@/lib/data";
import { DEFAULT_SETTINGS, sampleProject } from "@/lib/defaults";
import { rupeesShort } from "@/lib/format";
import type { Project } from "@/lib/types";
import { ProjectTable } from "@/components/ProjectTable";
import { Button, Card, EmptyState, LinkButton, Loading, PageHeader, SectionTitle } from "@/components/ui";

export default function Dashboard() {
  const { store, settings } = useData();
  const [projects, setProjects] = useState<Project[] | null>(null);

  const load = () => store.listProjects().then(setProjects);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  if (!projects || !settings) return <Loading />;

  const totals = projects.map((p) => ({ p, c: calcQuote(p.items, p.quote) }));
  const open = totals.filter((t) => t.p.status !== "approved");
  const approved = totals.filter((t) => t.p.status === "approved");
  const pipeline = open.reduce((s, t) => s + t.c.grandTotal, 0);
  const won = approved.reduce((s, t) => s + t.c.grandTotal, 0);
  const priced = totals.filter((t) => t.c.taxable > 0);
  const avgMargin = priced.length ? priced.reduce((s, t) => s + t.c.marginPct, 0) / priced.length : 0;
  const expectedProfit = open.reduce((s, t) => s + t.c.profit, 0);

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
          { label: "Active projects", value: String(open.length) },
          { label: "Quotes in progress", value: rupeesShort(pipeline), sub: "incl. GST" },
          { label: "Expected profit on open quotes", value: rupeesShort(expectedProfit) },
          { label: "Average margin", value: `${avgMargin.toFixed(1)}%`, sub: approved.length ? `${rupeesShort(won)} approved` : undefined },
        ].map((s) => (
          <Card key={s.label} className="px-4 py-3.5">
            <div className="text-xs text-ink-3">{s.label}</div>
            <div className="tabular mt-1 text-xl font-semibold tracking-tight">{s.value}</div>
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
        <ProjectTable projects={projects.slice(0, 6)} />
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
