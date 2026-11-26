export const CATEGORIES = [
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
  "1 BHK apartment",
  "2 BHK apartment",
  "3 BHK apartment",
  "4 BHK apartment",
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
