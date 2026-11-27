// SAMPLE rate library. These are synthetic, indicative figures for demonstration only —
// they are NOT market rates. Every studio should replace them with its own vendor rates.
// Rates are the studio's cost (material + labour), before overheads and profit.

import type { Rate } from "./types";

type R = [id: string, category: string, name: string, spec: string, unit: string, material: number, labour: number];

const rows: R[] = [
  // Design services — the studio's own fees (entered as the fee; never marked up)
  ["r-ds-full", "Design services", "Interior design fee", "Concept, layouts, 3D views, working drawings and material selection", "sq.ft", 0, 150],
  ["r-ds-3d", "Design services", "Additional 3D view", "Rendered 3D view beyond those included in the design fee", "nos", 0, 2500],
  ["r-ds-visit", "Design services", "Site visit", "Site visit for measurement, review or snagging", "nos", 0, 2000],
  ["r-ds-coord", "Design services", "Vendor coordination & supervision", "Coordinating and checking work done by the client's own vendors", "lot", 0, 40000],
  // Site & general
  ["r-site-protect", "Site & general", "Site protection & masking", "Floor protection sheets, masking of windows, doors and fittings", "lot", 8000, 6000],
  ["r-site-transport", "Site & general", "Transportation & material handling", "Transport of materials to site and lifting to floor", "lot", 0, 18000],
  ["r-site-clean", "Site & general", "Final deep cleaning", "Post-completion cleaning of all areas", "lot", 0, 9000],
  ["r-site-debris", "Civil and demolition", "Debris removal", "Collection and disposal of debris to municipal-approved location", "lot", 0, 12000],
  // Civil
  ["r-civ-demo-floor", "Civil and demolition", "Dismantling existing flooring", "Removal of existing tiles and bedding", "sq.ft", 0, 25],
  ["r-civ-wall", "Civil and demolition", "New partition wall", "115 mm AAC block wall with plaster both sides", "sq.ft", 95, 55],
  ["r-civ-plaster", "Civil and demolition", "Plaster patch repair", "Cement plaster repair after electrical / plumbing chasing", "sq.ft", 18, 22],
  ["r-civ-waterproof", "Civil and demolition", "Bathroom waterproofing", "Polymer-modified cementitious coating, 2 coats, 300 mm up walls", "sq.ft", 45, 30],
  // Flooring
  ["r-fl-vitrified", "Flooring", "Vitrified tile flooring", "600 × 1200 mm GVT tiles, matt finish, with tile adhesive", "sq.ft", 110, 35],
  ["r-fl-marble", "Flooring", "Italian marble flooring", "18 mm Italian marble, laying, grinding and polishing", "sq.ft", 450, 120],
  ["r-fl-wood", "Flooring", "Engineered wood flooring", "14 mm engineered oak, click-lock, with underlay", "sq.ft", 280, 40],
  ["r-fl-bath", "Flooring", "Bathroom anti-skid flooring", "300 × 600 mm anti-skid ceramic tiles with epoxy grout", "sq.ft", 75, 35],
  ["r-fl-dado", "Flooring", "Bathroom wall tiles (dado)", "300 × 600 mm ceramic wall tiles up to 7 ft", "sq.ft", 80, 38],
  ["r-fl-skirting", "Flooring", "Skirting", "100 mm skirting matching flooring", "r.ft", 35, 15],
  // Wall treatments
  ["r-wt-wallpaper", "Wall treatments", "Wallpaper", "Imported vinyl wallpaper with primer", "sq.ft", 70, 15],
  ["r-wt-veneer", "Wall treatments", "Veneer wall panelling", "12 mm ply with natural veneer, PU finish", "sq.ft", 420, 120],
  ["r-wt-fluted", "Wall treatments", "Fluted wall panel", "MDF fluted panel, painted finish", "sq.ft", 380, 110],
  ["r-wt-tvback", "Wall treatments", "TV wall feature panel", "Ply base with laminate / veneer and concealed wiring channel", "sq.ft", 450, 130],
  // False ceiling
  ["r-fc-plain", "False ceiling", "Gypsum false ceiling — plain", "12.5 mm gypsum board on GI framework, jointing and finishing", "sq.ft", 70, 35],
  ["r-fc-cove", "False ceiling", "Gypsum false ceiling — with cove", "Gypsum ceiling with perimeter cove for LED strip", "sq.ft", 95, 45],
  ["r-fc-grid", "False ceiling", "Grid ceiling", "600 × 600 mm mineral fibre tiles on exposed grid", "sq.ft", 85, 25],
  // Electrical
  ["r-el-newpoint", "Electrical", "New electrical point", "FR copper wiring in PVC conduit from DB, up to 10 m", "pts", 650, 350],
  ["r-el-shift", "Electrical", "Shifting of electrical point", "Relocation of existing point including chasing", "pts", 250, 300],
  ["r-el-switch", "Electrical", "Modular switches & plates", "Modular switches, sockets and cover plates", "nos", 450, 50],
  ["r-el-db", "Electrical", "Distribution board with MCBs", "8-way DB with MCBs and RCCB", "nos", 9500, 2000],
  // Plumbing
  ["r-pl-bath", "Plumbing", "Bathroom concealed plumbing", "CPVC supply and UPVC drainage for one bathroom", "set", 18000, 9000],
  ["r-pl-cp", "Plumbing", "CP & sanitary fitting installation", "Installation of client- or studio-supplied fittings", "nos", 0, 450],
  ["r-pl-sink", "Plumbing", "Kitchen sink plumbing", "Inlet, outlet and RO point for kitchen sink", "nos", 2500, 1500],
  // Modular kitchen
  ["r-mk-base", "Modular kitchen", "Kitchen base cabinets", "BWP ply carcass, laminate shutters, edge-banded", "r.ft", 5200, 1300],
  ["r-mk-wall", "Modular kitchen", "Kitchen wall cabinets", "BWP ply carcass, laminate / acrylic shutters", "r.ft", 3800, 1000],
  ["r-mk-tall", "Modular kitchen", "Kitchen tall unit", "Tall pantry / appliance unit, 7 ft", "nos", 38000, 6000],
  ["r-mk-counter", "Modular kitchen", "Quartz countertop", "20 mm quartz with front edge profiling", "r.ft", 3200, 600],
  ["r-mk-hardware", "Modular kitchen", "Kitchen hardware & accessories", "Soft-close hinges, tandem drawers, baskets, corner unit", "set", 45000, 0],
  ["r-mk-backsplash", "Modular kitchen", "Kitchen backsplash", "Designer ceramic tiles between counter and wall units", "sq.ft", 180, 50],
  // Wardrobes
  ["r-wd-sliding", "Wardrobes", "Sliding wardrobe", "BWR ply carcass, laminate sliding shutters, 7 ft", "sq.ft", 1350, 300],
  ["r-wd-hinged", "Wardrobes", "Hinged wardrobe", "BWR ply carcass, laminate hinged shutters, 7 ft", "sq.ft", 1150, 280],
  ["r-wd-loft", "Wardrobes", "Loft above wardrobe", "BWR ply loft with laminate shutters", "sq.ft", 750, 180],
  ["r-wd-internals", "Wardrobes", "Wardrobe internals", "Drawers, hanging rods, trouser pull-out, soft-close hinges", "set", 12000, 0],
  // Custom furniture
  ["r-cf-bed", "Custom furniture", "Bed with hydraulic storage", "Queen / king bed, ply with laminate, hydraulic lift", "nos", 52000, 8000],
  ["r-cf-tv", "Custom furniture", "TV unit", "Wall-hung TV unit with drawers, laminate finish", "r.ft", 4200, 900],
  ["r-cf-crockery", "Custom furniture", "Crockery unit", "Crockery unit with glass shutters and profile lighting", "sq.ft", 1400, 300],
  ["r-cf-study", "Custom furniture", "Study table", "Wall-mounted study table with drawer and overhead shelf", "r.ft", 3200, 700],
  ["r-cf-shoe", "Custom furniture", "Shoe rack & foyer console", "Shoe cabinet with seating top and mirror", "r.ft", 3000, 600],
  ["r-cf-vanity", "Custom furniture", "Bathroom vanity", "WPC / BWP ply vanity with laminate finish", "r.ft", 4500, 800],
  ["r-cf-pooja", "Custom furniture", "Pooja unit", "Pooja unit with CNC jaali shutters and storage", "nos", 35000, 6000],
  ["r-cf-workstation", "Custom furniture", "Workstation", "Linear workstation with pedestal and screen", "nos", 18000, 2500],
  ["r-cf-reception", "Custom furniture", "Reception desk", "Reception desk with solid surface top", "r.ft", 9500, 1500],
  // Upholstery
  ["r-up-bedback", "Upholstery", "Upholstered bed back panel", "Fabric-upholstered panel with foam", "sq.ft", 650, 200],
  ["r-up-cushion", "Upholstery", "Window seat cushion", "High-density foam cushion with fabric cover", "nos", 6500, 800],
  // Painting
  ["r-pt-emulsion", "Painting and polishing", "Wall painting — emulsion", "2 coats putty, 1 coat primer, 2 coats premium emulsion", "sq.ft", 18, 14],
  ["r-pt-ceiling", "Painting and polishing", "Ceiling painting", "1 coat primer, 2 coats ceiling white", "sq.ft", 12, 10],
  ["r-pt-texture", "Painting and polishing", "Texture paint", "Designer texture finish on feature wall", "sq.ft", 55, 35],
  ["r-pt-pu", "Painting and polishing", "PU polish", "PU polish on veneer surfaces", "sq.ft", 180, 90],
  // Lighting
  ["r-lt-cob", "Lighting", "COB downlight", "7 W COB downlight, 3000 K, recessed", "nos", 850, 150],
  ["r-lt-profile", "Lighting", "LED profile strip", "Aluminium profile with diffuser and LED strip, driver", "r.ft", 420, 80],
  ["r-lt-pendant", "Lighting", "Decorative pendant (allowance)", "Allowance per pendant; final selection by client", "nos", 12000, 500],
  // Soft furnishings
  ["r-sf-curtain", "Soft furnishings", "Curtains with track", "Blackout / sheer curtains with ceiling-mounted track", "sq.ft", 220, 40],
  ["r-sf-blind", "Soft furnishings", "Roller blinds", "Fabric roller blinds, manual", "sq.ft", 180, 30],
];

export const SAMPLE_RATES: Rate[] = rows.map(([id, category, name, specification, unit, materialRate, labourRate]) => ({
  id,
  category,
  name,
  specification,
  unit,
  materialRate,
  labourRate,
  notes: "Sample rate — replace with your vendor rate",
  isSample: true,
}));
