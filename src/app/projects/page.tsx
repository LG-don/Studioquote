"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useData } from "@/lib/data";
import { quoteNumber, sampleProject } from "@/lib/defaults";
import { uid } from "@/lib/ids";
import type { Project, ProjectStatus } from "@/lib/types";
import { ProjectTable } from "@/components/ProjectTable";
import { Button, EmptyState, Input, LinkButton, Loading, PageHeader, Select } from "@/components/ui";

export default function ProjectsPage() {
  const { store, settings, saveSettings } = useData();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | ProjectStatus>("");

  const load = () => store.listProjects().then(setProjects);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  if (!projects || !settings) return <Loading />;

  const filtered = projects.filter(
    (p) =>
      (!status || p.status === status) &&
      `${p.name} ${p.clientName} ${p.location}`.toLowerCase().includes(q.toLowerCase()),
  );

  const remove = async (p: Project) => {
    if (!confirm(`Delete "${p.name || "Untitled project"}" and its files? This cannot be undone.`)) return;
    await store.deleteProject(p.id);
    load();
  };

  const duplicate = async (p: Project) => {
    const now = new Date().toISOString();
    const copy: Project = {
      ...JSON.parse(JSON.stringify(p)),
      id: uid("prj"),
      name: `${p.name || "Untitled project"} (copy)`,
      quoteNumber: quoteNumber(settings),
      status: "draft",
      versions: [],
      files: [], // files stay with the original project
      isSample: false,
      createdAt: now,
      updatedAt: now,
    };
    await store.saveProject(copy);
    await saveSettings({ ...settings, nextQuoteNo: settings.nextQuoteNo + 1 });
    load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length === 1 ? "" : "s"}`}
        actions={
          <LinkButton href="/projects/new" variant="primary">
            <Plus size={15} /> New project
          </LinkButton>
        }
      />
      <div className="mb-4 flex gap-2">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search project, client, location" className="pl-8" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | "")} className="w-40">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="approved">Approved</option>
        </Select>
      </div>
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          action={
            <>
              <Button
                onClick={async () => {
                  await store.saveProject(sampleProject(settings));
                  load();
                }}
              >
                Load sample project
              </Button>
              <LinkButton href="/projects/new" variant="primary">
                New project
              </LinkButton>
            </>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching projects" />
      ) : (
        <ProjectTable projects={filtered} all={projects} onDelete={remove} onDuplicate={duplicate} />
      )}
    </div>
  );
}
