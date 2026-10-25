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

export type PartsFormState = "loading" | "picker" | "empty" | "error" | "manual";

/**
 * What the parts request form shows. The written request is offered only when it legitimately applies: the station has no
 * warehouse parts to pick from (`empty`), or the technician chose it after the list failed to load (`manual`).
 */
export function partsFormState(q: { isLoading: boolean; isError: boolean; isSuccess: boolean }, usableWarehouses: number, manual: boolean): PartsFormState {
  if (q.isLoading) return "loading";
  if (q.isError) return manual ? "manual" : "error";
  if (q.isSuccess) return usableWarehouses > 0 ? "picker" : "empty";
  return "loading";
}
