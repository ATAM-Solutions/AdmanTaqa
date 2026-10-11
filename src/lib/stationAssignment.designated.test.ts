import { describe, expect, it } from "vitest";
import { designatedStationsLosingAccess } from "./stationAssignment";

const stations = [
  { id: 1, managerUserId: 7 },
  { id: 2, managerUserId: 7 },
  { id: 3, managerUserId: 9 },
  { id: 4, managerUserId: null },
];

describe("designatedStationsLosingAccess", () => {
  it("lists only stations designated to this user that are being removed", () => {
    expect(designatedStationsLosingAccess(7, [1, 2, 3, 4], [2, 3], stations).map((s) => s.id)).toEqual([1]);
  });
  it("clearing every station affects every station the user manages", () => {
    expect(designatedStationsLosingAccess(7, [1, 2, 4], [], stations).map((s) => s.id)).toEqual([1, 2]);
  });
  it("adding stations or keeping the designated one warns about nothing", () => {
    expect(designatedStationsLosingAccess(7, [1], [1, 3], stations)).toEqual([]);
    expect(designatedStationsLosingAccess("7", [1, 2], [1, 2], stations)).toEqual([]);
  });
  it("does not warn for stations the user did not have access to in the first place", () => {
    expect(designatedStationsLosingAccess(7, [], [], stations)).toEqual([]);
  });
});
