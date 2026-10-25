/** What is chosen: catalogue item id → quantity as typed. */
export type PartSelection = Record<number, string>;

/** The request lines for a selection: whole quantities of at least 1, in the order picked. */
export function selectionToItems(selection: PartSelection): { sparePartId: number; quantity: number }[] {
  return Object.entries(selection).map(([id, q]) => ({ sparePartId: Number(id), quantity: Math.floor(Number(q)) }));
}
export const isSelectionValid = (selection: PartSelection) => {
  const items = selectionToItems(selection);
  return items.length > 0 && items.every((i) => Number.isFinite(i.quantity) && i.quantity >= 1);
};
