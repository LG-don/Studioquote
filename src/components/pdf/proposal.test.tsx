import { renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calcQuote } from "@/lib/calc";
import { sampleProject, sampleSettings } from "@/lib/defaults";
import { ProposalDocument, registerFonts } from "./ProposalDocument";

describe("proposal PDF", () => {
  it("renders the sample project", async () => {
    registerFonts(path.resolve(__dirname, "../../../public"));
    const settings = sampleSettings();
    const project = sampleProject(settings);
    const calc = calcQuote(project.items, project.quote);
    const buf = await renderToBuffer(<ProposalDocument project={project} settings={settings} calc={calc} revision={1} issuedOn={new Date("2026-11-26")} />);
    expect(buf.length).toBeGreaterThan(10000);
    if (process.env.PDF_OUT) (await import("node:fs")).writeFileSync(process.env.PDF_OUT, buf);
  });

  it("renders a design-only proposal as a single fee", async () => {
    const settings = sampleSettings();
    const base = sampleProject(settings);
    const fee = { ...base.items[0], id: "fee1", room: "Design services", category: "Design services", item: "Interior design fee", qty: 1, unit: "lot", materialRate: 0, labourRate: 400000 };
    const project = { ...base, engagement: "design_only" as const, items: [fee] };
    const calc = calcQuote(project.items, project.quote);
    const buf = await renderToBuffer(<ProposalDocument project={project} settings={settings} calc={calc} revision={0} issuedOn={new Date()} />);
    expect(buf.length).toBeGreaterThan(5000);
  });

  it("renders an empty project without crashing", async () => {
    const settings = sampleSettings();
    const project = { ...sampleProject(settings), items: [], payment: [], timeline: [], terms: [] };
    const calc = calcQuote(project.items, project.quote);
    const buf = await renderToBuffer(<ProposalDocument project={project} settings={settings} calc={calc} revision={0} issuedOn={new Date()} />);
    expect(buf.length).toBeGreaterThan(1000);
  });
});
