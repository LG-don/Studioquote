import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isCloudConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

/** Browser Supabase client, or null when the app runs in demo mode. */
export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured) return null;
  if (!client) client = createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

/** Authorization header for calls to our own API routes. */
export async function authHeaders(): Promise<Record<string, string>> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
