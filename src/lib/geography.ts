import type { GeographyNode } from "@/types/location";

type Named = { name?: string | null; nameAr?: string | null } | null | undefined;

/** Display name in the active UI language, falling back to the other language, then to nothing. */
export function geoName(node: Named, language: string | undefined): string {
  if (!node) return "";
  const ar = (node.nameAr ?? "").trim();
  const en = (node.name ?? "").trim();
  const isAr = (language ?? "").toLowerCase().startsWith("ar");
  return (isAr ? ar || en : en || ar) || "";
}

/** "District · City · Region" label for read-only summaries. */
export function geoPathLabel(parts: Named[], language: string | undefined): string {
  return parts
    .map((p) => geoName(p, language))
    .filter(Boolean)
    .join(" · ");
}

/** Stable machine code from the API error envelope (e.g. GEOGRAPHY_IN_USE), if any. */
export function getApiErrorCode(error: unknown): string | null {
  const code = (error as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
  return typeof code === "string" ? code : null;
}

export function nodeLabel(node: Pick<GeographyNode, "name" | "nameAr">, language: string | undefined): string {
  return geoName(node, language) || node.name;
}

/** Region → City → District selection used by the geography cascade (`areaId` = district). */
export interface GeographySelection {
  regionId: number | null;
  cityId: number | null;
  areaId: number | null;
}

export const EMPTY_GEOGRAPHY: GeographySelection = { regionId: null, cityId: null, areaId: null };
