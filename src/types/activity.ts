/** One entry of a maintenance activity timeline (GET /…/:id/activity). Business history only — never the security audit log. */
export type ActivityKind = string;

export interface ActivityActor {
  id: number;
  /** null when the person's name is unavailable (shown with a safe fallback). */
  name: string | null;
}

export interface ActivityAttachment {
  id: number;
  fileType: string | null;
  caption: string | null;
  /** Authenticated route (Bearer): report files. */
  downloadUrl?: string | null;
  /** Stored media URL: task files. */
  url?: string | null;
}

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  category: string;
  occurredAt: string;
  actor: ActivityActor | null;
  /** Why there is no actor: UNRECORDED (older record), STATION, PROVIDER, SYSTEM. */
  actorLabel: string | null;
  side: "STATION" | "PROVIDER" | "SYSTEM";
  from: string | null;
  to: string | null;
  /** The comment, rejection reason or note that came with the event. */
  message: string | null;
  important: boolean;
  attachments: ActivityAttachment[];
  related: { taskId?: number | null; taskIds?: number[]; workOrderId?: number | null; reportId?: number | null; requestId?: number | null; warehouseOrderId?: number | null; jobOrderId?: number | null; quoteId?: number | null };
  meta: {
    stage?: string;
    eventType?: string;
    decisionType?: string | null;
    historical?: boolean;
    title?: string | null;
    from?: ActivityActor | null;
    to?: ActivityActor | null;
    assignee?: ActivityActor | null;
    provider?: { id: number; name: string | null } | null;
    approval?: string | null;
    [key: string]: unknown;
  };
}

export interface ActivityPage {
  items: ActivityEvent[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  order: "asc" | "desc";
}

export type ActivityRoot = "report" | "workOrder" | "task" | "stationRequest";
export type ActivityOrder = "asc" | "desc";
