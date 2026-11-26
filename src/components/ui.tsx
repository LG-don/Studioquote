"use client";

import Link from "next/link";
import { forwardRef, useEffect, useState } from "react";
import { X } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
const btnVariants: Record<BtnVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2",
  secondary: "bg-white text-ink border border-line-2 hover:bg-hover",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink",
  danger: "text-red-700 hover:bg-red-50",
};
const btnSizes = { sm: "h-7 px-2.5 text-[13px]", md: "h-9 px-3.5 text-sm" };

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return <button {...p} className={cx(btnBase, btnVariants[variant], btnSizes[size], className)} />;
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: BtnVariant;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cx(btnBase, btnVariants[variant], btnSizes[size], className)}>
      {children}
    </Link>
  );
}

const fieldCls =
  "w-full rounded-md border border-line-2 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-3 focus:ring-accent-soft";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...p },
  ref,
) {
  return <input ref={ref} {...p} className={cx(fieldCls, "h-9 py-0", className)} />;
});

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(fieldCls, "min-h-[80px] leading-relaxed", className)} />;
}

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cx(fieldCls, "h-9 py-0 pr-8", className)}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

/** Number input that keeps `null` for empty and only commits valid numbers. */
export function NumberInput({
  value,
  onChange,
  className,
  allowNull = true,
  ...p
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  allowNull?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(value === null || value === undefined ? "" : String(value));
  useEffect(() => {
    const parsed = text.trim() === "" ? null : Number(text);
    if (parsed !== value) setText(value === null || value === undefined ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      {...p}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/,/g, "");
        if (!/^-?\d*\.?\d*$/.test(t)) return;
        setText(t);
        if (t.trim() === "" || t === "-" || t === ".") onChange(allowNull ? null : 0);
        else onChange(Number(t));
      }}
      className={className}
    />
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("rounded-lg border border-line bg-panel", className)}>{children}</div>;
}

type Tone = "neutral" | "amber" | "red" | "green" | "blue" | "accent";
const tones: Record<Tone, string> = {
  neutral: "bg-hover text-ink-2 border-line",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  blue: "bg-sky-50 text-sky-800 border-sky-200",
  accent: "bg-accent-soft text-accent border-accent/20",
};
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded border px-1.5 py-px text-[11px] font-medium leading-4", tones[tone], className)}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">{children}</h2>
      {actions}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/20 p-4 pt-[10vh]" onMouseDown={onClose}>
      <div
        className={cx("w-full rounded-xl border border-line bg-white shadow-xl", wide ? "max-w-3xl" : "max-w-lg")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-ink-3 hover:bg-hover hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-2 bg-white px-6 py-12 text-center">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-ink-3">{body}</p>}
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return <div className="h-4 w-4 animate-spin rounded-full border-2 border-line-2 border-t-ink" />;
}

export function Loading() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div>
      <div className="text-xs text-ink-3">{label}</div>
      <div className={cx("tabular mt-0.5 text-[15px] font-semibold", tone === "good" && "text-emerald-700", tone === "bad" && "text-red-700")}>
        {value}
      </div>
      {sub && <div className="text-xs text-ink-3">{sub}</div>}
    </div>
  );
}
