"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROOM_PRESETS } from "@/lib/constants";
import { useData } from "@/lib/data";
import { newProject } from "@/lib/defaults";
import { GENERAL_ROOM, generateFromTemplates } from "@/lib/templates";
import type { Project } from "@/lib/types";
import { ProjectFields } from "@/components/ProjectFields";
import { Button, LinkButton, Loading, PageHeader } from "@/components/ui";

export default function NewProjectPage() {
  const router = useRouter();
  const { store, settings, saveSettings, rates } = useData();
  const [startWithDraft, setStartWithDraft] = useState(true);
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
      items: startWithDraft ? generateFromTemplates(rooms.filter((r) => r !== GENERAL_ROOM), rates, true) : [],
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
      <label className="mt-8 flex items-start gap-3 rounded-lg border border-line bg-white p-4">
        <input type="checkbox" checked={startWithDraft} onChange={(e) => setStartWithDraft(e.target.checked)} className="mt-0.5 accent-[var(--color-ink)]" />
        <span>
          <span className="block text-sm font-medium">Start with draft lines for these rooms</span>
          <span className="block text-xs text-ink-3">
            Typical items for each room with your library rates and standard scope wording. Quantities stay blank until you enter room sizes or measure. You can remove anything.
          </span>
        </span>
      </label>
      <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
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
