import { uid } from "./ids";
import { SAMPLE_RATES } from "./sampleRates";
import { generateFromTemplates, GENERAL_ROOM } from "./templates";
import type { Project, QuoteSettings, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  studioName: "Your Studio Name",
  tagline: "Interior Architecture & Design",
  address: "",
  phone: "",
  email: "",
  website: "",
  gstin: "",
  state: "Maharashtra",
  logoDataUrl: "",
  quotePrefix: "SQ",
  nextQuoteNo: 1,
  defaults: { overheadPct: 10, profitPct: 15, contingencyPct: 5, gstRatePct: 18, validityDays: 15 },
  payment: [
    { id: "m1", label: "Booking advance on signing", pct: 10 },
    { id: "m2", label: "On design sign-off and material ordering", pct: 40 },
    { id: "m3", label: "On completion of civil work and carpentry carcass", pct: 30 },
    { id: "m4", label: "Before painting and finishing", pct: 15 },
    { id: "m5", label: "On handover", pct: 5 },
  ],
  timeline: [
    { id: "t1", label: "Design development & approvals", weeks: 2 },
    { id: "t2", label: "Material ordering & site preparation", weeks: 1 },
    { id: "t3", label: "Civil, electrical & plumbing", weeks: 2 },
    { id: "t4", label: "False ceiling & carpentry", weeks: 4 },
    { id: "t5", label: "Painting & finishing", weeks: 2 },
    { id: "t6", label: "Installation, snagging & handover", weeks: 1 },
  ],
  terms: [
    "This quotation is valid for the number of days stated on the cover page. Rates may be revised after this period.",
    "Quantities are based on measurements and drawings at the time of quotation. Final billing will be on actual measured quantities at the quoted rates.",
    "Any work not explicitly listed in the scope of work will be treated as additional work and quoted separately before execution.",
    "Changes requested after design sign-off may affect cost and timeline and will be confirmed in writing as a variation.",
    "Material selections (finishes, colours, brands) must be confirmed by the client before ordering. Delays in selection may extend the timeline.",
    "The client will arrange society permissions, working-hour approvals, lift access, water and electricity at site.",
    "Natural materials (wood veneer, stone) may vary in colour and grain from samples.",
    "Payments are due within 3 working days of each milestone. Work may pause if payments are delayed.",
    "Carpentry carries a 1-year warranty against manufacturing defects. Hardware and appliances carry the manufacturer's warranty.",
    "Timelines exclude delays due to force majeure, society restrictions or client-side dependencies.",
  ],
  generalExclusions: [
    "Loose furniture, appliances, décor and artwork unless listed",
    "Structural changes and any work requiring structural consultant approval",
    "Society deposits, permissions and fees",
    "Modifications to external façade, windows or grills unless listed",
    "Air-conditioning supply and installation (provisions only, if listed)",
    "Home automation, CCTV and networking unless listed",
  ],
};

export function quoteFromSettings(s: Settings, sameState: boolean): QuoteSettings {
  return {
    overheadPct: s.defaults.overheadPct,
    profitPct: s.defaults.profitPct,
    contingencyPct: s.defaults.contingencyPct,
    showContingency: false,
    discountType: "pct",
    discountValue: 0,
    gstMode: s.gstin ? (sameState ? "cgst_sgst" : "igst") : "none",
    gstRatePct: s.defaults.gstRatePct,
    categoryGst: {},
    validityDays: s.defaults.validityDays,
  };
}

export function quoteNumber(s: Settings): string {
  const y = new Date().getFullYear().toString().slice(2);
  return `${s.quotePrefix}-${y}-${String(s.nextQuoteNo).padStart(3, "0")}`;
}

export function newProject(s: Settings, partial: Partial<Project>): Project {
  const now = new Date().toISOString();
  const clientState = partial.clientState || s.state;
  return {
    id: uid("prj"),
    name: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    location: "",
    clientState,
    propertyType: "Apartment",
    engagement: "turnkey",
    delegated: {},
    bedrooms: null,
    bathrooms: null,
    balconies: null,
    carpetArea: null,
    projectType: "residential",
    budget: null,
    description: "",
    requirements: "",
    rooms: [],
    files: [],
    items: [],
    quote: quoteFromSettings(s, clientState === s.state),
    payment: s.payment.map((m) => ({ ...m, id: uid("m") })),
    timeline: s.timeline.map((t) => ({ ...t, id: uid("t") })),
    terms: [...s.terms],
    generalExclusions: [...s.generalExclusions],
    quoteNumber: quoteNumber(s),
    status: "draft",
    versions: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

// Synthetic quantities for the sample project (room, rateId) → qty.
const SAMPLE_QTY: Record<string, number> = {
  "Living|r-fl-vitrified": 320, "Living|r-fl-skirting": 72, "Living|r-cf-tv": 9, "Living|r-wt-tvback": 80,
  "Living|r-fc-cove": 290, "Living|r-lt-cob": 12, "Living|r-lt-profile": 64, "Living|r-lt-pendant": 1,
  "Living|r-el-newpoint": 6, "Living|r-el-switch": 10, "Living|r-pt-emulsion": 820, "Living|r-pt-ceiling": 290, "Living|r-sf-curtain": 96,
  "Dining|r-cf-crockery": 42, "Dining|r-lt-pendant": 2, "Dining|r-fc-plain": 120, "Dining|r-lt-cob": 4,
  "Dining|r-pt-emulsion": 360, "Dining|r-pt-texture": 80,
  "Kitchen|r-mk-base": 14, "Kitchen|r-mk-wall": 10, "Kitchen|r-mk-tall": 1, "Kitchen|r-mk-counter": 14,
  "Kitchen|r-mk-hardware": 1, "Kitchen|r-mk-backsplash": 28, "Kitchen|r-pl-sink": 1, "Kitchen|r-el-newpoint": 5,
  "Kitchen|r-fc-plain": 95, "Kitchen|r-lt-cob": 6, "Kitchen|r-pt-ceiling": 95,
  "Master Bedroom|r-wd-sliding": 56, "Master Bedroom|r-wd-loft": 16, "Master Bedroom|r-wd-internals": 1,
  "Master Bedroom|r-cf-bed": 1, "Master Bedroom|r-up-bedback": 40, "Master Bedroom|r-wt-wallpaper": 110,
  "Master Bedroom|r-fc-cove": 190, "Master Bedroom|r-lt-cob": 8, "Master Bedroom|r-lt-profile": 52,
  "Master Bedroom|r-el-newpoint": 4, "Master Bedroom|r-el-switch": 8, "Master Bedroom|r-pt-emulsion": 560,
  "Master Bedroom|r-pt-ceiling": 190, "Master Bedroom|r-sf-curtain": 84,
  "Kids Bedroom|r-wd-hinged": 42, "Kids Bedroom|r-wd-loft": 12, "Kids Bedroom|r-wd-internals": 1, "Kids Bedroom|r-cf-bed": 1,
  "Kids Bedroom|r-cf-study": 5, "Kids Bedroom|r-fc-plain": 130, "Kids Bedroom|r-lt-cob": 6, "Kids Bedroom|r-el-newpoint": 3,
  "Kids Bedroom|r-el-switch": 6, "Kids Bedroom|r-pt-emulsion": 450, "Kids Bedroom|r-pt-ceiling": 130, "Kids Bedroom|r-sf-blind": 36,
  "Bathroom 1|r-civ-demo-floor": 45, "Bathroom 1|r-civ-waterproof": 85, "Bathroom 1|r-fl-bath": 45, "Bathroom 1|r-fl-dado": 210,
  "Bathroom 1|r-pl-bath": 1, "Bathroom 1|r-pl-cp": 6, "Bathroom 1|r-cf-vanity": 4, "Bathroom 1|r-fc-grid": 45, "Bathroom 1|r-lt-cob": 3,
  "Foyer|r-cf-shoe": 5, "Foyer|r-wt-fluted": 36, "Foyer|r-fc-plain": 40, "Foyer|r-lt-cob": 3, "Foyer|r-pt-emulsion": 140,
  [`${GENERAL_ROOM}|r-site-protect`]: 1, [`${GENERAL_ROOM}|r-site-debris`]: 1, [`${GENERAL_ROOM}|r-site-transport`]: 1,
  [`${GENERAL_ROOM}|r-el-db`]: 1, [`${GENERAL_ROOM}|r-civ-plaster`]: 120, [`${GENERAL_ROOM}|r-site-clean`]: 1,
};

const SAMPLE_BRANDS: Record<string, string> = {
  "r-fl-vitrified": "Kajaria Eternity GVT, Satuario Matt",
  "r-wd-internals": "Hettich",
  "r-el-switch": "Legrand Myrius",
  "r-lt-cob": "Philips",
  "r-pt-emulsion": "Asian Paints Royale",
  "r-mk-counter": "Caesarstone 2141",
  "r-wt-wallpaper": "Marshalls — catalogue ref. to be shared",
};

export function sampleSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    studioName: "Atelier Sample Studio",
    address: "2nd floor, Sample Arcade, Baner Road, Pune 411045",
    phone: "+91 98XXX XXXXX",
    email: "hello@ateliersample.in",
    website: "ateliersample.in",
    gstin: "27ABCDE1234F1Z5",
    state: "Maharashtra",
  };
}

/** A synthetic 3BHK project used for the demo. All names and numbers are made up. */
export function sampleProject(s: Settings): Project {
  const rooms = ["Foyer", "Living", "Dining", "Kitchen", "Master Bedroom", "Kids Bedroom", "Bathroom 1"];
  const items = generateFromTemplates(rooms, SAMPLE_RATES).map((it) => {
    const qty = SAMPLE_QTY[`${it.room}|${it.rateId}`];
    const brand = it.rateId ? SAMPLE_BRANDS[it.rateId] : undefined;
    const resolved = brand ? it.missing.filter((m) => !/brand|series|shades|design|colour/i.test(m)) : it.missing;
    return { ...it, qty: qty ?? null, qtyAuto: false, brand: brand ?? "", missing: resolved, source: "sample" as const };
  });
  return newProject(s, {
    name: "Mehta Residence",
    clientName: "Ananya & Rohan Mehta (sample)",
    clientPhone: "+91 90000 00000",
    clientEmail: "client@example.com",
    clientAddress: "Flat 1203, Sample Heights, Baner, Pune",
    location: "Baner, Pune",
    clientState: "Maharashtra",
    propertyType: "Apartment",
    engagement: "turnkey",
    bedrooms: 3,
    bathrooms: 3,
    balconies: 1,
    carpetArea: 1450,
    projectType: "residential",
    budget: 2800000,
    description:
      "Complete interiors for a new 3BHK apartment for a young family of four. Warm, minimal look with natural wood tones and soft lighting.",
    requirements:
      "Modular kitchen with tall unit and quartz counter. Sliding wardrobe in master bedroom. Study desk in kids' room. Feature TV wall in living. Keep existing flooring in bedrooms. Bathroom 1 to be fully redone; other bathrooms untouched.",
    rooms: [...rooms, GENERAL_ROOM],
    items,
    isSample: true,
  });
}
