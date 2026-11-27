"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { rupees } from "@/lib/format";
import type { Rate } from "@/lib/types";
import { cx } from "./ui";

/** Searchable dropdown over the studio's rate library. */
export function RatePicker({
  rates,
  onPick,
  onClose,
  initialQuery = "",
  className,
}: {
  rates: Rate[];
  onPick: (r: Rate) => void;
  onClose: () => void;
  initialQuery?: string;
  className?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rates
      .filter((r) => {
        const hay = `${r.name} ${r.category} ${r.specification}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      })
      .slice(0, 40);
  }, [q, rates]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  return (
    <div ref={ref} className={cx("z-40 w-[440px] rounded-lg border border-line bg-white shadow-lg", className)}>
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Search size={14} className="text-ink-3" />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            if (e.key === "Enter" && results[active]) onPick(results[active]);
            if (e.key === "Escape") onClose();
          }}
          placeholder="Search your rate library…"
          className="h-10 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <ul className="max-h-72 overflow-y-auto py-1">
        {results.length === 0 && <li className="px-3 py-4 text-center text-sm text-ink-3">No matching rates</li>}
        {results.map((r, i) => (
          <li key={r.id}>
            <button
              onMouseEnter={() => setActive(i)}
              onClick={() => onPick(r)}
              className={cx("flex w-full items-start justify-between gap-3 px-3 py-2 text-left", i === active && "bg-hover")}
            >
              <div className="min-w-0">
                <div className="truncate text-sm">{r.name}</div>
                <div className="truncate text-xs text-ink-3">
                  {r.category} · {r.specification}
                </div>
              </div>
              <div className="tabular shrink-0 text-right text-xs text-ink-2">
                {rupees(r.materialRate + r.labourRate)}/{r.unit}
                {r.isSample && <div className="text-[10px] text-amber-700">sample</div>}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The rate picker in a centred window, so it is never clipped by the table
 * and has room for a long list. Used for "Add line" and "Pick a rate".
 */
export function RatePickerDialog({
  open,
  title,
  subtitle,
  rates,
  initialQuery = "",
  onPick,
  onBlank,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  rates: Rate[];
  initialQuery?: string;
  onPick: (r: Rate) => void;
  onBlank?: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setQ(initialQuery);
      setActive(0);
    }
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const groups = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = rates.filter((r) => terms.every((t) => `${r.name} ${r.category} ${r.specification}`.toLowerCase().includes(t)));
    const map = new Map<string, Rate[]>();
    hits.forEach((r) => map.set(r.category, [...(map.get(r.category) ?? []), r]));
    return [...map.entries()];
  }, [q, rates]);
  const flat = groups.flatMap(([, rs]) => rs);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-line bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="border-b border-line px-5 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold">{title}</h3>
              {subtitle && <p className="text-xs text-ink-3">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="rounded px-1.5 text-lg leading-none text-ink-3 hover:bg-hover hover:text-ink" aria-label="Close">
              ×
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-line-2 px-3 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent-soft">
            <Search size={15} className="text-ink-3" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, flat.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                }
                if (e.key === "Enter" && flat[active]) onPick(flat[active]);
              }}
              placeholder="Search your rate library — e.g. wardrobe, ceiling, tiles"
              className="h-10 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {flat.length === 0 && <p className="px-5 py-8 text-center text-sm text-ink-3">Nothing in your library matches “{q}”.</p>}
          {groups.map(([cat, rs]) => (
            <div key={cat}>
              <div className="sticky top-0 bg-white/95 px-5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{cat}</div>
              {rs.map((r) => {
                const i = flat.indexOf(r);
                return (
                  <button
                    key={r.id}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => onPick(r)}
                    className={cx("flex w-full items-start justify-between gap-4 px-5 py-2.5 text-left", i === active ? "bg-hover" : "")}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink">{r.name}</div>
                      <div className="truncate text-xs text-ink-3">{r.specification}</div>
                    </div>
                    <div className="tabular shrink-0 text-right text-[13px] text-ink-2">
                      {rupees(r.materialRate + r.labourRate)} / {r.unit}
                      {r.isSample && <div className="text-[10px] text-amber-700">sample rate</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {onBlank && (
          <div className="border-t border-line bg-canvas px-5 py-3">
            <button onClick={onBlank} className="text-sm font-medium text-ink hover:underline">
              + Add a blank line instead
            </button>
            <span className="ml-2 text-xs text-ink-3">for something not in your library</span>
          </div>
        )}
      </div>
    </div>
  );
}
