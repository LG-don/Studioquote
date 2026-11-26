import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/constants";
import { aiConfigured, chatJSON, requireUser } from "@/lib/server/ai";

export const dynamic = "force-dynamic";

interface Body {
  project: {
    name: string;
    propertyType: string;
    projectType: string;
    carpetArea: number | null;
    location: string;
    description: string;
    requirements: string;
  };
  rooms: string[];
  fileTexts: string[];
  rateCatalog: { id: string; category: string; name: string; unit: string }[];
}

interface AiItem {
  room: string;
  category: string;
  item: string;
  specification: string;
  brand: string;
  included: string;
  excluded: string;
  installation: string;
  assumptions: string;
  dependencies: string;
  unit: string;
  rateId: string | null;
  missing: string[];
}

const str = { type: "string" };
const schema = {
  type: "object",
  additionalProperties: false,
  required: ["items", "notes"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["room", "category", "item", "specification", "brand", "included", "excluded", "installation", "assumptions", "dependencies", "unit", "rateId", "missing"],
        properties: {
          room: str, category: { type: "string", enum: [...CATEGORIES] }, item: str, specification: str, brand: str,
          included: str, excluded: str, installation: str, assumptions: str, dependencies: str, unit: str,
          rateId: { type: ["string", "null"] },
          missing: { type: "array", items: str },
        },
      },
    },
    notes: { type: "array", items: str },
  },
};

const SYSTEM = `You are a senior interior design estimator in India helping a design studio draft a scope of work.
Rules you must follow:
- Only include work that the brief, requirements or supplied spreadsheets support, plus standard enabling work that clearly goes with it (e.g. plumbing for a new bathroom).
- NEVER invent quantities, dimensions, prices or rates. You do not output any numbers for quantity or cost.
- Never invent brands or specifications that were not supplied. If the brief names a brand or finish, use it. Otherwise leave "brand" empty and write a neutral specification (e.g. "BWP ply carcass, laminate shutters") only when it is standard practice, and add a "missing" note asking the designer to confirm.
- Where information is missing or ambiguous, add a short note to "missing" (e.g. "Shutter finish to be confirmed", "Who supplies the hob?"). Do not guess.
- If an item matches an entry in the studio's rate catalogue, set "rateId" to that entry's id; otherwise null.
- Use only the rooms provided. Put site-wide items (protection, debris, transport, cleaning) in the room "General / site".
- Respect explicit exclusions in the brief (e.g. "keep existing flooring") by NOT adding that work, and mention it in "excluded" of a related item.
- Write in clear, professional Indian English, short phrases, no marketing language.
- "notes" is for overall observations the designer should know (max 5).`;

export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured on this server (OPENAI_API_KEY missing)." }, { status: 503 });
  const auth = await requireUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const rooms = (body.rooms ?? []).slice(0, 30);
  if (!rooms.length) return NextResponse.json({ error: "Select at least one room" }, { status: 400 });

  const user = [
    `PROJECT: ${body.project.name} — ${body.project.propertyType} (${body.project.projectType}), ${body.project.carpetArea ?? "unknown"} sq.ft carpet, ${body.project.location || "location not given"}`,
    `DESCRIPTION:\n${body.project.description || "(none)"}`,
    `CLIENT REQUIREMENTS:\n${body.project.requirements || "(none)"}`,
    `ROOMS TO SCOPE: ${rooms.join(", ")}`,
    body.fileTexts?.length ? `SUPPLIED SPREADSHEETS (excerpts):\n${body.fileTexts.join("\n\n").slice(0, 24000)}` : "",
    `STUDIO RATE CATALOGUE (id | category | item | unit):\n${(body.rateCatalog ?? []).slice(0, 400).map((r) => `${r.id} | ${r.category} | ${r.name} | ${r.unit}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const out = await chatJSON<{ items: AiItem[]; notes: string[] }>({ system: SYSTEM, user, schemaName: "scope_draft", schema });
    // Server-side sanitising — AI output never carries numbers, and ids must exist.
    const rateIds = new Set((body.rateCatalog ?? []).map((r) => r.id));
    const roomSet = new Set([...rooms, "General / site"]);
    const items = (out.items ?? []).slice(0, 250).map((i) => ({
      ...i,
      room: roomSet.has(i.room) ? i.room : "General / site",
      category: (CATEGORIES as readonly string[]).includes(i.category) ? i.category : "Site & general",
      rateId: i.rateId && rateIds.has(i.rateId) ? i.rateId : null,
      missing: (i.missing ?? []).slice(0, 6),
    }));
    return NextResponse.json({ items, notes: (out.notes ?? []).slice(0, 5) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
