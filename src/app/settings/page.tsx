"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { INDIAN_STATES } from "@/lib/constants";
import { useData } from "@/lib/data";
import type { Settings } from "@/lib/types";
import { LinesEditor, MilestonesEditor, PhasesEditor } from "@/components/Editors";
import { StudioCostsEditor } from "@/components/StudioCostsEditor";
import { Button, Card, Field, Input, Loading, NumberInput, PageHeader, Select } from "@/components/ui";

const numCls = "h-9 w-full rounded-md border border-line-2 bg-white px-3 text-right text-sm outline-none focus:border-accent";

export default function SettingsPage() {
  const { settings: saved, saveSettings, store, resetDemo } = useData();
  const [s, setS] = useState<Settings | null>(saved);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saved && !s) setS(saved);
  }, [saved, s]);

  if (!s) return <Loading />;

  const patch = (p: Partial<Settings>) => {
    const next = { ...s, ...p };
    setS(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await saveSettings(next);
      setSavedAt(Date.now());
    }, 500);
  };
  const patchDefaults = (p: Partial<Settings["defaults"]>) => patch({ defaults: { ...s.defaults, ...p } });

  const onLogo = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 300 * 1024) return alert("Please use a logo under 300 KB (PNG or JPG).");
    const reader = new FileReader();
    reader.onload = () => patch({ logoDataUrl: String(reader.result) });
    reader.readAsDataURL(f);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <PageHeader
        title="Settings"
        subtitle="Studio details and defaults for new quotations. Existing projects keep their own copies."
        actions={savedAt && <span className="flex items-center gap-1 text-xs text-ink-3"><Check size={12} /> Saved</span>}
      />

      <div className="space-y-6">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Studio</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Studio name"><Input value={s.studioName} onChange={(e) => patch({ studioName: e.target.value })} /></Field>
            <Field label="Tagline"><Input value={s.tagline} onChange={(e) => patch({ tagline: e.target.value })} /></Field>
            <Field label="Address" className="sm:col-span-2"><Input value={s.address} onChange={(e) => patch({ address: e.target.value })} /></Field>
            <Field label="Phone"><Input value={s.phone} onChange={(e) => patch({ phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={s.email} onChange={(e) => patch({ email: e.target.value })} /></Field>
            <Field label="Website"><Input value={s.website} onChange={(e) => patch({ website: e.target.value })} /></Field>
            <Field label="Logo" hint="PNG or JPG, under 300 KB. Appears on the proposal.">
              <div className="flex items-center gap-3">
                {s.logoDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logoDataUrl} alt="Logo" className="h-9 max-w-[120px] rounded border border-line object-contain p-1" />
                )}
                <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-line-2 px-3 text-sm hover:bg-hover">
                  {s.logoDataUrl ? "Replace" : "Upload"}
                  <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
                </label>
                {s.logoDataUrl && <Button size="sm" variant="ghost" onClick={() => patch({ logoDataUrl: "" })}>Remove</Button>}
              </div>
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Tax & numbering</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN" hint="Leave blank if not registered — new quotes will then default to no GST.">
              <Input value={s.gstin} onChange={(e) => patch({ gstin: e.target.value.toUpperCase() })} placeholder="27ABCDE1234F1Z5" />
            </Field>
            <Field label="Studio's state" hint="Same state as client → CGST + SGST, otherwise IGST.">
              <Select value={s.state} onChange={(e) => patch({ state: e.target.value })}>
                {INDIAN_STATES.map((st) => <option key={st}>{st}</option>)}
              </Select>
            </Field>
            <Field label="Quotation prefix"><Input value={s.quotePrefix} onChange={(e) => patch({ quotePrefix: e.target.value })} /></Field>
            <Field label="Next quotation number">
              <NumberInput value={s.nextQuoteNo} allowNull={false} onChange={(v) => patch({ nextQuoteNo: Math.max(1, Math.round(v ?? 1)) })} className={numCls} />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 text-sm font-semibold">Pricing defaults</h3>
          <p className="mb-4 text-xs text-ink-3">Applied to new projects. You can change them per project on the Quote tab.</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Field label="Overheads %"><NumberInput value={s.defaults.overheadPct} allowNull={false} onChange={(v) => patchDefaults({ overheadPct: v ?? 0 })} className={numCls} /></Field>
            <Field label="Profit %"><NumberInput value={s.defaults.profitPct} allowNull={false} onChange={(v) => patchDefaults({ profitPct: v ?? 0 })} className={numCls} /></Field>
            <Field label="Contingency %"><NumberInput value={s.defaults.contingencyPct} allowNull={false} onChange={(v) => patchDefaults({ contingencyPct: v ?? 0 })} className={numCls} /></Field>
            <Field label="GST rate %"><NumberInput value={s.defaults.gstRatePct} allowNull={false} onChange={(v) => patchDefaults({ gstRatePct: v ?? 0 })} className={numCls} /></Field>
            <Field label="Quote valid (days)"><NumberInput value={s.defaults.validityDays} allowNull={false} onChange={(v) => patchDefaults({ validityDays: v ?? 0 })} className={numCls} /></Field>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 text-sm font-semibold">Studio running costs · internal</h3>
          <p className="mb-4 text-xs text-ink-3">Used to work out your cost per site visit and what each project really earns the studio.</p>
          <StudioCostsEditor value={s.studioCosts} onChange={(studioCosts) => patch({ studioCosts })} />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Default payment schedule</h3>
          <MilestonesEditor value={s.payment} onChange={(payment) => patch({ payment })} />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Default project timeline</h3>
          <PhasesEditor value={s.timeline} onChange={(timeline) => patch({ timeline })} />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Default general exclusions</h3>
          <LinesEditor value={s.generalExclusions} onChange={(generalExclusions) => patch({ generalExclusions })} addLabel="Add exclusion" />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Default terms & conditions</h3>
          <LinesEditor value={s.terms} onChange={(terms) => patch({ terms })} addLabel="Add term" />
          <p className="mt-2 text-xs text-ink-3">These are starting templates, not legal advice. Have them reviewed for your practice.</p>
        </Card>

        {store.mode === "demo" && (
          <Card className="border-amber-200 p-5">
            <h3 className="text-sm font-semibold">Demo data</h3>
            <p className="mt-1 text-sm text-ink-3">Everything is stored in this browser. Resetting removes your projects, files and rates here and restores the sample data.</p>
            <Button
              className="mt-3"
              variant="danger"
              onClick={async () => {
                if (!confirm("Reset all demo data in this browser? This cannot be undone.")) return;
                await resetDemo();
                location.href = "/";
              }}
            >
              Reset demo data
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
