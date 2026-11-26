// Indian number formatting and amount-in-words.

const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** ₹12,45,000 */
export function rupees(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  return `${sign}₹${inr0.format(Math.abs(Math.round(n)))}`;
}

/** Plain grouped number, up to 2 decimals: 1,450.5 */
export function num(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return "—";
  return inr2.format(n);
}

/** Compact lakh / crore form for dashboards: ₹12.45 L, ₹1.2 Cr */
export function rupeesShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1e7) return `${sign}₹${trim(a / 1e7)} Cr`;
  if (a >= 1e5) return `${sign}₹${trim(a / 1e5)} L`;
  if (a >= 1e3) return `${sign}₹${trim(a / 1e3)} K`;
  return `${sign}₹${Math.round(a)}`;
}

function trim(x: number) {
  return x.toFixed(2).replace(/\.?0+$/, "");
}

/** Text version of an amount for PDF fonts lacking the ₹ glyph. */
export function rs(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return "-";
  const sign = n < 0 ? "-" : "";
  return `${sign}Rs. ${inr0.format(Math.abs(Math.round(n)))}`;
}

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${tens[t]}-${ones[o]}` : tens[t];
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ones[h]} Hundred`);
  if (r) parts.push(twoDigits(r));
  return parts.join(" ");
}

/** Indian system: 1245000 -> "Twelve Lakh Forty-Five Thousand" */
export function indianWords(n: number): string {
  n = Math.round(Math.abs(n));
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  if (crore) parts.push(`${crore >= 100 ? indianWords(crore) : twoDigitsOrThree(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  return parts.join(" ");
}

function twoDigitsOrThree(n: number) {
  return n < 100 ? twoDigits(n) : threeDigits(n);
}

export function amountInWords(n: number): string {
  return `Rupees ${indianWords(n)} Only`;
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return formatDate(iso);
}
