"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { useData, useProject } from "@/lib/data";
import { uid } from "@/lib/ids";
import { RATE_BASIS } from "@/lib/measure";
import { authHeaders } from "@/lib/supabase";
import { GENERAL_ROOM, generateFromTemplates } from "@/lib/templates";
import type { ScopeItem } from "@/lib/types";
import { Button, cx, Modal } from "@/components/ui";

interface AiItem {
  room: string; category: string; item: string; specification: string; brand: string; included: string; excluded: string;
  installation: string; assumptions: string; dependencies: string; unit: string; rateId: string | null; missing: string[];
}

export function DraftModal({
  open,
  onClose,
  rooms,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  rooms: string[];
  onDone: (items: ScopeItem[], replaceRooms: string[], notes: string[]) => void;
}) {
  const { project } = useProject();
  const { rates, ai } = useData();
  const emptyRooms = rooms.filter((r) => !project.items.some((i) => i.room === r));
  const [mode, setMode] = useState<"template" | "ai">("template");
  const [selected, setSelected] = useState<string[]>([]);
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset selection whenever the modal opens.
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setSelected(emptyRooms.length ? emptyRooms : rooms);
      setError(null);
    }
  }

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "template") {
        const items = generateFromTemplates(selected.filter((r) => r !== GENERAL_ROOM), rates, selected.includes(GENERAL_ROOM));
        onDone(items, replace ? selected : [], []);
      } else {
        const res = await fetch("/api/ai/scope", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({
            project: {
              name: project.name, propertyType: project.propertyType, projectType: project.projectType, carpetArea: project.carpetArea,
              location: project.location, description: project.description, requirements: project.requirements,
            },
            rooms: selected,
            fileTexts: project.files.filter((f) => f.extractedText).map((f) => `## ${f.name}\n${f.extractedText}`),
            rateCatalog: rates.map((r) => ({ id: r.id, category: r.category, name: r.name, unit: r.unit })),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "AI request failed");
        const byId = new Map(rates.map((r) => [r.id, r]));
        const items: ScopeItem[] = (json.items as AiItem[]).map((a) => {
          const r = a.rateId ? byId.get(a.rateId) : undefined;
          return {
            id: uid("it"),
            room: a.room, category: a.category, item: a.item, specification: a.specification, brand: a.brand,
            included: a.included, excluded: a.excluded, installation: a.installation, assumptions: a.assumptions, dependencies: a.dependencies,
            qty: null, // AI never sets quantities
            unit: r?.unit || a.unit || "nos",
            materialRate: r ? r.materialRate : null,
            labourRate: r ? r.labourRate : null,
            rateId: r?.id,
            source: "ai",
            missing: a.missing,
            qtyBasis: r ? RATE_BASIS[r.id] : undefined,
            qtyAuto: r && RATE_BASIS[r.id] ? true : undefined,
          };
        });
        onDone(items, replace ? selected : [], json.notes ?? []);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Draft scope of work"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={run} disabled={busy || selected.length === 0}>
            {busy ? (mode === "ai" ? "Drafting… (can take ~30 s)" : "Drafting…") : `Draft ${selected.length} room${selected.length === 1 ? "" : "s"}`}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("template")}
            className={cx("rounded-lg border p-3 text-left", mode === "template" ? "border-ink ring-1 ring-ink" : "border-line hover:bg-hover")}
          >
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Wand2 size={14} /> Standard templates
            </div>
            <div className="mt-1 text-xs text-ink-3">Instant. Typical items for each room type, with scope wording and your library rates.</div>
          </button>
          <button
            onClick={() => ai.enabled && setMode("ai")}
            disabled={!ai.enabled}
            className={cx(
              "rounded-lg border p-3 text-left",
              mode === "ai" ? "border-ink ring-1 ring-ink" : "border-line",
              ai.enabled ? "hover:bg-hover" : "cursor-not-allowed opacity-60",
            )}
          >
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles size={14} /> AI from the brief
            </div>
            <div className="mt-1 text-xs text-ink-3">
              {ai.enabled
                ? "Reads the description, requirements and uploaded spreadsheets. Flags anything unclear."
                : "Not connected. Add an OpenAI key to enable (see README). Templates work without it."}
            </div>
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink-2">Rooms</span>
            <span className="space-x-2 text-xs">
              <button className="text-ink-3 hover:text-ink" onClick={() => setSelected(rooms)}>All</button>
              <button className="text-ink-3 hover:text-ink" onClick={() => setSelected([])}>None</button>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {rooms.map((r) => {
              const n = project.items.filter((i) => i.room === r).length;
              return (
                <label key={r} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-hover">
                  <input
                    type="checkbox"
                    checked={selected.includes(r)}
                    onChange={(e) => setSelected(e.target.checked ? [...selected, r] : selected.filter((x) => x !== r))}
                    className="accent-[var(--color-ink)]"
                  />
                  {r}
                  {n > 0 && <span className="text-xs text-ink-3">· {n} items</span>}
                </label>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="accent-[var(--color-ink)]" />
          Replace existing items in the selected rooms
        </label>
        <p className="text-xs text-ink-3">Quantities are always left blank for you to measure. Nothing is priced by AI — rates come from your library.</p>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
