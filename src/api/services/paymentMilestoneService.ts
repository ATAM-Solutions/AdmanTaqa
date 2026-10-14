import axiosInstance from "@/api/config";

export interface MilestoneWorkflow {
  stage: "DUE_LATER" | "AWAITING_REPORT" | "AWAITING_RECEIPT_CONFIRMATION" | "SETTLED" | "DISPUTED";
  due: boolean;
  report: { actor: string; allowed: boolean; reason: string | null };
  confirmReceipt: { actor: string; allowed: boolean; reason: string | null };
}
export interface Milestone {
  id: number;
  sequence: number;
  percent: string | number;
  trigger: string;
  amount: string | number | null;
  currency: string | null;
  status: string;
  receiptUrl: string | null;
  referenceNumber: string | null;
  workflow: MilestoneWorkflow | null;
}

export class PaymentApiError extends Error {
  code: string | null;
  status: number | null;
  constructor(message: string, code: string | null, status: number | null) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
const toError = (err: unknown) => {
  const r = err as { response?: { status?: number; data?: { message?: string; code?: string } }; message?: string };
  return new PaymentApiError(r.response?.data?.message ?? r.message ?? "Request failed", r.response?.data?.code ?? null, r.response?.status ?? null);
};

type Side = "station" | "provider";

export async function fetchMilestones(side: Side, jobOrderId: number | string): Promise<Milestone[]> {
  try {
    const res = await axiosInstance.get<{ data?: Milestone[] }>(`${side}/job-orders/${jobOrderId}/payment-milestones`);
    return Array.isArray(res.data?.data) ? res.data.data : [];
  } catch (e) {
    throw toError(e);
  }
}

/** Station: upload the bank-transfer receipt, returns the absolute URL to report with. */
export async function uploadStationReceipt(jobOrderId: number | string, file: File): Promise<string> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await axiosInstance.post(`station/job-orders/${jobOrderId}/upload-receipt`, form);
    const text = JSON.stringify(res.data);
    const m = text.match(/"(?:receiptFileUrl|fileUrl|receiptUrl)":"([^"]+)"/);
    if (!m) throw new Error("Receipt URL missing in response");
    return m[1];
  } catch (e) {
    throw toError(e);
  }
}

export async function reportMilestoneSent(jobOrderId: number | string, milestoneId: number, body: { referenceNumber?: string; receiptUrl?: string }): Promise<void> {
  try {
    await axiosInstance.post(`station/job-orders/${jobOrderId}/payment-milestones/${milestoneId}/confirm-sent`, body);
  } catch (e) {
    throw toError(e);
  }
}

export async function confirmMilestoneReceived(jobOrderId: number | string, milestoneId: number): Promise<void> {
  try {
    await axiosInstance.post(`provider/job-orders/${jobOrderId}/payment-milestones/${milestoneId}/confirm-received`, { confirm: true });
  } catch (e) {
    throw toError(e);
  }
}
