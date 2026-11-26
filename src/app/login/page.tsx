"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase, isCloudConfigured } from "@/lib/supabase";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    if (!isCloudConfigured) router.replace("/");
    getSupabase()?.auth.getSession().then(({ data }) => data.session && router.replace("/"));
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setMsg(null);
    const { data, error } =
      mode === "signin"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) return setMsg({ tone: "error", text: error.message });
    if (mode === "signup" && !data.session) return setMsg({ tone: "ok", text: "Check your email to confirm your account, then sign in." });
    location.href = "/";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-ink text-sm font-semibold text-white">S</div>
          <div>
            <div className="font-semibold tracking-tight">StudioQuote</div>
            <div className="text-xs text-ink-3">Quotations for interior designers</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-6">
          <h1 className="text-lg font-semibold">{mode === "signin" ? "Sign in" : "Create your studio account"}</h1>
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </Field>
          {msg && <p className={msg.tone === "error" ? "text-sm text-red-700" : "text-sm text-emerald-700"}>{msg.text}</p>}
          <Button variant="primary" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-3">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button className="text-ink underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
