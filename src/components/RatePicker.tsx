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
