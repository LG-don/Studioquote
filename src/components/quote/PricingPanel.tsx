"use client";

// Markup, discount and GST settings plus the client summary and the internal profit view.
import type { QuoteCalc } from "@/lib/calc";
import { useData, useProject } from "@/lib/data";
import { rupees } from "@/lib/format";
import type { GstMode, QuoteSettings } from "@/lib/types";
import { Card, cx, Field, NumberInput, Select, SectionTitle } from "@/components/ui";

export function PricingPanel({ calc }: { calc: QuoteCalc }) {
  const { project, update } = useProject();
  const { settings } = useData();
  const setQuote = (patch: Partial<QuoteSettings>) => update((p) => ({ ...p, quote: { ...p.quote, ...patch } }));
  const sameState = project.clientState && settings?.state ? project.clientState === settings.state : true;
  const categories = [...new Set(project.items.map((i) => i.category))];
  return (
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.1fr]">
        <Card className="p-4">
          <SectionTitle>Markup</SectionTitle>
          <div className="space-y-3">
            <PctField label="Overheads" hint="Office, staff, design time" value={project.quote.overheadPct} onChange={(v) => setQuote({ overheadPct: v })} />
            <PctField label="Profit" value={project.quote.profitPct} onChange={(v) => setQuote({ profitPct: v })} />
            <PctField label="Contingency" hint="Buffer for surprises on site" value={project.quote.contingencyPct} onChange={(v) => setQuote({ contingencyPct: v })} />
            <label className="flex items-center gap-2 text-[13px] text-ink-2">
              <input
                type="checkbox"
                checked={project.quote.showContingency}
                onChange={(e) => setQuote({ showContingency: e.target.checked })}
                className="accent-[var(--color-ink)]"
              />
              Show contingency as a separate line to the client
            </label>
            <p className="text-xs text-ink-3">Overheads and profit are built into client rates and never shown on the proposal.</p>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle>Discount & tax</SectionTitle>
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <Field label="Discount" className="flex-1">
                <NumberInput
                  value={project.quote.discountValue}
                  allowNull={false}
                  onChange={(v) => setQuote({ discountValue: Math.max(0, v ?? 0) })}
                  className="h-9 w-full rounded-md border border-line-2 bg-white px-3 text-right text-sm outline-none focus:border-accent"
                />
              </Field>
              <Select value={project.quote.discountType} onChange={(e) => setQuote({ discountType: e.target.value as "pct" | "amount" })} className="w-20">
                <option value="pct">%</option>
                <option value="amount">₹</option>
              </Select>
            </div>
            <Field label="GST treatment" hint={settings?.gstin ? `Studio in ${settings.state} · client in ${project.clientState || "—"}${sameState ? " (same state)" : " (inter-state)"}` : "No GSTIN in Settings — confirm whether GST applies."}>
              <Select value={project.quote.gstMode} onChange={(e) => setQuote({ gstMode: e.target.value as GstMode })}>
                <option value="none">No GST</option>
                <option value="cgst_sgst">CGST + SGST (same state)</option>
                <option value="igst">IGST (inter-state)</option>
              </Select>
            </Field>
            {project.quote.gstMode !== "none" && (
              <>
                <PctField label="Default GST rate" value={project.quote.gstRatePct} onChange={(v) => setQuote({ gstRatePct: v })} />
                <details className="text-[13px]">
                  <summary className="cursor-pointer text-ink-2">Different rate for some categories</summary>
                  <div className="mt-2 space-y-1.5">
                    {categories.map((c) => (
                      <div key={c} className="flex items-center justify-between gap-2">
                        <span className="truncate text-ink-2">{c}</span>
                        <NumberInput
                          value={project.quote.categoryGst[c] ?? null}
                          placeholder={String(project.quote.gstRatePct)}
                          onChange={(v) => {
                            const next = { ...project.quote.categoryGst };
                            if (v === null) delete next[c];
                            else next[c] = v;
                            setQuote({ categoryGst: next });
                          }}
                          className="h-7 w-16 rounded border border-line-2 px-2 text-right text-[13px] outline-none focus:border-accent"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-ink-3">Leave blank to use the default rate. Check applicable rates with your CA.</p>
                  </div>
                </details>
              </>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <ClientSummary calc={calc} q={project.quote} />
          <ProfitPanel calc={calc} q={project.quote} budget={project.budget} />
        </div>
      </div>
  );
}

function PctField({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[13px] text-ink-2">{label}</div>
        {hint && <div className="text-xs text-ink-3">{hint}</div>}
      </div>
      <div className="flex items-center gap-1">
        <NumberInput
          value={value}
          allowNull={false}
          onChange={(v) => onChange(Math.max(0, Math.min(500, v ?? 0)))}
          className="h-8 w-16 rounded-md border border-line-2 bg-white px-2 text-right text-sm outline-none focus:border-accent"
        />
        <span className="text-sm text-ink-3">%</span>
      </div>
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-3 py-1 text-[13px]", strong && "text-[15px] font-semibold", muted && "text-ink-3")}>
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

export function ClientSummary({ calc, q }: { calc: QuoteCalc; q: QuoteSettings }) {
  return (
    <Card className="p-4">
      <SectionTitle>What the client sees</SectionTitle>
      <Row label="Subtotal" value={rupees(calc.clientSubtotal)} />
      {calc.contingencyAmount > 0 && <Row label={`Contingency (${q.contingencyPct}%)`} value={rupees(calc.contingencyAmount)} />}
      {calc.discountAmount > 0 && <Row label={`Discount${q.discountType === "pct" ? ` (${q.discountValue}%)` : ""}`} value={`− ${rupees(calc.discountAmount)}`} />}
      <Row label="Taxable value" value={rupees(calc.taxable)} />
      {calc.taxLines.map((t) => (
        <Row key={t.label + t.base} label={t.label} value={rupees(t.amount)} muted />
      ))}
      {calc.roundOff !== 0 && <Row label="Round off" value={calc.roundOff.toFixed(2)} muted />}
      <div className="mt-1 border-t border-line pt-1">
        <Row label="Grand total" value={rupees(calc.grandTotal)} strong />
      </div>
    </Card>
  );
}

export function ProfitPanel({ calc, q, budget }: { calc: QuoteCalc; q: QuoteSettings; budget: number | null }) {
  const low = calc.taxable > 0 && calc.marginPct < 8;
  return (
    <Card className={cx("p-4", calc.profit < 0 ? "border-red-200 bg-red-50/40" : "border-emerald-200 bg-emerald-50/40")}>
      <SectionTitle>Your numbers · internal only</SectionTitle>
      <Row label="Material cost" value={rupees(calc.materialTotal)} muted />
      <Row label="Labour cost" value={rupees(calc.labourTotal)} muted />
      <Row label="Cost to you" value={rupees(calc.costSubtotal)} />
      <Row label={`Overhead allowance (${q.overheadPct}%)`} value={rupees(calc.overheadAmount)} muted />
      <Row label={`Contingency buffer (${q.contingencyPct}%)`} value={rupees(calc.contingencyBuffer)} muted />
      {calc.discountAmount > 0 && <Row label="Discount given" value={`− ${rupees(calc.discountAmount)}`} muted />}
      <div className="mt-1 border-t border-line pt-1">
        <Row
          label="Your profit"
          value={
            <span className={calc.profit < 0 ? "text-red-700" : "text-emerald-700"}>
              {rupees(calc.profit)} · {calc.marginPct.toFixed(1)}%
            </span>
          }
          strong
        />
      </div>
      {low && <p className="mt-2 text-xs text-red-700">Margin is below 8%. Check the discount and profit settings.</p>}
      {budget ? (
        <p className="mt-2 text-xs text-ink-3">
          Client budget {rupees(budget)} — quote is{" "}
          <span className={calc.grandTotal > budget ? "text-amber-700" : "text-emerald-700"}>
            {calc.grandTotal > budget ? `${rupees(calc.grandTotal - budget)} over` : `${rupees(budget - calc.grandTotal)} under`}
          </span>
          .
        </p>
      ) : null}
    </Card>
  );
}
