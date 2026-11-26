"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Search, Trash2, Upload } from "lucide-react";
import { CATEGORIES, UNITS } from "@/lib/constants";
import { useData } from "@/lib/data";
import { detectColumns, exportRates, readSheets, rowsToRates } from "@/lib/excel";
import { num } from "@/lib/format";
import { uid } from "@/lib/ids";
import type { Rate } from "@/lib/types";
import { Badge, Button, cx, Input, Loading, Modal, NumberInput, PageHeader, Select } from "@/components/ui";

export default function RatesPage() {
  const { rates: saved, saveRates, ready } = useData();
  const [rates, setRates] = useState<Rate[]>(saved);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setRates(saved), [saved]);

  const commit = (next: Rate[]) => {
    setRates(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveRates(next), 500);
  };
  const setRate = (id: string, patch: Partial<Rate>) => commit(rates.map((r) => (r.id === id ? { ...r, ...patch, isSample: false } : r)));

  const filtered = useMemo(
    () =>
      rates.filter(
        (r) => (!cat || r.category === cat) && `${r.name} ${r.specification} ${r.category}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [rates, q, cat],
  );
  const sampleCount = rates.filter((r) => r.isSample).length;
  const categories = [...new Set([...CATEGORIES, ...rates.map((r) => r.category)])];

  if (!ready) return <Loading />;

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <PageHeader
        title="Rate library"
        subtitle="Your cost rates (material + labour), before overheads and profit. Used by templates, AI drafting and the pricing table."
        actions={
          <>
            <Button onClick={() => setImportOpen(true)}>
              <Upload size={14} /> Import
            </Button>
            <Button onClick={() => exportRates(rates)}>
              <Download size={14} /> Export
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const r: Rate = { id: uid("r"), category: cat || "Custom furniture", name: "New item", specification: "", unit: "nos", materialRate: 0, labourRate: 0, notes: "", isSample: false };
                commit([r, ...rates]);
                setQ("");
              }}
            >
              <Plus size={15} /> Add rate
            </Button>
          </>
        }
      />

      {sampleCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            <strong>{sampleCount} sample rates</strong> are synthetic placeholders, not market rates. Replace them with your vendors&apos; rates — any rate you edit stops being marked as a sample.
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm(`Remove all ${sampleCount} sample rates? Templates will then leave rates blank for those items.`)) commit(rates.filter((r) => !r.isSample));
            }}
          >
            Remove samples
          </Button>
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rates" className="pl-8" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-52">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <span className="ml-auto self-center text-sm text-ink-3">{filtered.length} of {rates.length}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[980px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th className="w-[170px] py-2.5 pl-3 font-medium">Category</th>
              <th className="font-medium">Item</th>
              <th className="font-medium">Specification</th>
              <th className="w-[72px] font-medium">Unit</th>
              <th className="w-[96px] pr-1 text-right font-medium">Material ₹</th>
              <th className="w-[90px] pr-1 text-right font-medium">Labour ₹</th>
              <th className="w-[84px] pr-3 text-right font-medium">Total</th>
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="group border-b border-line last:border-0 hover:bg-canvas/70">
                <td className="py-1 pl-2">
                  <select value={r.category} onChange={(e) => setRate(r.id, { category: e.target.value })} className="cell-input">
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1">
                  <div className="flex items-center gap-1">
                    <input value={r.name} onChange={(e) => setRate(r.id, { name: e.target.value })} className="cell-input font-medium" />
                    {r.isSample && <Badge tone="amber">sample</Badge>}
                  </div>
                </td>
                <td className="py-1">
                  <input value={r.specification} onChange={(e) => setRate(r.id, { specification: e.target.value })} className="cell-input text-ink-2" />
                </td>
                <td className="py-1">
                  <input list="rate-units" value={r.unit} onChange={(e) => setRate(r.id, { unit: e.target.value })} className="cell-input" />
                </td>
                <td className="py-1 pr-1">
                  <NumberInput value={r.materialRate} allowNull={false} onChange={(v) => setRate(r.id, { materialRate: v ?? 0 })} className="cell-input num" />
                </td>
                <td className="py-1 pr-1">
                  <NumberInput value={r.labourRate} allowNull={false} onChange={(v) => setRate(r.id, { labourRate: v ?? 0 })} className="cell-input num" />
                </td>
                <td className="tabular pr-3 text-right text-ink-2">{num(r.materialRate + r.labourRate)}</td>
                <td className="pr-2">
                  <button
                    onClick={() => commit(rates.filter((x) => x.id !== r.id))}
                    className="rounded p-1 text-ink-3 opacity-0 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
                    title="Delete rate"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="rate-units">
          {UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>

      <ImportRates
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(incoming, replace) => {
          commit(replace ? incoming : [...incoming, ...rates]);
          setImportOpen(false);
        }}
      />
    </div>
  );
}

function ImportRates({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (r: Rate[], replace: boolean) => void }) {
  const [parsed, setParsed] = useState<Rate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);

  const load = async (f: File) => {
    setError(null);
    try {
      const sheets = await readSheets(f);
      const all: Rate[] = [];
      for (const s of sheets) {
        const m = detectColumns(s.rows);
        if (m) all.push(...rowsToRates(s.rows, m));
      }
      if (!all.length) setError("No rates found. Make sure the sheet has headings like Item, Unit, Material rate, Labour rate (or Rate).");
      setParsed(all);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setParsed(null);
        onClose();
      }}
      title="Import rates from Excel / CSV"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!parsed?.length} onClick={() => parsed && onImport(parsed, replace)}>
            Import {parsed?.length ?? 0} rates
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line-2 px-3 py-1.5 hover:bg-hover">
          <Upload size={14} /> Choose file
          <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        </label>
        <p className="text-xs text-ink-3">
          Expected headings: <em>Category, Item, Specification, Unit, Material rate, Labour rate</em>. A single <em>Rate</em> column is imported as material cost.
          Tip: export your current library to get a ready-made template.
        </p>
        {error && <p className="text-red-700">{error}</p>}
        {parsed && parsed.length > 0 && (
          <>
            <ul className={cx("max-h-48 overflow-y-auto rounded-md border border-line text-xs")}>
              {parsed.slice(0, 50).map((r) => (
                <li key={r.id} className="flex justify-between border-b border-line px-2 py-1.5 last:border-0">
                  <span className="truncate">
                    {r.name} <span className="text-ink-3">· {r.category}</span>
                  </span>
                  <span className="tabular shrink-0">
                    {num(r.materialRate)} + {num(r.labourRate)} / {r.unit}
                  </span>
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="accent-[var(--color-ink)]" />
              Replace my whole library (otherwise rates are added)
            </label>
          </>
        )}
      </div>
    </Modal>
  );
}
