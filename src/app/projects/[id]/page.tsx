"use client";

import { useRef, useState } from "react";
import { ArrowRight, FileImage, FileSpreadsheet, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { useData, useProject } from "@/lib/data";
import { sheetText } from "@/lib/excel";
import { formatDate } from "@/lib/format";
import { uid } from "@/lib/ids";
import type { FileKind, FileMeta } from "@/lib/types";
import { EngagementPicker, ProjectFields } from "@/components/ProjectFields";
import { Badge, Button, Card, LinkButton, SectionTitle } from "@/components/ui";

const KIND_LABEL: Record<FileKind, string> = {
  drawing: "Drawing / plan",
  image: "Reference image",
  boq: "Existing BOQ",
  rates: "Rate list",
  other: "Other",
};

function guessKind(f: File): FileKind {
  if (/image\//.test(f.type)) return "image";
  if (/pdf/.test(f.type) || /\.pdf$/i.test(f.name)) return "drawing";
  if (/\.(xlsx|xls|csv)$/i.test(f.name)) return /rate/i.test(f.name) ? "rates" : "boq";
  return "other";
}

const MAX_MB = 25;

export default function BriefPage() {
  const { project, update } = useProject();
  const { store } = useData();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const added: FileMeta[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`${f.name} is larger than ${MAX_MB} MB.`);
        continue;
      }
      if (!/\.(pdf|xlsx|xls|csv|png|jpe?g|webp)$/i.test(f.name)) {
        setError(`${f.name}: only PDF, Excel/CSV and image files are supported.`);
        continue;
      }
      try {
        const path = await store.uploadFile(project.id, f);
        const kind = guessKind(f);
        let extractedText: string | undefined;
        if (kind === "boq" || kind === "rates") extractedText = await sheetText(f).catch(() => undefined);
        added.push({ id: uid("f"), name: f.name, size: f.size, type: f.type, kind, path, uploadedAt: new Date().toISOString(), extractedText });
      } catch (e) {
        setError(`Could not upload ${f.name}: ${(e as Error).message}`);
      }
    }
    if (added.length) update((p) => ({ ...p, files: [...p.files, ...added] }));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const open = async (f: FileMeta) => {
    try {
      const url = await store.fileUrl(f.path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const remove = async (f: FileMeta) => {
    if (!confirm(`Remove ${f.name}?`)) return;
    await store.deleteFile(f.path).catch(() => {});
    update((p) => ({ ...p, files: p.files.filter((x) => x.id !== f.id) }));
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_340px]">
      <div>
        <section className="mb-9">
          <h3 className="text-sm font-semibold">What you&apos;re quoting for</h3>
          <div className="mt-3">
            <EngagementPicker
              engagement={project.engagement ?? "turnkey"}
              delegated={project.delegated ?? {}}
              onChange={(patch) => update((p) => ({ ...p, ...patch }))}
            />
          </div>
        </section>
        <ProjectFields value={project} onChange={(patch) => update((p) => ({ ...p, ...patch }))} />
        <div className="mt-8 flex justify-end border-t border-line pt-5">
          <LinkButton href={`/projects/${project.id}/quote`} variant="primary">
            Next: quote <ArrowRight size={15} />
          </LinkButton>
        </div>
      </div>

      <aside>
        <SectionTitle>Files</SectionTitle>
        <Card className="p-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              upload(e.dataTransfer.files);
            }}
            className="flex flex-col items-center rounded-md border border-dashed border-line-2 bg-canvas px-4 py-6 text-center"
          >
            <Upload size={18} className="text-ink-3" />
            <p className="mt-2 text-sm">Drop drawings, BOQs, rate lists or images</p>
            <p className="text-xs text-ink-3">PDF, Excel, CSV, JPG, PNG · up to {MAX_MB} MB</p>
            <Button size="sm" className="mt-3" onClick={() => inputRef.current?.click()} disabled={busy}>
              <Paperclip size={13} /> {busy ? "Uploading…" : "Choose files"}
            </Button>
            <input ref={inputRef} type="file" multiple hidden accept=".pdf,.xlsx,.xls,.csv,image/*" onChange={(e) => upload(e.target.files)} />
          </div>
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

          {project.files.length > 0 && (
            <ul className="mt-4 divide-y divide-line">
              {project.files.map((f) => {
                const Icon = f.kind === "image" ? FileImage : f.kind === "boq" || f.kind === "rates" ? FileSpreadsheet : FileText;
                return (
                  <li key={f.id} className="group flex items-start gap-2.5 py-2.5">
                    <Icon size={16} className="mt-0.5 shrink-0 text-ink-3" />
                    <div className="min-w-0 flex-1">
                      <button onClick={() => open(f)} className="block max-w-full truncate text-left text-sm hover:underline" title={f.name}>
                        {f.name}
                      </button>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
                        <select
                          value={f.kind}
                          onChange={(e) =>
                            update((p) => ({ ...p, files: p.files.map((x) => (x.id === f.id ? { ...x, kind: e.target.value as FileKind } : x)) }))
                          }
                          className="rounded bg-transparent text-xs outline-none hover:bg-hover"
                        >
                          {Object.entries(KIND_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                        · {(f.size / 1024 / 1024).toFixed(1)} MB · {formatDate(f.uploadedAt)}
                      </div>
                      {f.extractedText && <Badge tone="accent" className="mt-1">Readable by AI drafting</Badge>}
                    </div>
                    <button onClick={() => remove(f)} className="rounded p-1 text-ink-3 opacity-0 hover:text-red-700 group-hover:opacity-100" title="Remove">
                      <Trash2 size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <p className="mt-3 text-xs leading-relaxed text-ink-3">
          Drawings and images are stored with the project for reference. Spreadsheets are read so AI drafting can use them, and existing BOQs can be added on the Quote tab.
          Quantities are never read from drawings automatically — enter room sizes or measure each line on the Quote tab.
        </p>
      </aside>
    </div>
  );
}
