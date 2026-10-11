import { describe, expect, it } from "vitest";
import { buildReportWorkflow, rejectedStageOf } from "./reportWorkflow";
import type { MaintenanceReport } from "@/types/maintenanceReport";

const base = (over: Partial<MaintenanceReport>): MaintenanceReport =>
  ({
    id: 1,
    organizationId: 1,
    branchId: 5,
    assetId: null,
    title: "t",
    priority: "MEDIUM",
    status: "SUBMITTED",
    createdAt: "2026-10-01T10:00:00Z",
    SubmittedByUser: { id: 1, fullName: "Filer" },
    ...over,
  }) as MaintenanceReport;

const states = (r: MaintenanceReport) => buildReportWorkflow(r).stages.map((s) => s.state);

describe("buildReportWorkflow", () => {
  it("SUBMITTED: submitted done, supervisor current, the rest upcoming; no invented people", () => {
    const w = buildReportWorkflow(base({}));
    expect(w.stages.map((s) => s.state)).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(w.currentKey).toBe("supervisor");
    expect(w.stages[1].role).toBe("regional_supervisor");
    expect(w.stages[1].person).toBeNull();
    expect(w.stages[0].person).toBe("Filer");
  });

  it("walks through approvals using persisted actors/timestamps", () => {
    const r = base({
      status: "OPS_APPROVED",
      supervisorReviewedAt: "2026-10-02T09:00:00Z",
      SupervisorReviewedByUser: { id: 2, fullName: "Sup" },
      opsApprovedAt: "2026-10-03T09:00:00Z",
      OpsApprovedByUser: { id: 3, fullName: "Ops" },
    });
    const w = buildReportWorkflow(r);
    expect(w.stages.map((s) => s.state)).toEqual(["done", "done", "done", "current"]);
    expect(w.stages[1].person).toBe("Sup");
    expect(w.stages[2].person).toBe("Ops");
    expect(w.currentKey).toBe("decision");
    expect(w.stages[3].role).toBe("maintenance_manager");
  });

  it("internal outcome links the generated work order; external links the request — never both", () => {
    const internal = buildReportWorkflow(
      base({ status: "RESOLVED_INTERNAL", decisionType: "INTERNAL", decidedAt: "2026-10-04T00:00:00Z", DecidedByUser: { id: 4, fullName: "MM" }, InternalWorkOrder: { id: 9, title: "x", status: "OPEN" } }),
    );
    expect(internal.stages[3]).toMatchObject({ state: "done", outcome: "INTERNAL", link: { type: "internal", id: 9 } });
    expect(internal.terminal).toBe("RESOLVED_INTERNAL");
    const external = buildReportWorkflow(base({ status: "RESOLVED_EXTERNAL", decisionType: "EXTERNAL", ExternalRequest: { id: 12, status: "SUBMITTED_BY_STATION" } }));
    expect(external.stages[3]).toMatchObject({ outcome: "EXTERNAL", link: { type: "external", id: 12 } });
    expect(external.currentKey).toBeNull();
  });

  it("rejection stops the flow at the stage it happened and does not mark later stages done", () => {
    const atSupervisor = base({ status: "REJECTED", rejectedAt: "2026-10-02T00:00:00Z", RejectedByUser: { id: 2, fullName: "Sup" }, rejectionNote: "dup" });
    expect(states(atSupervisor)).toEqual(["done", "rejected", "skipped", "skipped"]);
    expect(buildReportWorkflow(atSupervisor).stages[1]).toMatchObject({ person: "Sup", note: "dup" });

    const atOps = base({ status: "REJECTED", supervisorReviewedAt: "2026-10-02T00:00:00Z", rejectedAt: "2026-10-03T00:00:00Z" });
    expect(states(atOps)).toEqual(["done", "done", "rejected", "skipped"]);

    const atDecision = base({ status: "REJECTED", supervisorReviewedAt: "a", opsApprovedAt: "b", rejectedAt: "c" });
    expect(rejectedStageOf(atDecision)).toBe("decision");
    expect(states(atDecision)).toEqual(["done", "done", "done", "rejected"]);
    expect(buildReportWorkflow(atDecision).currentKey).toBeNull();
  });

  it("legacy row whose status implies a stage but stored nothing is flagged, not given an invented person", () => {
    const w = buildReportWorkflow(base({ status: "SUPERVISOR_APPROVED" }));
    expect(w.stages[1]).toMatchObject({ state: "done", person: null, at: null, recorded: false });
  });
});
