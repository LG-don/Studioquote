"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "@/lib/data";
import { newProject } from "@/lib/defaults";
import type { Project } from "@/lib/types";
import { EngagementPicker, ProjectFields } from "@/components/ProjectFields";
import { Button, LinkButton, Loading, PageHeader } from "@/components/ui";

export default function NewProjectPage() {
  const router = useRouter();
  const { store, settings, saveSettings } = useData();
  const [draft, setDraft] = useState<Project | null>(() =>
    settings ? newProject(settings, { rooms: [] }) : null,
  );
  const [saving, setSaving] = useState(false);

  if (!settings || !draft) return <Loading />;

  const create = async () => {
    setSaving(true);
    const sameState = draft.clientState === settings.state;
    const p: Project = {
      ...draft,
      name: draft.name.trim() || "Untitled project",
      delegated: draft.engagement === "mixed" ? draft.delegated : {},
      items: [], // every project starts as a clean slate
      quote: {
        ...draft.quote,
        gstMode: settings.gstin ? (sameState ? "cgst_sgst" : "igst") : "none",
      },
    };
    await store.saveProject(p);
    await saveSettings({ ...settings, nextQuoteNo: settings.nextQuoteNo + 1 });
    router.push(`/projects/${p.id}/quote`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <PageHeader title="New project" subtitle={`Quotation no. ${draft.quoteNumber}`} />
      <section className="mb-9">
        <h3 className="text-sm font-semibold">What are you quoting for?</h3>
        <div className="mt-3">
          <EngagementPicker
            engagement={draft.engagement ?? "turnkey"}
            delegated={draft.delegated ?? {}}
            onChange={(patch) => setDraft({ ...draft, ...patch })}
          />
        </div>
      </section>
      <ProjectFields value={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} />
      <div className="mt-8 flex justify-end gap-2 border-t border-line pt-5">
        <LinkButton href="/projects" variant="ghost">
          Cancel
        </LinkButton>
        <Button variant="primary" onClick={create} disabled={saving}>
          Create project
        </Button>
      </div>
    </div>
  );
}
