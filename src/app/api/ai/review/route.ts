import { NextResponse } from "next/server";
import { aiConfigured, chatJSON, requireUser } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "title", "detail"],
        properties: {
          severity: { type: "string", enum: ["warning", "info"] },
          title: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
  },
};

const SYSTEM = `You review interior design quotations in India before they are sent to a client.
Find gaps and ambiguities that commonly cause disputes between designer and client:
responsibility for supply vs installation, missing exclusions, unclear finishes or brands,
dependencies on the client, items that usually go together but one is missing (e.g. sink without plumbing),
vague wording. Do not comment on prices or quantities. Do not repeat issues already listed under "ALREADY FLAGGED".
Return at most 8 findings, each with a short title and one-sentence detail naming the room and item.`;

export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });
  const auth = await requireUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await req.json().catch(() => null)) as { scope: string; flagged: string[] } | null;
  if (!body?.scope) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const out = await chatJSON<{ findings: { severity: "warning" | "info"; title: string; detail: string }[] }>({
      system: SYSTEM,
      user: `SCOPE OF WORK:\n${body.scope.slice(0, 30000)}\n\nALREADY FLAGGED:\n${(body.flagged ?? []).join("\n")}`,
      schemaName: "review",
      schema,
    });
    return NextResponse.json({ findings: out.findings.slice(0, 8) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
