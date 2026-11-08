/**
 * GPS check-in helpers: how a position is read from the browser, and how every way it can fail is explained to the operator.
 * The server is the only judge of "inside the geofence"; nothing here decides that or loosens it.
 */

export type GeoIssueKind =
  | "noGeolocation" | "denied" | "unavailable" | "timeout" | "stale"
  | "OUTSIDE_GEOFENCE" | "LOCATION_ACCURACY_TOO_LOW";

export interface GeoIssue {
  kind: GeoIssueKind;
  /** metres from the station (server-measured) */
  distance?: number;
  /** metres allowed by this station's geofence */
  radius?: number;
  /** metres of uncertainty of the browser's reading */
  accuracy?: number;
}

export class GeoReadError extends Error {
  kind: GeoIssueKind;
  constructor(kind: GeoIssueKind) {
    super(kind);
    this.kind = kind;
  }
}

/** A reading older than this is never sent: it describes where the person WAS. */
export const MAX_READING_AGE_MS = 60_000;
/** One fresh, high-accuracy reading; the browser may not answer from its cache. */
export const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 };

export function readPosition(geo: Pick<Geolocation, "getCurrentPosition"> | undefined = typeof navigator !== "undefined" ? navigator.geolocation : undefined, now: () => number = Date.now): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!geo) return reject(new GeoReadError("noGeolocation"));
    geo.getCurrentPosition(
      (pos) => (now() - pos.timestamp > MAX_READING_AGE_MS ? reject(new GeoReadError("stale")) : resolve(pos)),
      (err) => reject(new GeoReadError(err?.code === 1 ? "denied" : err?.code === 3 ? "timeout" : "unavailable")),
      GEO_OPTIONS,
    );
  });
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Turns a failed check-in (browser or server) into something to show; null when it is not a location problem. */
export function geoIssueFromError(e: unknown, readingAccuracy?: number): GeoIssue | null {
  if (e instanceof GeoReadError) return { kind: e.kind };
  const data = (e as { response?: { data?: { code?: string; errors?: Record<string, unknown> } } })?.response?.data;
  const errors = data?.errors ?? {};
  if (data?.code === "OUTSIDE_GEOFENCE") return { kind: "OUTSIDE_GEOFENCE", distance: num(errors.distanceMeters), radius: num(errors.maxRadiusMeters), accuracy: num(errors.accuracyMeters) ?? readingAccuracy };
  if (data?.code === "LOCATION_ACCURACY_TOO_LOW") return { kind: "LOCATION_ACCURACY_TOO_LOW", accuracy: num(errors.accuracyMeters) ?? readingAccuracy, radius: num(errors.maxRadiusMeters) };
  return null;
}
