// Quantities from the designer's own room measurements (feet).
// Deterministic: nothing here guesses a size — it only multiplies what was entered.
// Openings (doors, windows) are not deducted; the designer adjusts if needed.

import type { Project, QtyBasis, RoomSize, ScopeItem } from "./types";

export const BASIS_LABEL: Record<QtyBasis, string> = {
  floor: "floor area",
  ceiling: "ceiling area",
  walls: "wall area",
  perimeter: "room perimeter",
};

/** Which measurement a standard rate-library item is quantified by. */
export const RATE_BASIS: Record<string, QtyBasis> = {
  "r-fl-vitrified": "floor",
  "r-fl-marble": "floor",
  "r-fl-wood": "floor",
  "r-fl-bath": "floor",
  "r-civ-demo-floor": "floor",
  "r-fc-plain": "ceiling",
  "r-fc-cove": "ceiling",
  "r-fc-grid": "ceiling",
  "r-pt-ceiling": "ceiling",
  "r-pt-emulsion": "walls",
  "r-fl-skirting": "perimeter",
  "r-lt-profile": "perimeter",
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function quantityFor(size: RoomSize | undefined, basis: QtyBasis | undefined): number | null {
  if (!size || !basis) return null;
  const { l, w, h } = size;
  if (!l || !w || l <= 0 || w <= 0) return null;
  switch (basis) {
    case "floor":
    case "ceiling":
      return r1(l * w);
    case "perimeter":
      return r1(2 * (l + w));
    case "walls":
      return h && h > 0 ? r1(2 * (l + w) * h) : null;
  }
}

/** Recalculates every auto-quantity line from the project's room sizes. */
export function applyRoomSizes(items: ScopeItem[], sizes: Record<string, RoomSize> | undefined): ScopeItem[] {
  if (!sizes) return items;
  return items.map((it) => {
    if (!it.qtyAuto || !it.qtyBasis) return it;
    const q = quantityFor(sizes[it.room], it.qtyBasis);
    return q === null || q === it.qty ? it : { ...it, qty: q };
  });
}

export function setRoomSize(p: Project, room: string, size: RoomSize): Project {
  const roomSizes = { ...(p.roomSizes ?? {}), [room]: size };
  return { ...p, roomSizes, items: applyRoomSizes(p.items, roomSizes) };
}
