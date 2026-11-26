// Server-only helpers for AI calls. The OpenAI key never reaches the browser.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
export const aiConfigured = () => Boolean(process.env.OPENAI_API_KEY);

/** When Supabase is configured, only signed-in users may call AI routes. */
export async function requireUser(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Demo mode. Allow only if explicitly enabled, so a public demo can't burn the key.
    if (process.env.ALLOW_AI_WITHOUT_LOGIN === "true") return { ok: true };
    return { ok: false, status: 401, error: "AI needs sign-in. Set up Supabase, or set ALLOW_AI_WITHOUT_LOGIN=true for local testing." };
  }
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "Not signed in" };
  const sb = createClient(url, anon);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Session expired — sign in again" };
  return { ok: true };
}

export async function chatJSON<T>(opts: { system: string; user: string; schemaName: string; schema: object }): Promise<T> {
  try {
    return await callOpenAI<T>(opts);
  } catch (e) {
    const msg = (e as Error).message;
    if (/fetch failed|timeout|aborted/i.test(msg)) throw new Error(`Could not reach OpenAI (${msg}). Check the server's internet access and try again.`);
    throw e;
  }
}

async function callOpenAI<T>(opts: { system: string; user: string; schemaName: string; schema: object }): Promise<T> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    signal: AbortSignal.timeout(90_000),
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      response_format: { type: "json_schema", json_schema: { name: opts.schemaName, strict: true, schema: opts.schema } },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return JSON.parse(content) as T;
}
