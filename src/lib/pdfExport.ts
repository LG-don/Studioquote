"use client";

import { createElement } from "react";
import type { QuoteCalc } from "./calc";
import type { Project, Settings } from "./types";

/** Renders the proposal to a PDF Blob in the browser. Loaded lazily to keep pages light. */
export async function renderProposalPdf(args: { project: Project; settings: Settings; calc: QuoteCalc; revision: number; issuedOn?: Date }): Promise<Blob> {
  const [{ pdf }, { ProposalDocument, registerFonts }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/pdf/ProposalDocument"),
  ]);
  registerFonts(window.location.origin);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = createElement(ProposalDocument, { ...args, issuedOn: args.issuedOn ?? new Date() }) as any;
  return pdf(doc).toBlob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
