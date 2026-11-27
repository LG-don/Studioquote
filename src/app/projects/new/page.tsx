"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROOM_PRESETS } from "@/lib/constants";
import { useData } from "@/lib/data";
import { newProject } from "@/lib/defaults";
import { GENERAL_ROOM } from "@/lib/templates";
import type { Project } from "@/lib/types";
import { ProjectFields } from "@/components/ProjectFields";
import { Button, LinkButton, Loading, PageHeader } from "@/components/ui";

export default function NewProjectPage() {
  const router = useRouter();
  const { store, settings, saveSettings } = useData();
  const [draft, setDraft] = useState<Project | null>(() =>
    settings ? newProject(settings, { rooms: [...ROOM_PRESETS["3 BHK apartment"]] }) : null,
  );
  const [saving, setSaving] = useState(false);

  if (!settings || !draft) return <Loading />;

  const create = async () => {
    setSaving(true);
    const sameState = draft.clientState === settings.state;
    const rooms = draft.rooms.includes(GENERAL_ROOM) ? draft.rooms : [...draft.rooms, GENERAL_ROOM];
    const p: Project = {
      ...draft,
      name: draft.name.trim() || "Untitled project",
      rooms,
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
      <ProjectFields value={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} presetRoomsOnTypeChange />
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
