"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Download, Info, RefreshCw, Sparkles } from "lucide-react";
import { calcQuote } from "@/lib/calc";
import { useData, useProject } from "@/lib/data";
import { downloadBlob, renderProposalPdf } from "@/lib/pdfExport";
import { runScopeGuard, type Finding, type Severity } from "@/lib/scopeguard";
import { authHeaders } from "@/lib/supabase";
import { makeVersion, sameAsLatest } from "@/lib/versions";
import { LinesEditor, MilestonesEditor, PhasesEditor } from "@/components/Editors";
import { Button, Card, cx, NumberInput, SectionTitle, Spinner } from "@/components/ui";

const SEV: Record<Severity, { icon: typeof Info; cls: string; label: string }> = {
  blocker: { icon: AlertOctagon, cls: "text-red-700", label: "Must fix" },
  warning: { icon: AlertTriangle, cls: "text-amber-600", label: "Should check" },
  info: { icon: Info, cls: "text-sky-700", label: "To confirm" },
};

const TAB_PATH: Record<Finding["target"], string> = { brief: "", scope: "/scope", pricing: "/pricing", proposal: "/proposal" };

export default function ProposalPage() {
  const { project, update, flush } = useProject();
  const { rates, settings, ai } = useData();
  const calc = useMemo(() => calcQuote(project.items, project.quote), [project.items, project.quote]);
  const ruleFindings = useMemo(() => runScopeGuard(project, calc, rates), [project, calc, rates]);
  const [aiFindings, setAiFindings] = useState<Finding[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const renderSeq = useRef(0);

  const findings = [...ruleFindings, ...aiFindings];
  const counts = { blocker: 0, warning: 0, info: 0 } as Record<Severity, number>;
  findings.forEach((f) => counts[f.severity]++);

  // Live preview, debounced
  useEffect(() => {
    if (!settings) return;
    const seq = ++renderSeq.current;
    const t = setTimeout(async () => {
      setRendering(true);
      setRenderError(null);
      try {
        const blob = await renderProposalPdf({ project, settings, calc, revision: project.versions.length });
        if (seq !== renderSeq.current) return;
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      } catch (e) {
        console.error(e);
        if (seq === renderSeq.current) setRenderError((e as Error).message);
      } finally {
        if (seq === renderSeq.current) setRendering(false);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [project, settings, calc]);

  const exportPdf = async () => {
    if (!settings) return;
    if (counts.blocker > 0 && !confirm(`ScopeGuard found ${counts.blocker} issue(s) that should be fixed before sending. Download anyway?`)) return;
    setExporting(true);
    try {
      let p = project;
      if (!sameAsLatest(project)) {
        const v = makeVersion(project, "Exported as PDF");
        p = { ...project, versions: [...project.versions, v] };
        update(() => p);
        await flush();
      }
      const rev = p.versions[p.versions.length - 1]?.number ?? 0;
      const blob = await renderProposalPdf({ project: p, settings, calc, revision: rev });
      const safe = (x: string) => x.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
      downloadBlob(blob, `${safe(p.quoteNumber)}-R${rev}-${safe(p.name)}.pdf`);
    } catch (e) {
      alert(`Could not create PDF: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  const runAiReview = async () => {
    setAiBusy(true);
    setAiError(null);
    try {
      const scope = project.items
        .map((i) => `[${i.room} / ${i.category}] ${i.item} | spec: ${i.specification || "-"} | brand: ${i.brand || "-"} | incl: ${i.included || "-"} | excl: ${i.excluded || "-"} | install: ${i.installation || "-"} | client: ${i.dependencies || "-"}`)
        .join("\n") + `\n\nGENERAL EXCLUSIONS: ${project.generalExclusions.join("; ")}\nTERMS: ${project.terms.join(" ")}`;
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ scope, flagged: ruleFindings.map((f) => `${f.title}: ${f.detail}`) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI review failed");
      setAiFindings(
        (json.findings as { severity: "warning" | "info"; title: string; detail: string }[]).map((f, i) => ({
          id: `ai-${i}`, severity: f.severity, title: f.title, detail: f.detail, target: "scope", source: "ai",
        })),
      );
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  const visible = findings.filter((f) => showInfo || f.severity !== "info");

  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6">
      <div className="space-y-5">
        {/* ScopeGuard */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold">ScopeGuard</h2>
              <p className="text-xs text-ink-3">Gaps and unclear points to resolve before the client sees them.</p>
            </div>
            {ai.enabled && (
              <Button size="sm" onClick={runAiReview} disabled={aiBusy}>
                <Sparkles size={13} /> {aiBusy ? "Reviewing…" : "AI review"}
              </Button>
            )}
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(Object.keys(SEV) as Severity[]).map((k) => {
              const S = SEV[k];
              return (
                <button
                  key={k}
                  onClick={() => k === "info" && setShowInfo(!showInfo)}
                  className={cx("rounded-md border border-line px-3 py-2 text-left", k === "info" && "hover:bg-hover")}
                >
                  <div className={cx("flex items-center gap-1.5 text-xs", S.cls)}>
                    <S.icon size={13} /> {S.label}
                  </div>
                  <div className="tabular text-lg font-semibold">{counts[k]}</div>
                </button>
              );
            })}
          </div>
          {aiError && <p className="mb-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</p>}
          {findings.length === 0 ? (
            <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              <CheckCircle2 size={15} /> No issues found. Ready to send.
            </p>
          ) : (
            <ul className="max-h-[380px] divide-y divide-line overflow-y-auto rounded-md border border-line">
              {visible.map((f) => {
                const S = SEV[f.severity];
                return (
                  <li key={f.id}>
                    <Link
                      href={`/projects/${project.id}${TAB_PATH[f.target]}`}
                      className="flex items-start gap-2.5 px-3 py-2 hover:bg-hover"
                    >
                      <S.icon size={14} className={cx("mt-0.5 shrink-0", S.cls)} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium">
                          {f.title}
                          {f.source === "ai" && <span className="ml-1.5 rounded bg-sky-50 px-1 text-[10px] text-sky-700">AI</span>}
                        </div>
                        <div className="text-xs text-ink-3">{f.detail}</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
              {!showInfo && counts.info > 0 && (
                <li>
                  <button onClick={() => setShowInfo(true)} className="w-full px-3 py-2 text-left text-xs text-ink-3 hover:bg-hover">
                    Show {counts.info} details to confirm…
                  </button>
                </li>
              )}
            </ul>
          )}
        </Card>

        {/* Proposal content */}
        <Card className="divide-y divide-line">
          <Section title="Validity" defaultOpen>
            <div className="flex items-center gap-2 text-sm">
              Quotation valid for
              <NumberInput
                value={project.quote.validityDays}
                allowNull={false}
                onChange={(v) => update((p) => ({ ...p, quote: { ...p.quote, validityDays: Math.max(1, v ?? 15) } }))}
                className="h-8 w-16 rounded-md border border-line-2 px-2 text-right outline-none focus:border-accent"
              />
              days
            </div>
          </Section>
          <Section title="Payment schedule" defaultOpen>
            <MilestonesEditor value={project.payment} total={calc.grandTotal} onChange={(payment) => update((p) => ({ ...p, payment }))} />
          </Section>
          <Section title="Timeline">
            <PhasesEditor value={project.timeline} onChange={(timeline) => update((p) => ({ ...p, timeline }))} />
          </Section>
          <Section title="General exclusions">
            <LinesEditor value={project.generalExclusions} onChange={(generalExclusions) => update((p) => ({ ...p, generalExclusions }))} addLabel="Add exclusion" />
          </Section>
          <Section title="Terms & conditions">
            <LinesEditor value={project.terms} onChange={(terms) => update((p) => ({ ...p, terms }))} addLabel="Add term" />
          </Section>
        </Card>
      </div>

      {/* Preview */}
      <div className="sticky top-4 self-start">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>
            Proposal preview {rendering && <Spinner />}
          </SectionTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => update((p) => ({ ...p }))} title="Re-render preview">
              <RefreshCw size={13} />
            </Button>
            <Button variant="primary" onClick={exportPdf} disabled={exporting || !settings}>
              <Download size={15} /> {exporting ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        </div>
        <div className="h-[calc(100vh-170px)] min-h-[560px] overflow-hidden rounded-lg border border-line bg-[#e9e8e4]">
          {renderError ? (
            <div className="p-6 text-sm text-red-700">Preview failed: {renderError}</div>
          ) : previewUrl ? (
            <iframe src={`${previewUrl}#view=FitH&toolbar=0`} className="h-full w-full" title="Proposal preview" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-3">
              <Spinner />
              <span className="ml-2">Preparing preview…</span>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-3">
          Clients see final rates only. Downloading saves a version (R{project.versions.length + (sameAsLatest(project) ? 0 : 1)}) so you can track revisions.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group px-4 py-3">
      <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">
        <span className="mr-1.5 inline-block text-ink-3 transition-transform group-open:rotate-90">›</span>
        {title}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
