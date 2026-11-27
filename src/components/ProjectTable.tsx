"use client";

import Link from "next/link";
import { Copy, Trash2 } from "lucide-react";
import { calcQuote } from "@/lib/calc";
import { relativeTime, rupeesShort } from "@/lib/format";
import type { Project, ProjectStatus } from "@/lib/types";
import { Badge, cx } from "./ui";

export const STATUS_LABEL: Record<ProjectStatus, string> = { draft: "Draft", sent: "Sent", approved: "Approved" };
export const STATUS_TONE: Record<ProjectStatus, "neutral" | "blue" | "green"> = { draft: "neutral", sent: "blue", approved: "green" };

export function ProjectTable({ projects, onDelete, onDuplicate }: { projects: Project[]; onDelete?: (p: Project) => void; onDuplicate?: (p: Project) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-3">
            <th className="px-4 py-2.5 font-medium">Project</th>
            <th className="px-4 py-2.5 font-medium">Client</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">Quote total</th>
            <th className="px-4 py-2.5 text-right font-medium">Your profit</th>
            <th className="px-4 py-2.5 text-right font-medium">Updated</th>
            {(onDelete || onDuplicate) && <th className="w-16" />}
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const c = calcQuote(p.items, p.quote);
            return (
              <tr key={p.id} className="group border-b border-line last:border-0 hover:bg-hover/60">
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}`} className="font-medium text-ink hover:underline">
                    {p.name || "Untitled project"}
                  </Link>
                  <div className="text-xs text-ink-3">
                    {[p.propertyType, p.location].filter(Boolean).join(" · ")}
                    {p.isSample && <span className="ml-1.5 text-amber-700">· sample</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-2">{p.clientName || "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </td>
                <td className="tabular px-4 py-3 text-right">{c.grandTotal ? rupeesShort(c.grandTotal) : "—"}</td>
                <td className={cx("tabular px-4 py-3 text-right", c.profit < 0 ? "text-red-700" : "text-ink-2")}>
                  {c.taxable ? `${rupeesShort(c.profit)} · ${c.marginPct.toFixed(0)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-xs text-ink-3">{relativeTime(p.updatedAt)}</td>
                {(onDelete || onDuplicate) && (
                  <td className="whitespace-nowrap pr-3 text-right">
                    {onDuplicate && (
                      <button
                        onClick={() => onDuplicate(p)}
                        className="rounded p-1 text-ink-3 opacity-0 hover:bg-hover hover:text-ink group-hover:opacity-100"
                        title="Copy as a new project"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    {onDelete && <button
                      onClick={() => onDelete(p)}
                      className="rounded p-1 text-ink-3 opacity-0 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100"
                      title="Delete project"
                    >
                      <Trash2 size={14} />
                    </button>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
