"use client";

// The client-facing proposal. Rendered to a real PDF in the browser with @react-pdf/renderer.
// Only client rates are shown — overheads, profit and cost rates never appear here.

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { QuoteCalc } from "@/lib/calc";
import { delegatedCategories, milestoneAmounts } from "@/lib/calc";
import { ENGAGEMENT_LABEL } from "@/lib/constants";
import { amountInWords, formatDate, num, rupees } from "@/lib/format";
import type { Project, ScopeItem, Settings } from "@/lib/types";

let fontsRegistered = false;
export function registerFonts(origin: string) {
  if (fontsRegistered) return;
  Font.register({
    family: "Geist",
    fonts: [
      { src: `${origin}/fonts/Geist-Light.ttf`, fontWeight: 300 },
      { src: `${origin}/fonts/Geist-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/Geist-Medium.ttf`, fontWeight: 500 },
      { src: `${origin}/fonts/Geist-SemiBold.ttf`, fontWeight: 600 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  fontsRegistered = true;
}

const INK = "#1c1b19";
const INK2 = "#4a4843";
const INK3 = "#85827b";
const LINE = "#dedbd4";
const SOFT = "#f4f3ef";
const ACCENT = "#2f4a3a";

const s = StyleSheet.create({
  page: { fontFamily: "Geist", fontSize: 8.5, color: INK, paddingTop: 54, paddingBottom: 54, paddingHorizontal: 48 },

  // Fixed header/footer get their own line height: an inherited multiplier compounds on every page (react-pdf quirk).
  header: { position: "absolute", top: 22, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: INK3 },
  fixedText: { fontSize: 7 },
  footer: { position: "absolute", bottom: 22, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: INK3 },
  sectionNo: { fontSize: 7.5, color: ACCENT, letterSpacing: 1.2, marginBottom: 3 },
  h1: { fontSize: 18, fontWeight: 500, letterSpacing: -0.3, marginBottom: 14 },
  h2: { fontSize: 10.5, fontWeight: 600, marginTop: 12, marginBottom: 5 },
  h3: { fontSize: 9, fontWeight: 600, marginBottom: 2 },
  muted: { color: INK3 },
  label: { fontSize: 7, color: INK3, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  rule: { borderBottomWidth: 0.5, borderBottomColor: LINE },
  th: { fontSize: 7, color: INK3, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.6, paddingVertical: 5 },
  td: { paddingVertical: 4.5 },
  right: { textAlign: "right" },
  row: { flexDirection: "row" },
});

// Every body text sets its own line height. It is deliberately NOT set on the page or a wrapper:
// react-pdf re-applies a unitless line height to repeating (fixed) elements on every page,
// which compounds and breaks layout.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sty = any;
function T({ style, ...p }: Omit<React.ComponentProps<typeof Text>, "style"> & { style?: Sty; children?: React.ReactNode }) {
  const extra = Array.isArray(style) ? style : style ? [style] : [];
  return <Text {...p} style={[{ lineHeight: 1.4 }, ...extra]} />;
}

function Shell({ project, settings, children }: { project: Project; settings: Settings; children: React.ReactNode }) {
  return (
    <Page size="A4" style={s.page} wrap>
      <View style={s.header} fixed>
        <Text style={s.fixedText}>{settings.studioName}</Text>
        <Text style={s.fixedText}>
          {project.name} · {project.quoteNumber}
        </Text>
      </View>
      {children}
      <View style={s.footer} fixed>
        <Text style={s.fixedText}>{[settings.website, settings.email, settings.phone].filter(Boolean).join("  ·  ")}</Text>
        <Text style={s.fixedText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

function SectionHead({ n, title, breakBefore }: { n: number; title: string; breakBefore?: boolean }) {
  return (
    <View break={breakBefore} wrap={false}>
      <T style={s.sectionNo}>{String(n).padStart(2, "0")}</T>
      <T style={s.h1}>{title}</T>
    </View>
  );
}

function KV({ k, v, w = 120 }: { k: string; v: string; w?: number }) {
  if (!v) return null;
  return (
    <View style={[s.row, { marginBottom: 2 }]}>
      <T style={[s.muted, { width: w }]}>{k}</T>
      <T style={{ flex: 1 }}>{v}</T>
    </View>
  );
}

function groupBy<T>(arr: T[], key: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  arr.forEach((x) => {
    const k = key(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(x);
  });
  return [...m.entries()];
}

export function ProposalDocument({
  project,
  settings,
  calc,
  revision,
  issuedOn,
}: {
  project: Project;
  settings: Settings;
  calc: QuoteCalc;
  revision: number;
  issuedOn: Date;
}) {
  const validUntil = new Date(issuedOn.getTime() + project.quote.validityDays * 86400000);
  const engagement = project.engagement ?? "turnkey";
  const designOnly = engagement === "design_only";
  const delegated = delegatedCategories(project);
  // Work done by the client's own vendors is listed separately and never priced here.
  const pricedItems = project.items.filter((i) => !delegated.has(i.category));
  // Design-only: leftover work lines are simply not part of the proposal.
  const vendorItems = designOnly ? [] : project.items.filter((i) => delegated.has(i.category));
  const rooms = groupBy(pricedItems, (i) => i.room);
  const spaces = project.rooms.filter((r) => r !== "Design services" && r !== "General / site");
  // Design-only: the client sees one professional fee, never how it was built up.
  const categories = designOnly ? [{ key: "Professional design fee", client: calc.clientSubtotal, cost: 0, count: 1 }] : calc.byCategory;
  const milestoneAmts = milestoneAmounts(calc.grandTotal, project.payment);
  const totalWeeks = project.timeline.reduce((a, p) => a + (Number(p.weeks) || 0), 0);
  const exclusionsByCategory = groupBy(
    pricedItems.filter((i) => i.excluded.trim()),
    (i) => i.category,
  ).map(([cat, items]) => [cat, [...new Set(items.map((i) => i.excluded.trim().replace(/\.$/, "")))]] as [string, string[]]);
  const deps = [...new Set(pricedItems.map((i) => i.dependencies.trim()).filter(Boolean))];
  const ref = `${project.quoteNumber}${revision > 0 ? ` · R${revision}` : ""}`;
  let sec = 0;

  return (
    <Document title={`${project.name} — Proposal ${ref}`} author={settings.studioName} subject="Interior design proposal">
      {/* 1. Cover */}
      <Page size="A4" style={[s.page, { paddingTop: 48, paddingBottom: 48 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          {settings.logoDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={settings.logoDataUrl} style={{ height: 34, maxWidth: 160, objectFit: "contain" }} />
          ) : (
            <T style={{ fontSize: 12, fontWeight: 600 }}>{settings.studioName}</T>
          )}
          <View style={{ alignItems: "flex-end" }}>
            <T style={s.label}>Proposal</T>
            <T>{ref}</T>
          </View>
        </View>

        <View style={{ marginTop: 200 }}>
          <T style={[s.label, { color: ACCENT }]}>{designOnly ? "Interior design proposal" : engagement === "mixed" ? "Interior design & execution proposal" : "Interior design proposal & quotation"}</T>
          <T style={{ fontSize: 34, fontWeight: 300, letterSpacing: -0.8, lineHeight: 1.15, marginTop: 6 }}>{project.name}</T>
          <T style={{ fontSize: 11, color: INK2, marginTop: 8 }}>
            {[project.propertyType, project.location].filter(Boolean).join(" · ")}
          </T>
        </View>

        <View style={{ marginTop: 70, flexDirection: "row", borderTopWidth: 0.5, borderTopColor: INK, paddingTop: 12 }}>
          <View style={{ flex: 1.3, paddingRight: 12 }}>
            <T style={s.label}>Prepared for</T>
            <T style={{ fontSize: 10, fontWeight: 500 }}>{project.clientName}</T>
            <T style={s.muted}>{project.clientAddress}</T>
          </View>
          <View style={{ flex: 1 }}>
            <T style={s.label}>Issued</T>
            <T>{formatDate(issuedOn)}</T>
            <T style={[s.label, { marginTop: 6 }]}>Valid until</T>
            <T>{formatDate(validUntil)}</T>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <T style={s.label}>Total investment</T>
            <T style={{ fontSize: 15, fontWeight: 600 }}>{rupees(calc.grandTotal)}</T>
            <T style={s.muted}>{project.quote.gstMode === "none" ? "GST not applicable" : "inclusive of GST"}</T>
          </View>
        </View>

        <View style={{ position: "absolute", bottom: 48, left: 48, right: 48 }}>
          <View style={[s.rule, { marginBottom: 8 }]} />
          <T style={{ fontWeight: 500 }}>{settings.studioName}</T>
          {settings.tagline ? <T style={s.muted}>{settings.tagline}</T> : null}
          <T style={s.muted}>{[settings.address, settings.phone, settings.email, settings.website].filter(Boolean).join("  ·  ")}</T>
          {settings.gstin ? <T style={s.muted}>GSTIN {settings.gstin}</T> : null}
        </View>
      </Page>

      <Shell project={project} settings={settings}>
        {/* 2. Summary */}
        <SectionHead n={++sec} title="Project summary" />
        <View style={s.row}>
          <View style={{ flex: 1, paddingRight: 24 }}>
            <KV k="Client" v={project.clientName} />
            <KV k="Site" v={project.clientAddress || project.location} />
            <KV k="Property" v={project.propertyType} />
            <KV k="Carpet area" v={project.carpetArea ? `${num(project.carpetArea)} sq.ft` : ""} />
            <KV k="Engagement" v={ENGAGEMENT_LABEL[engagement]} />
            <KV k="Spaces in scope" v={(spaces.length ? spaces : rooms.map(([r]) => r)).join(", ")} />
            <KV k="Estimated duration" v={totalWeeks ? `${totalWeeks} weeks from design sign-off` : ""} />
            {project.description ? <T style={{ marginTop: 10, color: INK2 }}>{project.description}</T> : null}
          </View>
          <View style={{ width: 200 }}>
            <T style={s.label}>{designOnly ? "Fee" : "Investment by space"}</T>
            {calc.byRoom.map((r) => (
              <View key={r.key} style={[s.row, s.rule, { paddingVertical: 3.5 }]}>
                <T style={{ flex: 1 }}>{r.key}</T>
                <T>{rupees(r.client)}</T>
              </View>
            ))}
            <View style={[s.row, { paddingVertical: 4 }]}>
              <T style={{ flex: 1, fontWeight: 600 }}>Subtotal</T>
              <T style={{ fontWeight: 600 }}>{rupees(calc.clientSubtotal)}</T>
            </View>
            <T style={[s.muted, { fontSize: 7 }]}>Before {calc.contingencyAmount ? "contingency, " : ""}{calc.discountAmount ? "discount and " : ""}taxes. See commercial summary.</T>
          </View>
        </View>

        {/* 3. Scope of work */}
        <SectionHead n={++sec} title={designOnly ? "Scope of services" : "Scope of work"} breakBefore />
        {rooms.map(([room, items]) => (
          <View key={room} style={{ marginBottom: 8 }}>
            <View wrap={false} minPresenceAhead={70}>
              <View style={{ borderBottomWidth: 0.75, borderBottomColor: INK, paddingBottom: 3, marginTop: 12, marginBottom: 2 }}>
                <T style={{ fontSize: 10.5, fontWeight: 600 }}>{room}</T>
              </View>
              <View style={s.row}>
                <T style={[s.th, { width: 18 }]}> </T>
                <T style={[s.th, { width: 165 }]}>Item & specification</T>
                <T style={[s.th, { flex: 1, paddingRight: 8 }]}>Included</T>
                <T style={[s.th, { flex: 1 }]}>Not included</T>
              </View>
            </View>
            {items.map((it, i) => (
              <ScopeBlock key={it.id} it={it} n={i + 1} />
            ))}
          </View>
        ))}

        {!designOnly && (
          <>
        {/* 4. Detailed BOQ */}
        <SectionHead n={++sec} title="Bill of quantities" breakBefore />
        <View style={[s.row, { borderBottomWidth: 0.75, borderBottomColor: INK }]}>
          <T style={[s.th, { width: 22 }]}>No.</T>
          <T style={[s.th, { flex: 1 }]}>Item & specification</T>
          <T style={[s.th, s.right, { width: 44 }]}>Qty</T>
          <T style={[s.th, { width: 34, paddingLeft: 6 }]}>Unit</T>
          <T style={[s.th, s.right, { width: 62 }]}>Rate</T>
          <T style={[s.th, s.right, { width: 72 }]}>Amount</T>
        </View>
        {rooms.map(([room, items], ri) => {
          const sub = items.reduce((a, it) => a + calc.lines[it.id].clientAmount, 0);
          return (
            <View key={room}>
              <View style={{ backgroundColor: SOFT, paddingVertical: 4, paddingHorizontal: 4, marginTop: 4 }} minPresenceAhead={40}>
                <T style={{ fontWeight: 600 }}>
                  {String.fromCharCode(65 + (ri % 26))}. {room}
                </T>
              </View>
              {items.map((it, i) => {
                const l = calc.lines[it.id];
                return (
                  <View key={it.id} style={[s.row, s.rule]} wrap={false}>
                    <T style={[s.td, s.muted, { width: 22 }]}>{i + 1}</T>
                    <View style={[s.td, { flex: 1, paddingRight: 8 }]}>
                      <T style={{ fontWeight: 500 }}>{it.item}</T>
                      {it.specification || it.brand ? (
                        <T style={[s.muted, { fontSize: 7.5 }]}>{[it.specification, it.brand].filter(Boolean).join(" · ")}</T>
                      ) : null}
                    </View>
                    <T style={[s.td, s.right, { width: 44 }]}>{it.qty !== null ? num(it.qty) : "TBD"}</T>
                    <T style={[s.td, { width: 34, paddingLeft: 6 }]}>{it.unit}</T>
                    <T style={[s.td, s.right, { width: 62 }]}>{l.clientRate ? num(l.clientRate) : "TBD"}</T>
                    <T style={[s.td, s.right, { width: 72 }]}>{l.clientAmount ? rupees(l.clientAmount) : "—"}</T>
                  </View>
                );
              })}
              <View style={[s.row, { paddingVertical: 4 }]} wrap={false}>
                <T style={{ flex: 1, textAlign: "right", color: INK2 }}>Subtotal — {room}</T>
                <T style={{ width: 72, textAlign: "right", fontWeight: 600 }}>{rupees(sub)}</T>
              </View>
            </View>
          );
        })}

          </>
        )}

        {/* 5. Commercial summary */}
        <SectionHead n={++sec} title={designOnly ? "Professional fee" : "Commercial summary"} breakBefore />
        <View style={{ width: 340 }}>
          <View style={[s.row, { borderBottomWidth: 0.75, borderBottomColor: INK }]}>
            <T style={[s.th, { flex: 1 }]}>{designOnly ? "Description" : "Work category"}</T>
            <T style={[s.th, s.right]}>Amount</T>
          </View>
          {categories.map((c) => (
            <View key={c.key} style={[s.row, s.rule]}>
              <T style={[s.td, { flex: 1 }]}>{c.key}</T>
              <T style={[s.td, s.right]}>{rupees(c.client)}</T>
            </View>
          ))}
          <View wrap={false}>
          <SumRow label="Subtotal" value={rupees(calc.clientSubtotal)} bold />
          {calc.contingencyAmount > 0 && <SumRow label={`Contingency (${project.quote.contingencyPct}%)`} value={rupees(calc.contingencyAmount)} />}
          {calc.discountAmount > 0 && (
            <SumRow label={`Discount${project.quote.discountType === "pct" ? ` (${project.quote.discountValue}%)` : ""}`} value={`− ${rupees(calc.discountAmount)}`} />
          )}
          <SumRow label="Taxable value" value={rupees(calc.taxable)} />
          {calc.taxLines.map((t) => (
            <SumRow key={t.label + t.base} label={`${t.label} on ${rupees(t.base)}`} value={rupees(t.amount)} muted />
          ))}
          {calc.roundOff !== 0 && <SumRow label="Round off" value={calc.roundOff.toFixed(2)} muted />}
          <View style={[s.row, { borderTopWidth: 1, borderTopColor: INK, marginTop: 4, paddingTop: 6 }]}>
            <T style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>Grand total</T>
            <T style={{ fontSize: 11, fontWeight: 600 }}>{rupees(calc.grandTotal)}</T>
          </View>
          <T style={[s.muted, { marginTop: 4 }]}>{amountInWords(calc.grandTotal)}</T>
          </View>
        </View>
        {project.quote.gstMode !== "none" && settings.gstin ? (
          <T style={[s.muted, { marginTop: 10, fontSize: 7.5 }]}>
            GSTIN {settings.gstin} · Place of supply: {project.clientState || "—"}
          </T>
        ) : null}
        <T style={[s.muted, { marginTop: 10, fontSize: 7.5 }]}>
          {designOnly
            ? "The fee covers the scope of services described in this proposal and is payable in the stages below."
            : "Final billing is on actual measured quantities at the rates quoted above. Items marked TBD will be quoted once measured or selected."}
        </T>

        {/* 6. Inclusions & exclusions */}
        <SectionHead n={++sec} title="Inclusions & exclusions" breakBefore />
        <T style={s.h2}>Included</T>
        {groupBy(pricedItems, (i) => i.category).map(([cat, items]) => (
          <View key={cat} style={[s.row, s.rule, { paddingVertical: 3.5 }]} wrap={false}>
            <T style={{ width: 120, fontWeight: 500 }}>{cat}</T>
            <T style={{ flex: 1, color: INK2 }}>{[...new Set(items.map((i) => i.item))].join(", ")}</T>
          </View>
        ))}
        {vendorItems.length > 0 && (
          <>
            <T style={[s.h2, { marginTop: 14 }]}>By the client&apos;s vendors — coordinated by us, not in this price</T>
            {groupBy(vendorItems, (i) => i.category).map(([cat, items]) => (
              <View key={cat} style={[s.row, s.rule, { paddingVertical: 3.5 }]} wrap={false}>
                <T style={{ width: 120, fontWeight: 500 }}>{cat}</T>
                <T style={{ width: 110, color: INK2 }}>{project.delegated?.[cat]?.vendor || "Client's vendor"}</T>
                <T style={{ flex: 1, color: INK2 }}>{[...new Set(items.map((i) => `${i.item} (${i.room})`))].join(", ")}</T>
              </View>
            ))}
          </>
        )}
        <T style={[s.h2, { marginTop: 14 }]}>Not included — general</T>
        {project.generalExclusions.map((x, i) => (
          <Bullet key={i}>{x}</Bullet>
        ))}
        {exclusionsByCategory.length > 0 && (
          <>
            <T style={[s.h2, { marginTop: 14 }]}>Not included — by work category</T>
            {exclusionsByCategory.map(([cat, list]) => (
              <View key={cat} style={[s.row, s.rule, { paddingVertical: 3.5 }]} wrap={false}>
                <T style={{ width: 120, fontWeight: 500 }}>{cat}</T>
                <T style={{ flex: 1, color: INK2 }}>{list.join("; ")}</T>
              </View>
            ))}
          </>
        )}
        {deps.length > 0 && (
          <>
            <T style={[s.h2, { marginTop: 14 }]}>To be provided or confirmed by the client</T>
            {deps.map((x, i) => (
              <Bullet key={i}>{x}</Bullet>
            ))}
          </>
        )}

        {/* 7. Payment schedule */}
        <SectionHead n={++sec} title="Payment schedule" breakBefore />
        <View style={[s.row, { borderBottomWidth: 0.75, borderBottomColor: INK }]}>
          <T style={[s.th, { width: 22 }]}>No.</T>
          <T style={[s.th, { flex: 1 }]}>Milestone</T>
          <T style={[s.th, s.right, { width: 50 }]}>%</T>
          <T style={[s.th, s.right, { width: 90 }]}>Amount</T>
        </View>
        {project.payment.map((m, i) => (
          <View key={m.id} style={[s.row, s.rule]}>
            <T style={[s.td, s.muted, { width: 22 }]}>{i + 1}</T>
            <T style={[s.td, { flex: 1 }]}>{m.label}</T>
            <T style={[s.td, s.right, { width: 50 }]}>{m.pct}%</T>
            <T style={[s.td, s.right, { width: 90 }]}>{rupees(milestoneAmts[i])}</T>
          </View>
        ))}
        <View style={[s.row, { paddingVertical: 5 }]}>
          <T style={{ flex: 1, fontWeight: 600, paddingLeft: 22 }}>Total</T>
          <T style={{ width: 50, textAlign: "right", fontWeight: 600 }}>{project.payment.reduce((a, m) => a + m.pct, 0)}%</T>
          <T style={{ width: 90, textAlign: "right", fontWeight: 600 }}>{rupees(milestoneAmts.reduce((a, b) => a + b, 0))}</T>
        </View>

        {/* 8. Timeline */}
        <View wrap={false} style={{ marginTop: 28 }}>
          <T style={s.sectionNo}>{String(++sec).padStart(2, "0")}</T>
          <T style={s.h1}>Project timeline</T>
          {(() => {
            let start = 0;
            return project.timeline.map((p) => {
              const from = start;
              start += Number(p.weeks) || 0;
              // Bar track is a fixed 250 pt wide; use absolute points (percentages break react-pdf layout here).
              const TRACK = 250;
              const left = totalWeeks ? (from / totalWeeks) * TRACK : 0;
              const width = totalWeeks ? Math.max(2, ((Number(p.weeks) || 0) / totalWeeks) * TRACK) : 0;
              return (
                <View key={p.id} style={[s.row, s.rule, { paddingVertical: 4, alignItems: "center" }]}>
                  <T style={{ width: 170 }}>{p.label}</T>
                  <T style={[s.muted, { width: 70 }]}>
                    {Number(p.weeks) > 0 ? `Wk ${from + 1}–${start}` : "—"}
                  </T>
                  <View style={{ width: TRACK, height: 7, flexDirection: "row" }}>
                    <View style={{ width: left, height: 7 }} />
                    {width > 0 ? <View style={{ width, height: 7, backgroundColor: ACCENT }} /> : null}
                  </View>
                </View>
              );
            });
          })()}
          <T style={[s.muted, { marginTop: 6 }]}>
            Approximately {totalWeeks} weeks from design sign-off and receipt of advance, subject to timely client approvals and site access.
          </T>
        </View>

        {/* 9. Terms */}
        <SectionHead n={++sec} title="Terms & conditions" breakBefore />
        {project.terms.map((t, i) => (
          <View key={i} style={[s.row, { marginBottom: 4 }]} wrap={false}>
            <T style={[s.muted, { width: 18 }]}>{i + 1}.</T>
            <T style={{ flex: 1 }}>{t}</T>
          </View>
        ))}

        {/* 10. Approval */}
        <View wrap={false} style={{ marginTop: 28 }}>
          <T style={s.sectionNo}>{String(++sec).padStart(2, "0")}</T>
          <T style={s.h1}>Client approval</T>
          <T style={{ color: INK2, marginBottom: 24 }}>
            I / We have read and accept this proposal {ref}, including the scope of work, bill of quantities, commercial summary of {rupees(calc.grandTotal)},
            payment schedule and terms & conditions.
          </T>
          <View style={s.row}>
            {[
              ["For the client", project.clientName],
              [`For ${settings.studioName}`, ""],
            ].map(([title, name]) => (
              <View key={title} style={{ flex: 1, marginRight: 24 }}>
                <View style={{ height: 50, borderBottomWidth: 0.75, borderBottomColor: INK }} />
                <T style={{ marginTop: 4, fontWeight: 500 }}>{title}</T>
                <T style={s.muted}>Name: {name}</T>
                <T style={s.muted}>Date:</T>
              </View>
            ))}
          </View>
        </View>
      </Shell>
    </Document>
  );
}

function ScopeBlock({ it, n }: { it: ScopeItem; n: number }) {
  const notes = [
    it.installation && `Installation: ${it.installation}`,
    it.assumptions && `Assumes: ${it.assumptions}`,
    it.dependencies && `Client to provide: ${it.dependencies}`,
  ].filter(Boolean) as string[];
  return (
    <View style={[s.rule, { paddingVertical: 4.5 }]} wrap={false}>
      <View style={s.row}>
        <T style={[s.muted, { width: 18 }]}>{n}</T>
        <View style={{ width: 165, paddingRight: 10 }}>
          <T style={{ fontWeight: 500 }}>{it.item}</T>
          {it.specification || it.brand ? <T style={[s.muted, { fontSize: 7.5 }]}>{[it.specification, it.brand].filter(Boolean).join(" · ")}</T> : null}
        </View>
        <T style={{ flex: 1, paddingRight: 8, color: INK2 }}>{it.included || "—"}</T>
        <T style={{ flex: 1, color: INK2 }}>{it.excluded || "—"}</T>
      </View>
      {notes.length > 0 && <T style={[s.muted, { fontSize: 7.2, marginLeft: 183, marginTop: 2 }]}>{notes.join("   ·   ")}</T>}
    </View>
  );
}

function SumRow({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <View style={[s.row, { paddingVertical: 3 }]}>
      <T style={[{ flex: 1 }, bold ? { fontWeight: 600 } : {}, muted ? s.muted : {}]}>{label}</T>
      <T style={[bold ? { fontWeight: 600 } : {}, muted ? s.muted : {}]}>{value}</T>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={[s.row, { marginBottom: 2 }]} wrap={false}>
      <T style={[s.muted, { width: 12 }]}>–</T>
      <T style={{ flex: 1 }}>{children}</T>
    </View>
  );
}
