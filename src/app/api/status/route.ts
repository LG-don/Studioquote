import { NextResponse } from "next/server";
import { AI_MODEL, aiConfigured } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

export function GET() {
  const cloud = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  // AI is usable when a key is set and either users sign in, or local testing explicitly allows it.
  const usable = aiConfigured() && (cloud || process.env.ALLOW_AI_WITHOUT_LOGIN === "true");
  return NextResponse.json({ ai: usable, model: usable ? AI_MODEL : null });
}
