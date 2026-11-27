"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, FolderOpen, LayoutGrid, LogOut, Menu, Settings as SettingsIcon, Sparkles, X } from "lucide-react";
import { useData } from "@/lib/data";
import { cx, Loading } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutGrid, match: (p: string) => p === "/" },
  { href: "/projects", label: "Projects", icon: FolderOpen, match: (p: string) => p.startsWith("/projects") },
  { href: "/rates", label: "Rate Library", icon: BookOpen, match: (p: string) => p.startsWith("/rates") },
  { href: "/settings", label: "Settings", icon: SettingsIcon, match: (p: string) => p.startsWith("/settings") },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, settings, store, userEmail, ai, signOut } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);

  if (pathname === "/login") return <>{children}</>;
  if (!ready || !settings) return <Loading />;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Phone / tablet top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-[#f6f5f2] px-4 py-2.5 md:hidden print:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-ink text-[13px] font-semibold text-white">S</div>
          <span className="text-sm font-semibold">StudioQuote</span>
        </Link>
        <button onClick={() => setMenuOpen(!menuOpen)} className="rounded p-1.5 hover:bg-hover" aria-label="Menu">
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {menuOpen && <div className="fixed inset-0 z-40 bg-ink/20 md:hidden" onClick={() => setMenuOpen(false)} />}
      <aside
        className={cx(
          "z-50 flex w-[232px] shrink-0 flex-col border-r border-line bg-[#f6f5f2] px-3 py-4 print:hidden",
          "fixed inset-y-0 left-0 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link href="/" className="mb-6 flex items-center gap-2 px-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-ink text-[13px] font-semibold text-white">S</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">StudioQuote</div>
            <div className="max-w-[150px] truncate text-[11px] text-ink-3">{settings.studioName}</div>
          </div>
        </Link>
        <nav className="space-y-0.5">
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                  active ? "bg-white font-medium text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-2 hover:bg-hover",
                )}
              >
                <n.icon size={16} strokeWidth={1.75} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 px-1 text-xs">
          <div className="rounded-md border border-line bg-white p-2.5">
            <div className="flex items-center gap-1.5 font-medium text-ink-2">
              <Sparkles size={13} />
              AI drafting
            </div>
            <div className="mt-0.5 text-ink-3">
              {ai.enabled ? `Connected · ${ai.model}` : "Not connected — templates only"}
            </div>
          </div>
          {store.mode === "demo" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
              <div className="font-medium">Demo mode</div>
              <div className="mt-0.5 text-amber-800/80">Data is saved in this browser only.</div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md border border-line bg-white p-2.5">
              <span className="truncate text-ink-2" title={userEmail ?? ""}>
                {userEmail}
              </span>
              <button onClick={signOut} className="text-ink-3 hover:text-ink" title="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
