"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { INDIAN_STATES, PROPERTY_TYPES, ROOM_PRESETS } from "@/lib/constants";
import type { Project } from "@/lib/types";
import { Field, Input, NumberInput, Select, Textarea } from "./ui";

type P = Pick<
  Project,
  | "name" | "clientName" | "clientPhone" | "clientEmail" | "clientAddress" | "location" | "clientState"
  | "propertyType" | "carpetArea" | "projectType" | "budget" | "description" | "requirements" | "rooms"
>;

export function ProjectFields<T extends P>({
  value,
  onChange,
  presetRoomsOnTypeChange,
}: {
  value: T;
  onChange: (patch: Partial<P>) => void;
  presetRoomsOnTypeChange?: boolean;
}) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-sm font-semibold">Project</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Project name">
            <Input value={value.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Mehta Residence" />
          </Field>
          <Field label="Location">
            <Input value={value.location} onChange={(e) => onChange({ location: e.target.value })} placeholder="e.g. Baner, Pune" />
          </Field>
          <Field label="Property type">
            <Select
              value={value.propertyType}
              onChange={(e) => {
                const propertyType = e.target.value;
                const patch: Partial<P> = { propertyType };
                if (/office|retail|café/i.test(propertyType)) patch.projectType = "commercial";
                else patch.projectType = "residential";
                if (presetRoomsOnTypeChange) patch.rooms = ROOM_PRESETS[propertyType] ?? [];
                onChange(patch);
              }}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Project type">
              <Select value={value.projectType} onChange={(e) => onChange({ projectType: e.target.value as P["projectType"] })}>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </Select>
            </Field>
            <Field label="Carpet area (sq.ft)">
              <NumberInput
                value={value.carpetArea}
                onChange={(v) => onChange({ carpetArea: v })}
                className="h-9 w-full rounded-md border border-line-2 bg-white px-3 text-sm outline-none focus:border-accent"
                placeholder="1450"
              />
            </Field>
          </div>
          <Field label="Client's budget (₹)" hint="Optional. Used to warn you if the quote runs over.">
            <NumberInput
              value={value.budget}
              onChange={(v) => onChange({ budget: v })}
              className="h-9 w-full rounded-md border border-line-2 bg-white px-3 text-sm outline-none focus:border-accent"
              placeholder="2800000"
            />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Client</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client name">
            <Input value={value.clientName} onChange={(e) => onChange({ clientName: e.target.value })} />
          </Field>
          <Field label="Client state" hint="Decides CGST + SGST (same state) or IGST.">
            <Select value={value.clientState} onChange={(e) => onChange({ clientState: e.target.value })}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Phone">
            <Input value={value.clientPhone} onChange={(e) => onChange({ clientPhone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={value.clientEmail} onChange={(e) => onChange({ clientEmail: e.target.value })} />
          </Field>
          <Field label="Site address" className="col-span-2">
            <Input value={value.clientAddress} onChange={(e) => onChange({ clientAddress: e.target.value })} />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold">Rooms</h3>
        <p className="mb-3 text-xs text-ink-3">The scope and quotation are organised by these rooms.</p>
        <RoomsEditor rooms={value.rooms} onChange={(rooms) => onChange({ rooms })} />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Brief</h3>
        <div className="space-y-4">
          <Field label="Project description">
            <Textarea
              value={value.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Who is the client, what is the look and feel, any constraints…"
            />
          </Field>
          <Field label="Client requirements" hint="Write it the way the client said it. AI drafting reads this; templates don't need it.">
            <Textarea
              value={value.requirements}
              onChange={(e) => onChange({ requirements: e.target.value })}
              className="min-h-[120px]"
              placeholder="Modular kitchen with tall unit, sliding wardrobe in master bedroom, keep existing flooring in bedrooms…"
            />
          </Field>
        </div>
      </section>
    </div>
  );
}

export function RoomsEditor({ rooms, onChange }: { rooms: string[]; onChange: (r: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const name = draft.trim();
    if (!name || rooms.includes(name)) return;
    onChange([...rooms, name]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {rooms.map((r) => (
        <span key={r} className="inline-flex items-center gap-1 rounded-md border border-line-2 bg-white py-1 pl-2.5 pr-1 text-[13px]">
          {r}
          <button onClick={() => onChange(rooms.filter((x) => x !== r))} className="rounded p-0.5 text-ink-3 hover:bg-hover hover:text-ink" aria-label={`Remove ${r}`}>
            <X size={12} />
          </button>
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add room"
          className="h-[30px] w-32 rounded-md border border-dashed border-line-2 bg-transparent px-2.5 text-[13px] outline-none focus:border-accent"
        />
        <button onClick={add} className="rounded p-1 text-ink-3 hover:bg-hover hover:text-ink" aria-label="Add room">
          <Plus size={14} />
        </button>
      </span>
    </div>
  );
}
