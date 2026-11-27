// Core data model for StudioQuote.
// A project holds its scope items; each item carries both the scope text
// (what is included / excluded) and the BOQ numbers (qty, rates).
// Scope and pricing are two views of the same list, so they never drift apart.

export type ItemSource = "template" | "ai" | "manual" | "import" | "sample";

export interface ScopeItem {
  id: string;
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
  qty: number | null;
  unit: string;
  materialRate: number | null; // cost to studio, per unit
  labourRate: number | null; // cost to studio, per unit
  rateId?: string; // link to rate library entry
  source: ItemSource;
  missing: string[]; // information flagged as missing (by templates or AI)
  // Quantity from room measurements: when qtyAuto is true and the room has a size,
  // qty is recalculated from the designer's own measurements (never guessed).
  qtyBasis?: QtyBasis;
  qtyAuto?: boolean;
}

export type QtyBasis = "floor" | "ceiling" | "walls" | "perimeter";

/** Room measurements in feet, entered by the designer. */
export interface RoomSize {
  l: number | null;
  w: number | null;
  h: number | null;
}

export type GstMode = "none" | "cgst_sgst" | "igst";

export interface QuoteSettings {
  overheadPct: number;
  profitPct: number;
  contingencyPct: number;
  showContingency: boolean; // false = folded into client rates
  discountType: "pct" | "amount";
  discountValue: number;
  gstMode: GstMode;
  gstRatePct: number;
  categoryGst: Record<string, number>; // per-category override of GST rate
  validityDays: number;
}

export interface Milestone {
  id: string;
  label: string;
  pct: number;
}

export interface Phase {
  id: string;
  label: string;
  weeks: number;
}

export type FileKind = "drawing" | "image" | "boq" | "rates" | "other";

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  kind: FileKind;
  path: string;
  uploadedAt: string;
  extractedText?: string; // text pulled from spreadsheets, used as AI context
}

export interface VersionSnapshot {
  items: ScopeItem[];
  quote: QuoteSettings;
  payment: Milestone[];
  timeline: Phase[];
  terms: string[];
}

export interface Version {
  id: string;
  number: number;
  note: string;
  createdAt: string;
  snapshot: VersionSnapshot;
  grandTotal: number;
  profit: number;
}

export type ProjectStatus = "draft" | "sent" | "approved";

/** What the studio is being engaged for. */
export type Engagement = "turnkey" | "design_only" | "mixed";

/** In a mixed engagement: work categories executed by the client's own vendors. */
export interface Delegation {
  vendor: string; // who is doing it, optional free text
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  location: string;
  clientState: string;
  propertyType: string;
  engagement?: Engagement; // missing on older projects = turnkey
  delegated?: Record<string, Delegation>; // category → vendor (mixed engagement)
  bedrooms?: number | null;
  bathrooms?: number | null;
  balconies?: number | null;
  carpetArea: number | null;
  projectType: "residential" | "commercial";
  budget: number | null;
  description: string;
  requirements: string;
  rooms: string[];
  roomSizes?: Record<string, RoomSize>;
  files: FileMeta[];
  items: ScopeItem[];
  quote: QuoteSettings;
  payment: Milestone[];
  timeline: Phase[];
  terms: string[];
  generalExclusions: string[];
  quoteNumber: string;
  status: ProjectStatus;
  versions: Version[];
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Rate {
  id: string;
  category: string;
  name: string;
  specification: string;
  unit: string;
  materialRate: number;
  labourRate: number;
  notes: string;
  isSample: boolean;
}

export interface Settings {
  studioName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  state: string;
  logoDataUrl: string;
  quotePrefix: string;
  nextQuoteNo: number;
  defaults: {
    overheadPct: number;
    profitPct: number;
    contingencyPct: number;
    gstRatePct: number;
    validityDays: number;
  };
  payment: Milestone[];
  timeline: Phase[];
  terms: string[];
  generalExclusions: string[];
}
