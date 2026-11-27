"use client";

import { useState } from "react";
import { ClipboardPaste, FileSpreadsheet } from "lucide-react";
import { useData, useProject } from "@/lib/data";
import { detectColumns, parsePasted, readSheets, rowsToItems, type Mapping } from "@/lib/excel";
import { num } from "@/lib/format";
import type { ScopeItem } from "@/lib/types";
import { Button, Field, Modal, Select, Textarea } from "@/components/ui";

export function ImportModal({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (items: ScopeItem[]) => void }) {
  const { project } = useProject();
  const { store } = useData();
  const [sheets, setSheets] = useState<{ name: string; rows: (string | number | null)[][] }[] | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [pasted, setPasted] = useState("");

  const load = async (blob: Blob) => {
    setError(null);
    try {
      const s = await readSheets(blob);
      setSheets(s);
      setSheetIdx(0);
    } catch (e) {
      setError(`Could not read file: ${(e as Error).message}`);
    }
  };

  const targetRoom = room || project.rooms[0] || "General / site";
  const mapping: Mapping | null = sheets ? detectColumns(sheets[sheetIdx]?.rows ?? []) : null;
  const preview =
    mode === "paste"
      ? parsePasted(pasted, targetRoom)
      : sheets && mapping
        ? rowsToItems(sheets[sheetIdx].rows, mapping, targetRoom)
        : [];
  const spreadsheetFiles = project.files.filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name));

  const close = () => {
    setSheets(null);
    setPasted("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Add lines from Excel"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!preview.length} onClick={() => { onImport(preview); setSheets(null); setPasted(""); }}>
            Add {preview.length} items
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex rounded-md border border-line-2 p-0.5 text-[13px] w-fit">
          <button onClick={() => setMode("paste")} className={mode === "paste" ? "rounded bg-ink px-3 py-1 text-white" : "rounded px-3 py-1 text-ink-2 hover:bg-hover"}>
            <ClipboardPaste size={13} className="mr-1 inline" /> Paste rows
          </button>
          <button onClick={() => setMode("file")} className={mode === "file" ? "rounded bg-ink px-3 py-1 text-white" : "rounded px-3 py-1 text-ink-2 hover:bg-hover"}>
            <FileSpreadsheet size={13} className="mr-1 inline" /> Upload a file
          </button>
        </div>
        {mode === "paste" && (
          <>
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={"Copy rows in Excel or Google Sheets and paste here (Ctrl+V).\nWithout headings, columns are read as: Item · Qty · Unit · Material rate · Labour rate"}
              className="min-h-[140px] font-mono text-xs"
            />
            <Field label="Room for these lines">
              <Select value={room} onChange={(e) => setRoom(e.target.value)}>
                {project.rooms.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </>
        )}
        {mode === "file" && (<>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line-2 px-3 py-1.5 text-sm hover:bg-hover">
            <FileSpreadsheet size={14} /> Choose Excel / CSV
            <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
          </label>
          {spreadsheetFiles.map((f) => (
            <button
              key={f.id}
              onClick={async () => {
                const url = await store.fileUrl(f.path);
                load(await (await fetch(url)).blob());
              }}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-2 hover:bg-hover"
            >
              Use {f.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-3">
          Columns are matched by their headings (Item / Description, Qty, Unit, Material rate, Labour rate, Rate, Room, Category). Rows without numbers are treated as section headings.
          Rates are imported as your cost — check them after import.
        </p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {sheets && (
          <div className="flex gap-3">
            <Field label="Sheet" className="flex-1">
              <Select value={sheetIdx} onChange={(e) => setSheetIdx(Number(e.target.value))}>
                {sheets.map((s, i) => (
                  <option key={s.name} value={i}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Room for rows without a room column" className="flex-1">
              <Select value={room} onChange={(e) => setRoom(e.target.value)}>
                {project.rooms.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        {sheets && !mapping && <p className="text-sm text-amber-700">Couldn&apos;t find a header row with an Item / Description column in this sheet.</p>}
        </>)}
        {preview.length > 0 && (
          <div className="overflow-hidden rounded-md border border-line">
            <table className="w-full text-xs">
              <thead className="bg-canvas text-left text-ink-3">
                <tr>
                  <th className="px-2 py-1.5">Item</th>
                  <th className="px-2">Category</th>
                  <th className="px-2 text-right">Qty</th>
                  <th className="px-2">Unit</th>
                  <th className="px-2 text-right">Material</th>
                  <th className="px-2 text-right">Labour</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 8).map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="max-w-[240px] truncate px-2 py-1.5">{p.item}</td>
                    <td className="px-2">{p.category}</td>
                    <td className="tabular px-2 text-right">{num(p.qty)}</td>
                    <td className="px-2">{p.unit}</td>
                    <td className="tabular px-2 text-right">{num(p.materialRate)}</td>
                    <td className="tabular px-2 text-right">{num(p.labourRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 8 && <div className="border-t border-line px-2 py-1.5 text-xs text-ink-3">…and {preview.length - 8} more</div>}
          </div>
        )}
      </div>
    </Modal>
  );
}
