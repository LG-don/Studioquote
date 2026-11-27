"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { DELEGABLE, INDIAN_STATES, isResidentialType, PROPERTY_TYPES, roomSuggestions } from "@/lib/constants";
import type { Delegation, Engagement, Project } from "@/lib/types";
import { cx, Field, Input, NumberInput, Select, Textarea } from "./ui";

type P = Pick<
  Project,
  | "name" | "clientName" | "clientPhone" | "clientEmail" | "clientAddress" | "location" | "clientState"
  | "propertyType" | "carpetArea" | "projectType" | "budget" | "description" | "requirements" | "rooms"
  | "bedrooms" | "bathrooms" | "balconies"
>;

const numCls =
  "h-9 w-full rounded-md border border-line-2 bg-white px-3 text-sm outline-none placeholder:text-ink-3/70 focus:border-accent focus:ring-3 focus:ring-accent-soft";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ProjectFields<T extends P>({ value, onChange }: { value: T; onChange: (patch: Partial<P>) => void }) {
  const residential = isResidentialType(value.propertyType);
  const typeOptions = PROPERTY_TYPES.includes(value.propertyType) ? PROPERTY_TYPES : [value.propertyType, ...PROPERTY_TYPES];

  return (
    <div className="space-y-9">
      <Section title="Property">
        <div className="grid gap-4 sm:grid-cols-2">
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
                onChange({ propertyType, projectType: isResidentialType(propertyType) ? "residential" : "commercial" });
              }}
            >
              {typeOptions.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Carpet area (sq.ft)" hint="Optional">
            <NumberInput value={value.carpetArea} onChange={(v) => onChange({ carpetArea: v })} className={numCls} />
          </Field>
          {residential && (
            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <CountField label="Bedrooms" value={value.bedrooms ?? null} onChange={(v) => onChange({ bedrooms: v })} />
              <CountField label="Bathrooms" value={value.bathrooms ?? null} onChange={(v) => onChange({ bathrooms: v })} />
              <CountField label="Balconies" value={value.balconies ?? null} onChange={(v) => onChange({ balconies: v })} />
            </div>
          )}
        </div>
      </Section>

      <Section title="Rooms in this quote" hint="Tap the rooms you're working on. Only these appear in the quote.">
        <RoomPicker
          rooms={value.rooms}
          suggestions={roomSuggestions(value.propertyType, value.bedrooms, value.bathrooms, value.balconies)}
          onChange={(rooms) => onChange({ rooms })}
        />
      </Section>

      <Section title="Client">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client name">
            <Input value={value.clientName} onChange={(e) => onChange({ clientName: e.target.value })} />
          </Field>
          <Field label="Client's state" hint="Decides CGST + SGST (same state) or IGST.">
            <Select value={value.clientState} onChange={(e) => onChange({ clientState: e.target.value })}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Phone" hint="Used for WhatsApp sharing">
            <Input value={value.clientPhone} onChange={(e) => onChange({ clientPhone: e.target.value })} inputMode="tel" />
          </Field>
          <Field label="Email">
            <Input value={value.clientEmail} onChange={(e) => onChange({ clientEmail: e.target.value })} inputMode="email" />
          </Field>
          <Field label="Site address" className="sm:col-span-2">
            <Input value={value.clientAddress} onChange={(e) => onChange({ clientAddress: e.target.value })} />
          </Field>
          <Field label="Client's budget (₹)" hint="Optional — you'll be warned if the quote goes over.">
            <NumberInput value={value.budget} onChange={(v) => onChange({ budget: v })} className={numCls} />
          </Field>
        </div>
      </Section>

      <Section title="Brief" hint="Optional. Notes for yourself — and what AI drafting reads, if connected.">
        <div className="space-y-4">
          <Field label="About the project">
            <Textarea value={value.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Family, look and feel, constraints…" />
          </Field>
          <Field label="What the client asked for">
            <Textarea
              value={value.requirements}
              onChange={(e) => onChange({ requirements: e.target.value })}
              className="min-h-[100px]"
              placeholder="e.g. Modular kitchen with tall unit, sliding wardrobe in master bedroom, keep existing flooring…"
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

function CountField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <Field label={label}>
      <div className="flex h-9 items-center rounded-md border border-line-2 bg-white">
        <button type="button" onClick={() => onChange(Math.max(0, (value ?? 0) - 1))} className="h-full px-3 text-ink-3 hover:text-ink" aria-label={`Fewer ${label.toLowerCase()}`}>
          −
        </button>
        <NumberInput value={value} onChange={(v) => onChange(v === null ? null : Math.max(0, Math.round(v)))} className="h-full w-full min-w-0 bg-transparent text-center text-sm outline-none" aria-label={label} />
        <button type="button" onClick={() => onChange((value ?? 0) + 1)} className="h-full px-3 text-ink-3 hover:text-ink" aria-label={`More ${label.toLowerCase()}`}>
          +
        </button>
      </div>
    </Field>
  );
}

/** The designer picks rooms; suggestions are only suggestions. */
export function RoomPicker({ rooms, suggestions, onChange }: { rooms: string[]; suggestions: string[]; onChange: (r: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = (name: string) => {
    const n = name.trim();
    if (n && !rooms.includes(n)) onChange([...rooms, n]);
  };
  const remaining = suggestions.filter((s) => !rooms.includes(s));
  return (
    <div className="space-y-3">
      <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white p-1.5">
        {rooms.length === 0 && <span className="px-1.5 text-[13px] text-ink-3">No rooms yet — tap suggestions below or type a room name.</span>}
        {rooms.map((r) => (
          <span key={r} className="inline-flex items-center gap-1 rounded-md bg-ink py-1 pl-2.5 pr-1 text-[13px] text-white">
            <Check size={12} />
            {r}
            <button onClick={() => onChange(rooms.filter((x) => x !== r))} className="rounded p-0.5 text-white/70 hover:bg-white/15 hover:text-white" aria-label={`Remove ${r}`}>
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
                add(draft);
                setDraft("");
              }
            }}
            placeholder="Type a room"
            className="h-[30px] w-32 bg-transparent px-2 text-[13px] outline-none"
          />
          {draft.trim() && (
            <button
              onClick={() => {
                add(draft);
                setDraft("");
              }}
              className="rounded p-1 text-ink-3 hover:bg-hover hover:text-ink"
              aria-label="Add room"
            >
              <Plus size={14} />
            </button>
          )}
        </span>
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button
              key={s}
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-2 bg-transparent px-2.5 py-1 text-[13px] text-ink-2 hover:border-ink hover:bg-white hover:text-ink"
            >
              <Plus size={12} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** First question on every project: what is the studio being engaged for? */
export function EngagementPicker({
  engagement,
  delegated,
  onChange,
}: {
  engagement: Engagement;
  delegated: Record<string, Delegation>;
  onChange: (patch: { engagement?: Engagement; delegated?: Record<string, Delegation> }) => void;
}) {
  const options: { id: Engagement; title: string; body: string }[] = [
    { id: "turnkey", title: "Turnkey", body: "You design and execute everything. The quote covers all work and materials." },
    { id: "design_only", title: "Design only", body: "You provide design. The client hires vendors. The quote is your design fee." },
    { id: "mixed", title: "Design + part execution", body: "You execute some work; the client's own vendors handle the rest." },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange({ engagement: o.id })}
            className={cx(
              "rounded-lg border bg-white p-3.5 text-left transition-colors",
              engagement === o.id ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-2 hover:bg-hover/40",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{o.title}</span>
              <span className={cx("grid h-4 w-4 place-items-center rounded-full border", engagement === o.id ? "border-ink bg-ink" : "border-line-2")}>
                {engagement === o.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">{o.body}</p>
          </button>
        ))}
      </div>

      {engagement === "mixed" && (
        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <div className="text-sm font-medium">Who does what?</div>
            <div className="text-xs text-ink-3">Untick work the client&apos;s own vendors will do. It stays in the scope for coordination but is left out of your price.</div>
          </div>
          <div className="divide-y divide-line">
            {DELEGABLE.map((cat) => {
              const byVendor = cat in delegated;
              return (
                <div key={cat} className="flex flex-wrap items-center gap-3 px-4 py-2">
                  <label className="flex min-w-[200px] flex-1 items-center gap-2.5 text-[13px]">
                    <input
                      type="checkbox"
                      checked={!byVendor}
                      onChange={(e) => {
                        const next = { ...delegated };
                        if (e.target.checked) delete next[cat];
                        else next[cat] = { vendor: "" };
                        onChange({ delegated: next });
                      }}
                      className="accent-[var(--color-ink)]"
                    />
                    {cat}
                    <span className={cx("ml-1 text-xs", byVendor ? "text-amber-700" : "text-ink-3")}>{byVendor ? "client's vendor" : "your studio"}</span>
                  </label>
                  {byVendor && (
                    <input
                      value={delegated[cat].vendor}
                      onChange={(e) => onChange({ delegated: { ...delegated, [cat]: { vendor: e.target.value } } })}
                      placeholder="Vendor name (optional)"
                      className="h-8 w-56 rounded-md border border-line-2 px-2.5 text-[13px] outline-none focus:border-accent"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
