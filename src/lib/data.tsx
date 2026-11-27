"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FEE_CATEGORY } from "./constants";
import { SAMPLE_RATES } from "./sampleRates";
import { CloudStore, DemoStore, type Store } from "./store";
import { getSupabase, isCloudConfigured } from "./supabase";
import type { Project, Rate, Settings } from "./types";

interface AiStatus {
  enabled: boolean;
  model: string | null;
}

interface DataCtx {
  store: Store;
  ready: boolean;
  settings: Settings | null;
  rates: Rate[];
  userEmail: string | null;
  ai: AiStatus;
  saveSettings(s: Settings): Promise<void>;
  saveRates(r: Rate[]): Promise<void>;
  signOut(): Promise<void>;
  resetDemo(): Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const store = useMemo<Store>(() => (isCloudConfigured ? new CloudStore() : new DemoStore()), []);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(!isCloudConfigured);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [ai, setAi] = useState<AiStatus>({ enabled: false, model: null });

  // Auth (cloud mode only)
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setUserEmail(data.session?.user.email ?? null);
      if (!data.session) setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      setUserEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isCloudConfigured && !authed && ready && pathname !== "/login") router.replace("/login");
  }, [authed, ready, pathname, router]);

  // Load studio data once signed in
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, loaded] = await Promise.all([store.getSettings(), store.getRates()]);
        if (cancelled) return;
        // Libraries created before design-fee lines existed get the sample fee rates once.
        let r = loaded;
        if (!loaded.some((x) => x.category === FEE_CATEGORY)) {
          r = [...SAMPLE_RATES.filter((x) => x.category === FEE_CATEGORY), ...loaded];
          store.saveRates(r).catch(() => {});
        }
        setSettings(s);
        setRates(r);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, store]);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((j) => setAi({ enabled: !!j.ai, model: j.model ?? null }))
      .catch(() => setAi({ enabled: false, model: null }));
  }, []);

  const saveSettings = useCallback(
    async (s: Settings) => {
      setSettings(s);
      await store.saveSettings(s);
    },
    [store],
  );
  const saveRates = useCallback(
    async (r: Rate[]) => {
      setRates(r);
      await store.saveRates(r);
    },
    [store],
  );
  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    setSettings(null);
    router.replace("/login");
  }, [router]);
  const resetDemo = useCallback(async () => {
    if (store instanceof DemoStore) {
      await store.reset();
      setSettings(await store.getSettings());
      setRates(await store.getRates());
    }
  }, [store]);

  const value: DataCtx = { store, ready: ready && (!authed || !!settings), settings, rates, userEmail, ai, saveSettings, saveRates, signOut, resetDemo };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useData outside DataProvider");
  return c;
}

// ------------------------------------------------------------- Project editing

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useProjectState(id: string) {
  const { store, ready } = useData();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const latest = useRef<Project | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    store.getProject(id).then((p) => {
      if (cancelled) return;
      setProject(p);
      latest.current = p;
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, store, ready]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = latest.current;
    if (!p) return;
    setSaveState("saving");
    try {
      await store.saveProject(p);
      setSaveState("saved");
    } catch (e) {
      console.error(e);
      setSaveState("error");
    }
  }, [store]);

  const update = useCallback(
    (fn: (p: Project) => Project) => {
      const prev = latest.current;
      if (!prev) return;
      const next = { ...fn(prev), updatedAt: new Date().toISOString() };
      latest.current = next;
      setProject(next);
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 600);
    },
    [flush],
  );

  // Save pending edits when leaving the page
  useEffect(() => {
    const onUnload = () => {
      if (timer.current) flush();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (timer.current) flush();
    };
  }, [flush]);

  return { project, loading, update, saveState, flush };
}

type ProjectCtxValue = ReturnType<typeof useProjectState> & { project: Project };
const ProjectCtx = createContext<ProjectCtxValue | null>(null);
export const ProjectProvider = ProjectCtx.Provider;
export function useProject() {
  const c = useContext(ProjectCtx);
  if (!c) throw new Error("useProject outside ProjectProvider");
  return c;
}
