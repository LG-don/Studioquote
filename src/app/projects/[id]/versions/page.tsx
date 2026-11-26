"use client";

import { useMemo, useState } from "react";
import { History, RotateCcw, Save } from "lucide-react";
import { calcQuote } from "@/lib/calc";
import { useProject } from "@/lib/data";
import { formatDate, rupees } from "@/lib/format";
import { diffSnapshots, makeVersion, sameAsLatest, snapshotOf } from "@/lib/versions";
import type { Version } from "@/lib/types";
import { Badge, Button, Card, cx, EmptyState, Input } from "@/components/ui";

export default function VersionsPage() {
  const { project, update } = useProject();
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<string | null>(project.versions[project.versions.length - 1]?.id ?? null);
  const current = useMemo(() => calcQuote(project.items, project.quote), [project.items, project.quote]);
  const unchanged = sameAsLatest(project);

  const save = () => {
    const v = makeVersion(project, note.trim() || "Saved manually");
    update((p) => ({ ...p, versions: [...p.versions, v] }));
    setNote("");
    setSelected(v.id);
  };

  const restore = (v: Version) => {
    if (!confirm(`Restore R${v.number}? Your current working copy will first be saved as a new version, so nothing is lost.`)) return;
    update((p) => {
      const backup = sameAsLatest(p) ? [] : [makeVersion(p, `Before restoring R${v.number}`)];
      const snap = JSON.parse(JSON.stringify(v.snapshot));
      return { ...p, ...snap, versions: [...p.versions, ...backup] };
    });
  };

  const sel = project.versions.find((v) => v.id === selected) ?? null;
  const diff = sel ? diffSnapshots(sel.snapshot, snapshotOf(project)) : null;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[360px_1fr] gap-6">
      <div>
        <Card className="mb-4 p-4">
          <h2 className="text-[15px] font-semibold">Save a version</h2>
          <p className="mb-3 text-xs text-ink-3">Snapshot the scope and pricing before sending a revision. PDF downloads are saved automatically.</p>
          <div className="flex gap-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Client asked to drop wallpaper" onKeyDown={(e) => e.key === "Enter" && !unchanged && save()} />
            <Button variant="primary" onClick={save} disabled={unchanged} title={unchanged ? "No changes since the last version" : ""}>
              <Save size={14} />
            </Button>
          </div>
          {unchanged && <p className="mt-2 text-xs text-ink-3">No changes since R{project.versions[project.versions.length - 1].number}.</p>}
        </Card>

        {project.versions.length === 0 ? (
          <EmptyState title="No versions yet" body="Versions appear here when you save one or download the PDF." />
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
            {[...project.versions].reverse().map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={cx("flex w-full items-start gap-3 px-4 py-3 text-left", selected === v.id ? "bg-accent-soft/50" : "hover:bg-hover")}
              >
                <History size={15} className="mt-0.5 text-ink-3" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">R{v.number}</span>
                    <span className="tabular text-sm">{rupees(v.grandTotal)}</span>
                  </div>
                  <div className="truncate text-xs text-ink-3">{v.note}</div>
                  <div className="text-xs text-ink-3">{formatDate(v.createdAt)} · {new Date(v.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {sel && diff ? (
          <Card className="p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-[15px] font-semibold">R{sel.number} → current working copy</h2>
                <p className="text-sm text-ink-3">{sel.note}</p>
              </div>
              <Button onClick={() => restore(sel)}>
                <RotateCcw size={14} /> Restore R{sel.number}
              </Button>
            </div>
            <div className="mb-5 grid grid-cols-3 gap-3">
              <Delta label="Quote total" from={sel.grandTotal} to={current.grandTotal} />
              <Delta label="Your profit" from={sel.profit} to={current.profit} />
              <div className="rounded-md border border-line px-3 py-2">
                <div className="text-xs text-ink-3">Line changes</div>
                <div className="text-sm">
                  <span className="text-emerald-700">+{diff.added.length}</span> · <span className="text-red-700">−{diff.removed.length}</span> · <span className="text-amber-700">~{diff.changed.length}</span>
                </div>
              </div>
            </div>
            {diff.added.length + diff.removed.length + diff.changed.length + diff.settingsChanged.length === 0 ? (
              <p className="text-sm text-ink-3">No differences.</p>
            ) : (
              <div className="space-y-5 text-sm">
                {diff.settingsChanged.length > 0 && (
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Quote settings</h3>
                    <ul className="space-y-1">{diff.settingsChanged.map((s) => <li key={s}>{s}</li>)}</ul>
                  </div>
                )}
                {diff.added.length > 0 && (
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Added</h3>
                    <ul className="space-y-1">
                      {diff.added.map((i) => (
                        <li key={i.id}><Badge tone="green">+</Badge> {i.room} — {i.item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diff.removed.length > 0 && (
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Removed</h3>
                    <ul className="space-y-1">
                      {diff.removed.map((i) => (
                        <li key={i.id} className="text-ink-2 line-through decoration-red-300"><Badge tone="red">−</Badge> {i.room} — {i.item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diff.changed.length > 0 && (
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Changed</h3>
                    <ul className="space-y-2">
                      {diff.changed.map((c) => (
                        <li key={c.item.id}>
                          <div className="font-medium">{c.item.room} — {c.item.item}</div>
                          {c.fields.map((f) => (
                            <div key={f.field} className="text-xs text-ink-2">
                              <span className="text-ink-3">{f.field}:</span> <span className="line-through decoration-red-300">{f.from}</span> → {f.to}
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-8 text-center text-sm text-ink-3">Select a version to compare it with the current working copy.</Card>
        )}
      </div>
    </div>
  );
}

function Delta({ label, from, to }: { label: string; from: number; to: number }) {
  const d = to - from;
  return (
    <div className="rounded-md border border-line px-3 py-2">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="tabular text-sm">
        {rupees(from)} → {rupees(to)}
      </div>
      <div className={cx("tabular text-xs", d > 0 ? "text-emerald-700" : d < 0 ? "text-red-700" : "text-ink-3")}>
        {d === 0 ? "no change" : `${d > 0 ? "+" : "−"}${rupees(Math.abs(d))}`}
      </div>
    </div>
  );
}
