import { describe, expect, it, vi } from "vitest";
import { GEO_OPTIONS, GeoReadError, MAX_READING_AGE_MS, geoIssueFromError, readPosition } from "./geoCheckin";

const pos = (timestamp: number, accuracy = 20): GeolocationPosition =>
  ({ timestamp, coords: { latitude: 24.7, longitude: 46.7, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null } }) as unknown as GeolocationPosition;
const fake = (impl: (ok: PositionCallback, err: PositionErrorCallback, opts?: PositionOptions) => void) => ({ getCurrentPosition: vi.fn(impl) });

describe("readPosition", () => {
  it("asks for ONE fresh, high-accuracy reading (never a cached one)", async () => {
    const geo = fake((ok) => ok(pos(1_000)));
    await readPosition(geo, () => 1_000);
    expect(geo.getCurrentPosition.mock.calls[0][2]).toEqual(GEO_OPTIONS);
    expect(GEO_OPTIONS).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 });
  });
  it("returns a fresh reading with its accuracy", async () => {
    const p = await readPosition(fake((ok) => ok(pos(5_000, 18))), () => 5_100);
    expect(p.coords.accuracy).toBe(18);
  });
  it("refuses a stale reading instead of sending where the person WAS", async () => {
    await expect(readPosition(fake((ok) => ok(pos(0))), () => MAX_READING_AGE_MS + 1)).rejects.toMatchObject({ kind: "stale" });
    await expect(readPosition(fake((ok) => ok(pos(0))), () => MAX_READING_AGE_MS)).resolves.toBeTruthy();
  });
  it("tells permission denied, unavailable and timeout apart, and a browser without geolocation", async () => {
    const err = (code: number) => fake((_ok, bad) => bad({ code } as GeolocationPositionError));
    await expect(readPosition(err(1))).rejects.toMatchObject({ kind: "denied" });
    await expect(readPosition(err(2))).rejects.toMatchObject({ kind: "unavailable" });
    await expect(readPosition(err(3))).rejects.toMatchObject({ kind: "timeout" });
    await expect(readPosition(undefined)).rejects.toMatchObject({ kind: "noGeolocation" });
  });
});

describe("geoIssueFromError", () => {
  const api = (data: unknown) => ({ response: { status: 409, data } });
  it("reads the server's structured geofence rejection (distance and radius), keeping the browser's accuracy", () => {
    expect(geoIssueFromError(api({ code: "OUTSIDE_GEOFENCE", errors: { distanceMeters: 14282, maxRadiusMeters: 500 } }), 35))
      .toEqual({ kind: "OUTSIDE_GEOFENCE", distance: 14282, radius: 500, accuracy: 35 });
  });
  it("reads the accuracy rejection", () => {
    expect(geoIssueFromError(api({ code: "LOCATION_ACCURACY_TOO_LOW", errors: { accuracyMeters: 14000, maxRadiusMeters: 500 } })))
      .toEqual({ kind: "LOCATION_ACCURACY_TOO_LOW", accuracy: 14000, radius: 500 });
  });
  it("maps browser failures, and leaves every other error (permission, validation, network) to the normal handler", () => {
    expect(geoIssueFromError(new GeoReadError("denied"))).toEqual({ kind: "denied" });
    expect(geoIssueFromError(api({ code: "INSUFFICIENT_PERMISSIONS" }))).toBeNull();
    expect(geoIssueFromError(new Error("boom"))).toBeNull();
    expect(geoIssueFromError(undefined)).toBeNull();
  });
  it("never invents numbers the server did not send", () => {
    expect(geoIssueFromError(api({ code: "OUTSIDE_GEOFENCE", errors: { distanceMeters: "far" } }))).toEqual({ kind: "OUTSIDE_GEOFENCE", distance: undefined, radius: undefined, accuracy: undefined });
  });
});
