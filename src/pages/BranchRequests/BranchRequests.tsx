import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useGetOrganization from "@/hooks/Organization/useGetOrganization";
import PendingApprovalGuard from "@/components/PendingApprovalGuard";
import useGetBranchRequests from "@/hooks/BranchRequests/useGetBranchRequests";
import type { BranchRequestStatus } from "@/types/branchRequest";
import BranchRequestsTable from "./Component/BranchRequestsTable";
import { PageHeader } from "@/components/patterns/PageHeader";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";

export default function BranchRequests() {
  const { t } = useTranslation("branchRequests");
  const navigate = useNavigate();
  const [status, setStatus] = useState<BranchRequestStatus | "all">("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: orgResponse, isLoading: orgLoading } = useGetOrganization();
  const organization = orgResponse?.data;
  const isAuthority = organization?.type === "AUTHORITY";
  const isFuelStation = organization?.type === "FUEL_STATION";

  const { data, isLoading, error } = useGetBranchRequests({
    status,
    page,
    limit,
  });

  const items = data?.items ?? [];
  const maxPage = Math.max(1, Math.ceil((data?.total ?? 0) / Math.max(limit, 1)));

  return (
    <PendingApprovalGuard organization={organization} isLoading={orgLoading}>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader
          title={t("list.title")}
          description={t("list.subtitle")}
          action={
            isFuelStation ? (
              <Button onClick={() => navigate("/branch-requests/create")}>
                {t("list.submitRequest")}
              </Button>
            ) : undefined
          }
        />

        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("list.statusLabel")}</p>
              <Select
                value={status}
                onValueChange={(value: BranchRequestStatus | "all") => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("list.statusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("status.all")}</SelectItem>
                  <SelectItem value="PENDING">{t("status.PENDING")}</SelectItem>
                  <SelectItem value="UNDER_REVIEW">{t("status.UNDER_REVIEW")}</SelectItem>
                  <SelectItem value="APPROVED">{t("status.APPROVED")}</SelectItem>
                  <SelectItem value="REJECTED">{t("status.REJECTED")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("list.totalPage", { total: data?.total ?? 0, page: data?.page ?? page })}
            </p>
          </div>

          <AsyncBoundary
            isLoading={isLoading}
            error={error}
            loadingFallback={<div className="p-6 text-sm text-muted-foreground">{t("list.loading")}</div>}
          >
            <BranchRequestsTable items={items} isAuthority={isAuthority} />
          </AsyncBoundary>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {t("list.previous")}
            </Button>
            <span className="text-sm text-muted-foreground">{t("list.page", { page })}</span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => (p < maxPage ? p + 1 : p))}
              disabled={page >= maxPage}
            >
              {t("list.next")}
            </Button>
          </div>
        </Card>
      </div>
    </PendingApprovalGuard>
  );
}
