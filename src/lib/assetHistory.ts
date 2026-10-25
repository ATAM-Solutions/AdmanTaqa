import type { AssetHistoryEvent } from "@/types/asset";

/**
 * Pure rules for presenting the asset activity timeline. The backend already sanitised every event (allowlisted details,
 * no raw audit data); these rules only decide how to LABEL what arrived and never fail on what they do not recognise.
 */

export const HISTORY_PAGE_SIZE = 25;

/** Event codes with a dedicated title and description. Anything else is shown generically, with its code. */
export const KNOWN_EVENT_TYPES = [
  "asset.created",
  "asset.updated",
  "asset_warranty.created",
  "asset_warranty.updated",
  "asset_inspection.recorded",
  "asset_maintenance.recorded",
  "asset_document.link_added",
  "asset_document.uploaded",
  "asset_document.deleted",
] as const;
export type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number];

export const isKnownEventType = (code: string): code is KnownEventType => (KNOWN_EVENT_TYPES as readonly string[]).includes(code);

/** i18next reads "." as a path separator: `asset.created` → `asset_created`. */
export const eventKey = (code: KnownEventType) => code.replace(/\./g, "_");

export type EventKind = KnownEventType | "legacy" | "unknown";

/** Which presentation an event gets: legacy rows and unrecognised codes are generic, never an error. */
export function eventKind(event: Pick<AssetHistoryEvent, "eventType" | "source">): EventKind {
  if (event.source === "legacy") return "legacy";
  return isKnownEventType(event.eventType) ? event.eventType : "unknown";
}

// ── defensive readers (details may be null, partial or of an unexpected shape) ──────────────────────────────────────────

const MAX_TEXT = 80;

/**
 * Bidi isolation for values embedded in a translated sentence. Without it a Latin file name or code inside an Arabic sentence
 * (or the reverse) is reordered by the bidi algorithm and punctuation lands on the wrong side.
 * `isolate` = direction follows the value (user text); `isolateLtr` = always left-to-right (codes, sizes, MIME types).
 */
export const isolate = (value: string) => `\u2068${value}\u2069`;
export const isolateLtr = (value: string) => `\u2066${value}\u2069`;

/** Plain text for display: only strings/numbers, whitespace collapsed, long values truncated with an ellipsis. */
export function safeText(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export const detailText = (details: AssetHistoryEvent["details"], key: string, max?: number) => safeText(details?.[key], max);

export const detailNumber = (details: AssetHistoryEvent["details"], key: string): number | null => {
  const v = details?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

export interface FieldChange {
  field: string;
  redacted: boolean;
  /** The change is real but its values are internal ids (a warranty's provider): shown as a sentence, never as numbers. */
  valueless: boolean;
  from: unknown;
  to: unknown;
}

/** Fields whose values are organization ids: the timeline says the field changed, it never prints the ids. */
export const VALUELESS_FIELDS = new Set(["providerOrganizationId"]);

/** The `changes` list of an update event, keeping only well-formed entries. Redacted and valueless entries never carry values. */
export function readChanges(details: AssetHistoryEvent["details"]): FieldChange[] {
  const raw = details?.changes;
  if (!Array.isArray(raw)) return [];
  const out: FieldChange[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const c = entry as Record<string, unknown>;
    if (typeof c.field !== "string" || !c.field) continue;
    const redacted = c.redacted === true;
    const valueless = !redacted && VALUELESS_FIELDS.has(c.field);
    const hide = redacted || valueless;
    out.push({ field: c.field, redacted, valueless, from: hide ? null : c.from, to: hide ? null : c.to });
  }
  return out.slice(0, 20);
}

/** Fields whose values are calendar dates (YYYY-MM-DD). */
export const DATE_FIELDS = new Set(["installationDate", "purchaseDate", "warrantyExpiry", "startDate", "endDate", "inspectionDate"]);
/** Fields whose values are one of a fixed set of codes with their own translations. */
export const ENUM_FIELDS: Record<string, "status" | "maintenanceType"> = { status: "status", maintenanceType: "maintenanceType" };

/** Field names that have a translation; others show their raw name (never hidden, never an error). */
export const KNOWN_FIELDS = [
  "name", "maintenanceType", "type", "manufacturer", "model", "serialNumber", "location",
  "installationDate", "purchaseDate", "purchaseCost", "warrantyExpiry", "status", "description", "startDate", "endDate", "providerOrganizationId",
] as const;
export const isKnownField = (field: string) => (KNOWN_FIELDS as readonly string[]).includes(field);

/** Pages flattened in order, with repeated events (same `eventId`) shown once. */
export function flattenHistory(pages: ReadonlyArray<{ events: AssetHistoryEvent[] }> | undefined): AssetHistoryEvent[] {
  const seen = new Set<string>();
  const out: AssetHistoryEvent[] = [];
  for (const page of pages ?? []) {
    for (const event of page.events) {
      const key = event?.eventId ?? `${event?.source}-${event?.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(event);
    }
  }
  return out;
}
