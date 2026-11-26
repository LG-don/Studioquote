// Storage layer. Two interchangeable implementations:
//   • DemoStore  — browser storage (localStorage + IndexedDB for files). No account needed.
//   • CloudStore — Supabase (Postgres + Auth + Storage), per-user rows protected by RLS.
// The rest of the app only talks to the Store interface.

import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { DEFAULT_SETTINGS, sampleProject, sampleSettings } from "./defaults";
import { uid } from "./ids";
import { SAMPLE_RATES } from "./sampleRates";
import { getSupabase } from "./supabase";
import type { Project, Rate, Settings } from "./types";

export interface Store {
  mode: "demo" | "cloud";
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  saveProject(p: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
  getRates(): Promise<Rate[]>;
  saveRates(r: Rate[]): Promise<void>;
  uploadFile(projectId: string, file: File): Promise<string>;
  fileUrl(path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
}

function mergeSettings(s: Partial<Settings> | null | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), defaults: { ...DEFAULT_SETTINGS.defaults, ...(s?.defaults ?? {}) } };
}

const safeName = (n: string) => n.replace(/[^\w.\-]+/g, "_").slice(-80);

// ---------------------------------------------------------------- Demo
const K = { projects: "sq.projects", settings: "sq.settings", rates: "sq.rates", seeded: "sq.seeded.v1" };

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export class DemoStore implements Store {
  mode = "demo" as const;

  constructor() {
    if (typeof window !== "undefined" && !localStorage.getItem(K.seeded)) this.seed();
  }

  seed() {
    const s = sampleSettings();
    const p = sampleProject(s);
    writeJSON(K.settings, { ...s, nextQuoteNo: s.nextQuoteNo + 1 });
    writeJSON(K.rates, SAMPLE_RATES);
    writeJSON(K.projects, { [p.id]: p });
    localStorage.setItem(K.seeded, "1");
  }

  async reset() {
    const projects = readJSON<Record<string, Project>>(K.projects, {});
    for (const p of Object.values(projects)) for (const f of p.files) await idbDel(f.path).catch(() => {});
    Object.values(K).forEach((k) => localStorage.removeItem(k));
    this.seed();
  }

  async listProjects() {
    return Object.values(readJSON<Record<string, Project>>(K.projects, {})).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async getProject(id: string) {
    return readJSON<Record<string, Project>>(K.projects, {})[id] ?? null;
  }
  async saveProject(p: Project) {
    const all = readJSON<Record<string, Project>>(K.projects, {});
    all[p.id] = p;
    writeJSON(K.projects, all);
  }
  async deleteProject(id: string) {
    const all = readJSON<Record<string, Project>>(K.projects, {});
    for (const f of all[id]?.files ?? []) await idbDel(f.path).catch(() => {});
    delete all[id];
    writeJSON(K.projects, all);
  }
  async getSettings() {
    return mergeSettings(readJSON<Partial<Settings> | null>(K.settings, null));
  }
  async saveSettings(s: Settings) {
    writeJSON(K.settings, s);
  }
  async getRates() {
    return readJSON<Rate[]>(K.rates, SAMPLE_RATES);
  }
  async saveRates(r: Rate[]) {
    writeJSON(K.rates, r);
  }
  async uploadFile(projectId: string, file: File) {
    const path = `demo/${projectId}/${uid("f")}-${safeName(file.name)}`;
    await idbSet(path, file);
    return path;
  }
  async fileUrl(path: string) {
    const blob = await idbGet<Blob>(path);
    if (!blob) throw new Error("File not found in this browser");
    return URL.createObjectURL(blob);
  }
  async deleteFile(path: string) {
    await idbDel(path);
  }
}

// ---------------------------------------------------------------- Cloud
const BUCKET = "project-files";

export class CloudStore implements Store {
  mode = "cloud" as const;
  private sb = getSupabase()!;

  private async userId() {
    const { data } = await this.sb.auth.getUser();
    if (!data.user) throw new Error("Not signed in");
    return data.user.id;
  }

  async listProjects() {
    const { data, error } = await this.sb.from("projects").select("data").order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => r.data as Project);
  }
  async getProject(id: string) {
    const { data, error } = await this.sb.from("projects").select("data").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data?.data as Project) ?? null;
  }
  async saveProject(p: Project) {
    const user_id = await this.userId();
    const { error } = await this.sb.from("projects").upsert({ id: p.id, user_id, data: p, updated_at: p.updatedAt });
    if (error) throw error;
  }
  async deleteProject(id: string) {
    const p = await this.getProject(id);
    const paths = p?.files.map((f) => f.path) ?? [];
    if (paths.length) await this.sb.storage.from(BUCKET).remove(paths);
    const { error } = await this.sb.from("projects").delete().eq("id", id);
    if (error) throw error;
  }
  async getSettings() {
    const { data, error } = await this.sb.from("studio_settings").select("data").maybeSingle();
    if (error) throw error;
    return mergeSettings(data?.data as Partial<Settings> | undefined);
  }
  async saveSettings(s: Settings) {
    const user_id = await this.userId();
    const { error } = await this.sb.from("studio_settings").upsert({ user_id, data: s, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  async getRates() {
    const { data, error } = await this.sb.from("rate_libraries").select("data").maybeSingle();
    if (error) throw error;
    if (!data) {
      // First sign-in: start with the sample library so templates work immediately.
      await this.saveRates(SAMPLE_RATES);
      return SAMPLE_RATES;
    }
    return data.data as Rate[];
  }
  async saveRates(r: Rate[]) {
    const user_id = await this.userId();
    const { error } = await this.sb.from("rate_libraries").upsert({ user_id, data: r, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  async uploadFile(projectId: string, file: File) {
    const user = await this.userId();
    const path = `${user}/${projectId}/${uid("f")}-${safeName(file.name)}`;
    const { error } = await this.sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
    if (error) throw error;
    return path;
  }
  async fileUrl(path: string) {
    const { data, error } = await this.sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }
  async deleteFile(path: string) {
    await this.sb.storage.from(BUCKET).remove([path]);
  }
}
