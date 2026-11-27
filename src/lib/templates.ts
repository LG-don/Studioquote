// Scope templates. These are deterministic: no AI, no invented quantities.
// Each room type maps to a list of rate-library items; each item carries
// standard scope wording (included / excluded / installation / assumptions / dependencies).
// Quantities are always left blank — they must come from measurement or drawings.

import { uid } from "./ids";
import { RATE_BASIS } from "./measure";
import type { Rate, ScopeItem } from "./types";

interface ScopeText {
  included: string;
  excluded: string;
  installation: string;
  assumptions: string;
  dependencies: string;
  missing?: string[];
}

const T = (
  included: string,
  excluded: string,
  installation: string,
  assumptions = "",
  dependencies = "",
  missing: string[] = [],
): ScopeText => ({ included, excluded, installation, assumptions, dependencies, missing });

export const SCOPE_TEXT: Record<string, ScopeText> = {
  "r-site-protect": T("Protection of existing flooring, windows, doors and fittings for the duration of work", "Repair of pre-existing damage", "Laid before work begins and removed at handover"),
  "r-site-transport": T("Transport of all studio-supplied materials to site and lifting to floor", "Transport of client-purchased items", "Using society-approved lift / staircase timings", "Service lift available for material movement", "Society permission for material movement"),
  "r-site-clean": T("One round of deep cleaning of all work areas before handover", "Cleaning of areas outside the scope; post-handover cleaning", "Professional cleaning team on completion"),
  "r-site-debris": T("Collection, bagging and disposal of construction debris", "Disposal of client's old furniture or appliances", "Debris removed periodically during the project", "", "Society-approved debris disposal location and timings"),
  "r-civ-demo-floor": T("Dismantling existing tiles and bedding to slab level", "Structural repairs to slab; disposal (see debris line)", "Manual dismantling with care around services", "Existing services below flooring are intact", "", ["Confirm flooring areas to be dismantled"]),
  "r-civ-wall": T("New partition wall with plaster on both sides, ready for paint", "Structural modifications; electrical within wall (see electrical)", "Built as per approved layout drawing", "Slab can take partition load", "Society / structural consultant approval if required"),
  "r-civ-plaster": T("Making good of chases after electrical and plumbing work", "Full re-plastering of walls", "Patch repair, ready for putty"),
  "r-civ-waterproof": T("Waterproofing of bathroom floor and walls up to 300 mm, with 24 h ponding test", "Waterproofing of external walls / terrace", "Applied before tile laying", "", "Plumbing first-fix complete before waterproofing"),
  "r-fl-vitrified": T("Supply and laying of tiles with adhesive, spacers and grouting", "Floor levelling beyond 25 mm; skirting (separate line)", "Laid on prepared surface with 2 mm joints", "Tile wastage up to 8% included", "Final tile selection by client", ["Tile brand and series to be confirmed"]),
  "r-fl-marble": T("Supply, laying, grinding and diamond polishing", "Inlay / pattern work; skirting", "Laid on cement mortar bed", "Marble wastage up to 15% included", "Client to approve slab selection at yard", ["Marble variety to be confirmed"]),
  "r-fl-wood": T("Supply and installation with underlay and end profiles", "Sub-floor levelling; use in wet areas", "Floating installation on level, dry floor", "", "Floor moisture test before installation"),
  "r-fl-bath": T("Anti-skid floor tiles with slope towards drain, epoxy grout", "Shower-area stone threshold (unless listed)", "Laid after waterproofing and ponding test"),
  "r-fl-dado": T("Wall tiles up to 7 ft height with epoxy grout", "Full-height cladding; niche detailing (unless listed)", "Laid with adhesive on plastered walls"),
  "r-fl-skirting": T("Skirting matching floor finish", "Skirting behind built-in units", "Fixed with adhesive, joints matched"),
  "r-wt-wallpaper": T("Supply and application of wallpaper with primer", "Wall repair beyond minor putty", "Applied on dry, primed wall", "", "Client to approve wallpaper design", ["Wallpaper design / catalogue to be confirmed"]),
  "r-wt-veneer": T("Ply panelling with natural veneer and PU finish", "Lighting within panel (see lighting)", "Fixed on wall with framework, concealed fixing", "", "Veneer sample approval by client"),
  "r-wt-fluted": T("Fluted MDF panel, painted finish", "Lighting within panel", "Fixed on ply base"),
  "r-wt-tvback": T("Feature panel with concealed wiring channel for TV", "TV mounting bracket and TV installation", "Fixed on wall with framework", "", "TV size to be confirmed by client"),
  "r-fc-plain": T("Gypsum ceiling on GI framework, jointing, taping and finishing", "Painting (see painting); light fixtures", "Suspended from slab with anchor fasteners"),
  "r-fc-cove": T("Gypsum ceiling with cove detail for LED strip", "Painting; LED strip (see lighting)", "Suspended from slab with anchor fasteners"),
  "r-fc-grid": T("Mineral fibre tiles on exposed grid", "Light fixtures; AC grilles", "Suspended from slab"),
  "r-el-newpoint": T("Wiring from DB in conduit, with switch box", "Switches and plates (separate line); light fixtures", "Concealed in wall / ceiling", "Existing DB has spare capacity", "", ["Electrical layout to be approved"]),
  "r-el-shift": T("Shifting of existing point with new wiring", "Chasing repairs (see civil)", "Concealed"),
  "r-el-switch": T("Supply and fixing of modular switches, sockets and plates", "Smart / automation devices", "Fixed after painting", "", "", ["Switch brand and range to be confirmed"]),
  "r-el-db": T("New DB with MCBs and RCCB, labelled circuits", "Main meter and incoming supply", "Wall-mounted at existing DB location", "", "Electricity board permissions if load increase is needed"),
  "r-pl-bath": T("Concealed CPVC supply and UPVC drainage for one bathroom", "CP fittings and sanitaryware supply", "Concealed in wall, pressure-tested", "", "Sanitaryware selection before first-fix"),
  "r-pl-cp": T("Installation of CP fittings and sanitaryware", "Supply of fittings (by client unless listed)", "After tiling and painting", "", "Fittings delivered to site by client before installation date"),
  "r-pl-sink": T("Inlet, outlet and RO point for sink", "Sink, tap and RO unit supply", "Concealed where possible"),
  "r-mk-base": T("Base cabinets with shutters, skirting and edge banding", "Countertop, sink, hob and appliances", "Fixed on legs with plinth", "Standard 850 mm counter height", "Appliance list and sizes from client", ["Shutter finish to be confirmed"]),
  "r-mk-wall": T("Wall cabinets with shutters and under-cabinet profile", "Chimney and its ducting", "Wall-mounted with hanging rails", "", "Chimney model and size from client"),
  "r-mk-tall": T("Tall unit with shelves / appliance housing", "Built-in appliances", "Floor-standing, fixed to wall", "", "Appliance dimensions from client"),
  "r-mk-counter": T("Quartz countertop with sink and hob cut-outs and front edge profile", "Sink and hob supply; backsplash", "Installed on base cabinets, sink under-mount / over-mount as per drawing", "", "Sink and hob model before template measurement", ["Countertop colour / series to be confirmed"]),
  "r-mk-hardware": T("Hinges, drawer channels, baskets and corner solution", "Appliances", "Fixed with cabinets", "", "", ["Hardware brand to be confirmed"]),
  "r-mk-backsplash": T("Backsplash tiles between counter and wall cabinets", "Electrical points (see electrical)", "Laid after counter installation", "", "Client to select tile"),
  "r-wd-sliding": T("Wardrobe carcass with sliding shutters and profile handles", "Internals (separate line); mirror unless listed", "Fixed to wall, floor-to-ceiling", "", "", ["Laminate / shutter finish to be confirmed"]),
  "r-wd-hinged": T("Wardrobe carcass with hinged shutters and handles", "Internals (separate line)", "Fixed to wall", "", "", ["Laminate / shutter finish to be confirmed"]),
  "r-wd-loft": T("Loft above wardrobe with shutters", "Internal lighting", "Fixed above wardrobe"),
  "r-wd-internals": T("Drawers, hanging rods, soft-close hinges", "Wardrobe lighting", "Fixed inside carcass", "", "", ["Hardware brand to be confirmed"]),
  "r-cf-bed": T("Bed with hydraulic storage and headboard frame", "Mattress; upholstery (see upholstery)", "Assembled on site", "", "Mattress size from client"),
  "r-cf-tv": T("Wall-hung TV unit with drawers", "TV and TV mounting", "Wall-mounted with concealed brackets"),
  "r-cf-crockery": T("Crockery unit with glass shutters and profile lighting", "Crockery and décor", "Floor-standing, fixed to wall"),
  "r-cf-study": T("Study table with drawer and overhead shelf", "Chair; computer equipment", "Wall-mounted"),
  "r-cf-shoe": T("Shoe cabinet with seating top", "Decorative mirror unless listed", "Floor-standing, fixed to wall"),
  "r-cf-vanity": T("Vanity unit with shutters / drawers", "Wash basin, tap and mirror", "Wall-hung, water-resistant board", "", "Basin model from client"),
  "r-cf-pooja": T("Pooja unit with CNC jaali shutters and storage", "Idols and décor; brass bells", "Floor-standing / wall-mounted as per design", "", "Client to confirm orientation as per vastu, if required"),
  "r-cf-workstation": T("Workstation with pedestal and screen", "Chairs; IT cabling", "Assembled on site"),
  "r-cf-reception": T("Reception desk with solid surface top", "Logo signage", "Built on site"),
  "r-up-bedback": T("Upholstered bed back panel", "Mattress and bed linen", "Wall-mounted on cleat", "", "Fabric selection by client", ["Fabric to be confirmed"]),
  "r-up-cushion": T("Foam cushion with fabric cover", "Bolsters and throws", "Loose", "", "Fabric selection by client", ["Fabric to be confirmed"]),
  "r-pt-emulsion": T("Putty, primer and 2 coats of premium emulsion on walls", "Texture / feature finishes (separate line); exterior painting", "After carpentry and before final fixtures", "Walls in reasonable condition", "Shade selection by client", ["Paint brand and shades to be confirmed"]),
  "r-pt-ceiling": T("Primer and 2 coats of ceiling white", "Exterior / balcony ceiling unless listed", "After false ceiling finishing"),
  "r-pt-texture": T("Designer texture finish on feature walls", "Base wall repair", "Applied by specialist applicator", "", "Shade and texture approval by client"),
  "r-pt-pu": T("PU polish on veneer surfaces", "Polish on client's existing furniture", "Applied in dust-free conditions"),
  "r-lt-cob": T("Supply and installation of COB downlights", "Decorative lights; smart controls", "Recessed in false ceiling", "", "", ["Light fixture brand to be confirmed"]),
  "r-lt-profile": T("LED profile with diffuser, strip and driver", "Smart / dimmable controls unless listed", "Recessed / surface-mounted as per detail"),
  "r-lt-pendant": T("Allowance per pendant, installation included", "Cost above allowance (charged at actuals)", "Hung from ceiling point", "Allowance amount per fixture", "Client to select fixtures within allowance"),
  "r-sf-curtain": T("Curtains with ceiling-mounted track and stitching", "Motorisation", "Ceiling-mounted track", "", "Fabric selection by client", ["Curtain fabric to be confirmed"]),
  "r-sf-blind": T("Fabric roller blinds, manual operation", "Motorisation", "Mounted inside / outside window recess"),
};

// Room-type templates. Matching is by keyword in the room name.
const ROOM_TEMPLATES: { match: RegExp; rates: string[] }[] = [
  { match: /kitchen|pantry/i, rates: ["r-mk-base", "r-mk-wall", "r-mk-tall", "r-mk-counter", "r-mk-hardware", "r-mk-backsplash", "r-pl-sink", "r-el-newpoint", "r-fc-plain", "r-lt-cob", "r-pt-ceiling"] },
  { match: /bath|toilet|washroom|powder/i, rates: ["r-civ-demo-floor", "r-civ-waterproof", "r-fl-bath", "r-fl-dado", "r-pl-bath", "r-pl-cp", "r-cf-vanity", "r-fc-grid", "r-lt-cob"] },
  { match: /master/i, rates: ["r-wd-sliding", "r-wd-loft", "r-wd-internals", "r-cf-bed", "r-up-bedback", "r-wt-wallpaper", "r-fc-cove", "r-lt-cob", "r-lt-profile", "r-el-newpoint", "r-el-switch", "r-pt-emulsion", "r-pt-ceiling", "r-sf-curtain"] },
  { match: /kid/i, rates: ["r-wd-hinged", "r-wd-loft", "r-wd-internals", "r-cf-bed", "r-cf-study", "r-fc-plain", "r-lt-cob", "r-el-newpoint", "r-el-switch", "r-pt-emulsion", "r-pt-ceiling", "r-sf-blind"] },
  { match: /bed|guest/i, rates: ["r-wd-hinged", "r-wd-loft", "r-wd-internals", "r-cf-bed", "r-fc-plain", "r-lt-cob", "r-el-newpoint", "r-el-switch", "r-pt-emulsion", "r-pt-ceiling", "r-sf-curtain"] },
  { match: /living|lounge|family/i, rates: ["r-fl-vitrified", "r-fl-skirting", "r-cf-tv", "r-wt-tvback", "r-fc-cove", "r-lt-cob", "r-lt-profile", "r-lt-pendant", "r-el-newpoint", "r-el-switch", "r-pt-emulsion", "r-pt-ceiling", "r-sf-curtain"] },
  { match: /dining/i, rates: ["r-cf-crockery", "r-lt-pendant", "r-fc-plain", "r-lt-cob", "r-pt-emulsion", "r-pt-texture"] },
  { match: /foyer|entrance|entry/i, rates: ["r-cf-shoe", "r-wt-fluted", "r-fc-plain", "r-lt-cob", "r-pt-emulsion"] },
  { match: /pooja|mandir/i, rates: ["r-cf-pooja", "r-lt-profile", "r-pt-emulsion"] },
  { match: /study/i, rates: ["r-cf-study", "r-wd-hinged", "r-fc-plain", "r-lt-cob", "r-el-newpoint", "r-pt-emulsion", "r-sf-blind"] },
  { match: /balcony|terrace|deck/i, rates: ["r-fl-wood", "r-lt-cob", "r-up-cushion"] },
  { match: /reception/i, rates: ["r-cf-reception", "r-wt-fluted", "r-fc-cove", "r-lt-cob", "r-lt-profile", "r-pt-emulsion", "r-fl-vitrified"] },
  { match: /workstation|open office|work area/i, rates: ["r-cf-workstation", "r-fc-grid", "r-lt-cob", "r-el-newpoint", "r-pt-emulsion", "r-fl-vitrified"] },
  { match: /cabin|conference|meeting|board/i, rates: ["r-civ-wall", "r-wt-veneer", "r-fc-cove", "r-lt-cob", "r-el-newpoint", "r-el-switch", "r-pt-emulsion", "r-sf-blind"] },
];

const GENERAL_RATES = ["r-site-protect", "r-site-debris", "r-site-transport", "r-el-db", "r-civ-plaster", "r-site-clean"];

export const GENERAL_ROOM = "General / site";

export function templateRatesForRoom(room: string): string[] {
  const t = ROOM_TEMPLATES.find((t) => t.match.test(room));
  return t ? t.rates : ["r-pt-emulsion", "r-pt-ceiling", "r-lt-cob", "r-el-newpoint"];
}

export function itemFromRate(rate: Rate | undefined, rateId: string, room: string, source: ScopeItem["source"]): ScopeItem {
  const text = SCOPE_TEXT[rateId];
  return {
    id: uid("it"),
    room,
    category: rate?.category ?? "Site & general",
    item: rate?.name ?? rateId,
    specification: rate?.specification ?? "",
    brand: "",
    included: text?.included ?? "",
    excluded: text?.excluded ?? "",
    installation: text?.installation ?? "",
    assumptions: text?.assumptions ?? "",
    dependencies: text?.dependencies ?? "",
    qty: null, // never invented — must be measured
    unit: rate?.unit ?? "nos",
    materialRate: rate ? rate.materialRate : null,
    labourRate: rate ? rate.labourRate : null,
    rateId: rate ? rate.id : undefined,
    source,
    missing: [...(text?.missing ?? [])],
    // Linked to room measurements when the item is measured by area or perimeter.
    qtyBasis: RATE_BASIS[rateId],
    qtyAuto: RATE_BASIS[rateId] ? true : undefined,
  };
}

/** Builds a draft scope for the given rooms using the studio's rate library. */
export function generateFromTemplates(rooms: string[], rates: Rate[], includeGeneral = true): ScopeItem[] {
  const byId = new Map(rates.map((r) => [r.id, r]));
  const items: ScopeItem[] = [];
  for (const room of rooms) {
    for (const rid of templateRatesForRoom(room)) {
      items.push(itemFromRate(byId.get(rid), rid, room, "template"));
    }
  }
  if (includeGeneral) {
    for (const rid of GENERAL_RATES) items.push(itemFromRate(byId.get(rid), rid, GENERAL_ROOM, "template"));
  }
  return items;
}
