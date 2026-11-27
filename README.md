# StudioQuote

**From client brief to a clear scope of work and an accurate quotation — for small interior design studios and independent designers in India.**

StudioQuote takes a project through three steps:

1. **Details** — client, property, rooms, requirements, and files (drawings, old BOQs, rate lists, reference images).
2. **Quote** — one room-by-room table. Every line carries its price *and* its scope (click a line to see what is included, not included, installation, assumptions and what the client provides). New projects start as a clean slate: add lines from your rate library, paste from Excel, or ask for typical lines room by room (templates, or AI from the brief if connected). Enter a room's size once and floor, ceiling, wall and skirting quantities fill in from your measurements. Rates come from your own library; overheads, profit, contingency, discount and GST use fixed formulas, and a bar at the bottom always shows what the client pays and what you earn.
3. **Check & send** — ScopeGuard lists gaps and ambiguities before the client sees them, then download the PDF or send it on WhatsApp. Every export is saved as a version (R1, R2…) under **History** so revisions can be compared.

## What's new (UX update, Nov 2026)

Based on [competitor research](docs/competitor-research.md) — the most common complaint about interior design software is "too many menus and steps":

- Scope and pricing merged into a single **Quote** screen.
- **Room sizes → quantities**: L × W × H once per room; linked lines update automatically (you can override any line).
- **Quantity calculator** (L × W × count) on every line.
- New projects start **clean**; *Suggest typical lines* is available per room when you want a head start.
- **"Needs a quantity or rate"** filter and a *Next* button that walks you through what's left.
- **Single cost rate / material + labour** column toggle.
- **Paste rows from Excel** directly; **copy a previous project** as a starting point.
- **WhatsApp sharing** (shares the PDF on phones; opens a ready message on desktop).
- Sticky totals bar with markup, discount and GST in one panel; works on phones and tablets.

Clients only ever see **final rates**. Your cost, overheads and profit stay internal.

---

## Run it locally (5 minutes)

You need [Node.js 20+](https://nodejs.org).

```bash
git clone https://github.com/LG-don/Studioquote.git
cd studioquote
npm install
npm run dev
```

Open http://localhost:3000. It starts in **demo mode** with a sample 3BHK project and a sample rate library.

### Demo mode vs. connected mode

| | Demo mode (no setup) | Connected mode |
|---|---|---|
| Where data is saved | This browser only | Supabase (your account, any device) |
| Sign-in | None | Email + password |
| File uploads | Stored in this browser | Supabase Storage (private) |
| Scope drafting | Templates | Templates + AI (with OpenAI key) |
| ScopeGuard | Rule checks | Rule checks + AI review |

The sidebar always shows which mode you are in and whether AI is connected. Nothing pretends to be AI when it isn't.

---

## Connect Supabase (saved data + sign-in)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the tables, the private file bucket, and the security rules that keep each studio's data private.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. Copy `.env.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
5. Restart `npm run dev`. You'll see a sign-in page. Create an account (Supabase may ask you to confirm by email — you can turn this off under **Authentication → Providers → Email**).

## Connect OpenAI (optional AI drafting)

Add to `.env.local`:
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```
The key is only used on the server (`src/lib/server/ai.ts`) and is never sent to the browser. AI routes require a signed-in user. For local testing without Supabase you can set `ALLOW_AI_WITHOUT_LOGIN=true` — never do this on a public deployment.

What the AI does — and doesn't do:
- ✅ Drafts scope items, wording, inclusions/exclusions, and flags missing information.
- ✅ Matches items to entries in **your** rate library.
- ✅ Reviews a finished scope for ambiguities (ScopeGuard → AI review).
- ❌ Never sets quantities, dimensions, prices or rates. The server strips any numbers; quantities are always left for you to measure.

## Deploy (Vercel)

1. Push this repo to GitHub, then **Import** it at [vercel.com/new](https://vercel.com/new).
2. Add the same environment variables in **Settings → Environment Variables**.
3. In Supabase → **Authentication → URL Configuration**, set the Site URL to your Vercel URL.

---

## How the numbers work

All calculations are in [`src/lib/calc.ts`](src/lib/calc.ts) and covered by tests.

```
cost rate      = material rate + labour rate                      (your cost)
client rate    = cost rate × (1 + overhead%) × (1 + profit%)       rounded
                 [× (1 + contingency%) if contingency is not shown as its own line]
line amount    = qty × client rate                                 rounded to ₹1
subtotal       = Σ line amounts
contingency    = subtotal × contingency%                           (only if shown separately)
discount       = % of (subtotal + contingency), or a fixed amount
taxable value  = subtotal + contingency − discount
GST            = CGST + SGST (same state) or IGST (inter-state), per-category rate overrides allowed
grand total    = taxable value + GST, rounded (round-off shown)
your profit    = taxable value − cost − overhead allowance − contingency buffer
```

GST is never applied silently: the treatment is chosen per quote, defaults from your GSTIN and state, and can be set to "No GST". Check applicable rates with your CA.

## Rates

The bundled **sample rate library is synthetic** — placeholder numbers for the demo, not market rates. Replace them with your vendors' rates (edit inline, or import from Excel/CSV with columns like *Category, Item, Specification, Unit, Material rate, Labour rate*). Any rate you edit stops being marked "sample".

---

## Project structure

```
src/
  app/
    page.tsx                     Dashboard
    projects/                    Projects list, new project
    projects/[id]/               Brief (+ files)
    projects/[id]/quote/         Quote: room-by-room lines with scope details, sizes, markup & GST
    projects/[id]/proposal/      Check & send: ScopeGuard, PDF preview/export, WhatsApp, payment, timeline, terms
    projects/[id]/versions/      History: saved versions and comparison
    rates/                       Rate library
    settings/                    Studio branding, GST, defaults
    login/                       Sign-in (connected mode)
    api/ai/scope, api/ai/review  Server-side AI routes
  lib/
    calc.ts                      Deterministic quotation maths
    measure.ts                   Quantities from room measurements
    scopeguard.ts                Rule-based gap detection
    templates.ts                 Room templates and standard scope wording
    store.ts                     Storage: DemoStore (browser) / CloudStore (Supabase)
    excel.ts                     Excel/CSV import and export
    versions.ts                  Snapshots and diffs
  components/pdf/ProposalDocument.tsx   The 10-section client proposal
supabase/schema.sql              Database, storage and security rules
```

Tech: Next.js 15, React 19, Tailwind CSS 4, Supabase, OpenAI (via `fetch`), `@react-pdf/renderer` for PDFs (generated in the browser, so no server-side Chrome is needed), SheetJS for Excel.

## Tests

```bash
npm test        # calculation engine, ScopeGuard, Excel import, PDF rendering
npm run lint
npm run build
```

## Known limitations / next steps

- Quantities are not read from drawings — enter room sizes or measure lines (by design for v1). Room-size quantities don't deduct doors and windows.
- PDF drawings are stored for reference; only spreadsheets are read as AI context.
- One user per studio account; team members and roles are not yet supported.
- No formal variation orders yet — use versions to track revisions.
- Projects are stored as one JSON document each; fine for small studios, revisit for large teams.

Fonts: Geist (SIL Open Font License, see `public/fonts/LICENSE.txt`).
