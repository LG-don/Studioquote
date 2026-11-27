/** Design services are the studio's own fees: priced as entered, never marked up. */
export const FEE_CATEGORY = "Design services";

export const CATEGORIES = [
  "Design services",
  "Site & general",
  "Civil and demolition",
  "Flooring",
  "Wall treatments",
  "False ceiling",
  "Electrical",
  "Plumbing",
  "Modular kitchen",
  "Wardrobes",
  "Custom furniture",
  "Upholstery",
  "Painting and polishing",
  "Lighting",
  "Soft furnishings",
] as const;

export const UNITS = ["sq.ft", "r.ft", "nos", "set", "pts", "lot", "sq.m", "r.m", "ls"];

export const PROPERTY_TYPES = [
  "Apartment",
  "Villa / independent house",
  "Office",
  "Retail / showroom",
  "Café / restaurant",
  "Other",
];

export const ROOM_PRESETS: Record<string, string[]> = {
  "1 BHK apartment": ["Foyer", "Living", "Kitchen", "Master Bedroom", "Bathroom 1", "Balcony"],
  "2 BHK apartment": ["Foyer", "Living", "Dining", "Kitchen", "Master Bedroom", "Bedroom 2", "Bathroom 1", "Bathroom 2", "Balcony"],
  "3 BHK apartment": [
    "Foyer", "Living", "Dining", "Kitchen", "Master Bedroom", "Bedroom 2", "Kids Bedroom",
    "Bathroom 1", "Bathroom 2", "Bathroom 3", "Pooja", "Balcony",
  ],
  "4 BHK apartment": [
    "Foyer", "Living", "Dining", "Kitchen", "Master Bedroom", "Bedroom 2", "Bedroom 3", "Kids Bedroom",
    "Study", "Bathroom 1", "Bathroom 2", "Bathroom 3", "Bathroom 4", "Pooja", "Balcony",
  ],
  "Villa / independent house": [
    "Foyer", "Living", "Family Lounge", "Dining", "Kitchen", "Master Bedroom", "Bedroom 2", "Bedroom 3",
    "Study", "Bathroom 1", "Bathroom 2", "Bathroom 3", "Pooja", "Balcony",
  ],
  Office: ["Reception", "Workstations", "Manager Cabin", "Conference Room", "Pantry", "Washroom"],
  "Retail / showroom": ["Shopfront", "Display Area", "Billing Counter", "Storage", "Trial Room"],
  "Café / restaurant": ["Entrance", "Seating Area", "Service Counter", "Kitchen", "Washroom"],
  Other: ["Living"],
};

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

/** Hardware-heavy categories where a brand should be named. */
export const BRAND_SENSITIVE = ["Modular kitchen", "Wardrobes", "Custom furniture", "Electrical", "Plumbing", "Lighting"];

export const RESIDENTIAL_TYPES = ["Apartment", "Villa / independent house"];
export const isResidentialType = (t: string) => RESIDENTIAL_TYPES.includes(t) || /bhk|apartment|villa|house/i.test(t);

/** Work categories a client can hand to their own vendors in a mixed engagement. */
export const DELEGABLE = [
  "Civil and demolition",
  "Flooring",
  "Wall treatments",
  "False ceiling",
  "Electrical",
  "Plumbing",
  "Modular kitchen",
  "Wardrobes",
  "Custom furniture",
  "Upholstery",
  "Painting and polishing",
  "Lighting",
  "Soft furnishings",
];

export const ENGAGEMENT_LABEL: Record<string, string> = {
  turnkey: "Turnkey",
  design_only: "Design only",
  mixed: "Design + part execution",
};

/** Room suggestions the designer can tap to add. Nothing is added automatically. */
export function roomSuggestions(propertyType: string, bedrooms?: number | null, bathrooms?: number | null, balconies?: number | null): string[] {
  if (!isResidentialType(propertyType)) return [...(ROOM_PRESETS[propertyType] ?? ROOM_PRESETS.Other), "General / site"];
  const out = ["Foyer", "Living", "Dining", "Kitchen"];
  const beds = Math.max(0, Math.min(bedrooms ?? 0, 8));
  for (let i = 1; i <= beds; i++) out.push(i === 1 ? "Master Bedroom" : `Bedroom ${i}`);
  if (!beds) out.push("Master Bedroom", "Bedroom 2");
  const baths = Math.max(0, Math.min(bathrooms ?? 0, 8));
  for (let i = 1; i <= baths; i++) out.push(baths === 1 ? "Bathroom" : `Bathroom ${i}`);
  if (!baths) out.push("Bathroom 1");
  const balc = Math.max(0, Math.min(balconies ?? 0, 6));
  for (let i = 1; i <= balc; i++) out.push(balc === 1 ? "Balcony" : `Balcony ${i}`);
  out.push("Kids Bedroom", "Guest Bedroom", "Study", "Pooja", "Utility", "Powder Room");
  if (/villa|house/i.test(propertyType)) out.push("Family Lounge", "Staircase", "Terrace");
  out.push("General / site");
  return [...new Set(out)];
}
