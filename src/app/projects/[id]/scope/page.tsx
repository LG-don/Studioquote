"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, Copy, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { useData, useProject } from "@/lib/data";
import { uid } from "@/lib/ids";
import { authHeaders } from "@/lib/supabase";
import { GENERAL_ROOM, generateFromTemplates, itemFromRate } from "@/lib/templates";
import type { Rate, ScopeItem } from "@/lib/types";
import { RatePicker } from "@/components/RatePicker";
import { Badge, Button, cx, EmptyState, Field, Input, LinkButton, Modal, Select, Textarea } from "@/components/ui";

const SOURCE_LABEL: Record<ScopeItem["source"], string> = {
  template: "Template",
  ai: "AI draft",
  manual: "Manual",
  import: "Imported",
  sample: "Sample",
};

export default function ScopePage() {
  const { project, update } = useProject();
  const { rates } = useData();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [draftOpen, setDraftOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [pickerRoom, setPickerRoom] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState("");

  const rooms = useMemo(() => {
    const set = new Set([...project.rooms, ...project.items.map((i) => i.room)]);
    return [...set];
  }, [project.rooms, project.items]);

  const setItem = (id: string, patch: Partial<ScopeItem>) =>
    update((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const removeItem = (id: string) => update((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));
  const duplicate = (it: ScopeItem) =>
    update((p) => {
      const idx = p.items.findIndex((i) => i.id === it.id);
      const copy = { ...it, id: uid("it"), source: "manual" as const };
      const items = [...p.items];
      items.splice(idx + 1, 0, copy);
      return { ...p, items };
    });
  const addItems = (room: string, newItems: ScopeItem[]) =>
    update((p) => {
      // Insert after the last item of the same room to keep rooms together.
      const items = [...p.items];
      let at = -1;
      items.forEach((i, idx) => i.room === room && (at = idx));
      items.splice(at === -1 ? items.length : at + 1, 0, ...newItems);
      return { ...p, items, rooms: p.rooms.includes(room) ? p.rooms : [...p.rooms, room] };
    });

  const addFromRate = (room: string, r: Rate) => {
    const it = { ...itemFromRate(r, r.id, room, "manual") };
    addItems(room, [it]);
    setOpen((o) => ({ ...o, [it.id]: true }));
    setPickerRoom(null);
  };
  const addBlank = (room: string) => {
    const it: ScopeItem = {
      id: uid("it"), room, category: "Custom furniture", item: "", specification: "", brand: "", included: "", excluded: "",
      installation: "", assumptions: "", dependencies: "", qty: null, unit: "nos", materialRate: null, labourRate: null, source: "manual", missing: [],
    };
    addItems(room, [it]);
    setOpen((o) => ({ ...o, [it.id]: true }));
    setPickerRoom(null);
  };

  const shownRooms = roomFilter ? [roomFilter] : rooms;
  const missingCount = project.items.reduce((s, i) => s + i.missing.length, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Scope of work</h2>
          <p className="text-sm text-ink-3">
            What is included, excluded and expected from the client — room by room. {project.items.length} items
            {missingCount > 0 && <> · <span className="text-amber-700">{missingCount} details to confirm</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className="w-44">
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
          <Button variant="primary" onClick={() => setDraftOpen(true)}>
            <Wand2 size={15} /> Draft scope
          </Button>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <div className="mb-1 flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} /> Notes from AI drafting
            </span>
            <button onClick={() => setNotes([])} className="text-sky-700 hover:text-sky-900">
              <X size={14} />
            </button>
          </div>
          <ul className="list-disc space-y-0.5 pl-5">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {project.items.length === 0 ? (
        <EmptyState
          title="No scope items yet"
          body="Draft a scope from standard templates for each room (instant, no AI needed), or let AI read the brief. You can edit everything afterwards."
          action={
            <Button variant="primary" onClick={() => setDraftOpen(true)}>
              <Wand2 size={15} /> Draft scope
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {shownRooms.map((room) => {
            const items = project.items.filter((i) => i.room === room);
            return (
              <section key={room}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {room} <span className="ml-1 font-normal text-ink-3">{items.length}</span>
                  </h3>
                  <div className="relative">
                    <Button size="sm" variant="ghost" onClick={() => setPickerRoom(pickerRoom === room ? null : room)}>
                      <Plus size={13} /> Add item
                    </Button>
                    {pickerRoom === room && (
                      <div className="absolute right-0 top-8">
                        <RatePicker rates={rates} onPick={(r) => addFromRate(room, r)} onClose={() => setPickerRoom(null)} />
                        <button
                          onClick={() => addBlank(room)}
                          className="z-40 mt-1 w-[440px] rounded-lg border border-line bg-white px-3 py-2 text-left text-sm shadow-lg hover:bg-hover"
                        >
                          + Blank item (not in library)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {items.length === 0 ? (
                  <p className="rounded-md border border-dashed border-line-2 px-4 py-3 text-sm text-ink-3">No items in this room.</p>
                ) : (
                  <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
                    {items.map((it) => (
                      <ItemRow
                        key={it.id}
                        it={it}
                        rooms={rooms}
                        open={!!open[it.id]}
                        onToggle={() => setOpen((o) => ({ ...o, [it.id]: !o[it.id] }))}
                        onChange={(patch) => setItem(it.id, patch)}
                        onDelete={() => removeItem(it.id)}
                        onDuplicate={() => duplicate(it)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {project.items.length > 0 && (
        <div className="mt-8 flex justify-end border-t border-line pt-5">
          <LinkButton href={`/projects/${project.id}/pricing`} variant="primary">
            Next: pricing <ArrowRight size={15} />
          </LinkButton>
        </div>
      )}

      <DraftModal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        rooms={rooms}
        onDone={(newItems, replaceRooms, aiNotes) => {
          update((p) => {
            const kept = p.items.filter((i) => !replaceRooms.includes(i.room));
            const order = [...p.rooms];
            const merged = [...kept, ...newItems].sort((a, b) => order.indexOf(a.room) - order.indexOf(b.room));
            return { ...p, items: merged };
          });
          setNotes(aiNotes);
          setDraftOpen(false);
        }}
      />
    </div>
  );
}

function ItemRow({
  it,
  rooms,
  open,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
}: {
  it: ScopeItem;
  rooms: string[];
  open: boolean;
  onToggle: () => void;
  onChange: (p: Partial<ScopeItem>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className={cx(open && "bg-canvas/60")}>
      <div className="group flex cursor-pointer items-start gap-3 px-4 py-3" onClick={onToggle}>
        <span className="mt-0.5 text-ink-3">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{it.item || <span className="text-ink-3">Untitled item</span>}</span>
            <Badge>{it.category}</Badge>
            {it.source === "ai" && <Badge tone="blue">AI draft</Badge>}
            {it.missing.length > 0 && <Badge tone="amber">{it.missing.length} to confirm</Badge>}
          </div>
          {!open && (
            <div className="mt-0.5 truncate text-xs text-ink-3">
              {[it.specification, it.brand].filter(Boolean).join(" · ") || "No specification"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <button onClick={onDuplicate} className="rounded p-1 text-ink-3 hover:bg-hover hover:text-ink" title="Duplicate">
            <Copy size={13} />
          </button>
          <button onClick={onDelete} className="rounded p-1 text-ink-3 hover:bg-red-50 hover:text-red-700" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {open && (
        <div className="space-y-4 px-11 pb-5">
          {it.missing.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {it.missing.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 py-0.5 pl-2 pr-1 text-xs text-amber-900">
                  {m}
                  <button
                    onClick={() => onChange({ missing: it.missing.filter((x) => x !== m) })}
                    className="rounded px-1 text-amber-700 hover:bg-amber-100"
                    title="Mark as resolved"
                  >
                    ✓
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-6 gap-3">
            <Field label="Item" className="col-span-3">
              <Input value={it.item} onChange={(e) => onChange({ item: e.target.value })} />
            </Field>
            <Field label="Category" className="col-span-2">
              <Select value={it.category} onChange={(e) => onChange({ category: e.target.value })}>
                {!CATEGORIES.includes(it.category as (typeof CATEGORIES)[number]) && <option>{it.category}</option>}
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Room">
              <Select value={it.room} onChange={(e) => onChange({ room: e.target.value })}>
                {rooms.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
            <Field label="Material specification" className="col-span-4">
              <Input value={it.specification} onChange={(e) => onChange({ specification: e.target.value })} />
            </Field>
            <Field label="Brand / finish" className="col-span-2">
              <Input value={it.brand} onChange={(e) => onChange({ brand: e.target.value })} placeholder="e.g. Hettich, or 'equivalent approved'" />
            </Field>
            <Field label="Work included" className="col-span-3">
              <Textarea value={it.included} onChange={(e) => onChange({ included: e.target.value })} className="min-h-[64px]" />
            </Field>
            <Field label="Work excluded" className="col-span-3">
              <Textarea value={it.excluded} onChange={(e) => onChange({ excluded: e.target.value })} className="min-h-[64px]" />
            </Field>
            <Field label="Installation" className="col-span-2">
              <Textarea value={it.installation} onChange={(e) => onChange({ installation: e.target.value })} className="min-h-[64px]" />
            </Field>
            <Field label="Assumptions" className="col-span-2">
              <Textarea value={it.assumptions} onChange={(e) => onChange({ assumptions: e.target.value })} className="min-h-[64px]" />
            </Field>
            <Field label="Client dependencies" className="col-span-2">
              <Textarea value={it.dependencies} onChange={(e) => onChange({ dependencies: e.target.value })} className="min-h-[64px]" />
            </Field>
          </div>
          <p className="text-xs text-ink-3">Source: {SOURCE_LABEL[it.source]}. Quantity and rates are set on the Pricing tab.</p>
        </div>
      )}
    </div>
  );
}

interface AiItem {
  room: string; category: string; item: string; specification: string; brand: string; included: string; excluded: string;
  installation: string; assumptions: string; dependencies: string; unit: string; rateId: string | null; missing: string[];
}

function DraftModal({
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
