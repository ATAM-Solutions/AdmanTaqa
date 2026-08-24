import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import JobOrdersTableHeader from "./Component/JobOrdersTableHeader";
import TableJobOrders from "./Component/TableJobOrders";
import useGetJobOrders from "@/hooks/JobOrders/useGetJobOrders";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { getApiErrorMessage } from "@/lib/utils";

export default function JobOrders() {
  const { t } = useTranslation("jobOrders");
  const [page] = useState(1);
  const [limit] = useState(20);

  const { data, isLoading, error } = useGetJobOrders({ page, limit });
  const orders = data?.items ?? [];

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md">
        <JobOrdersTableHeader />
        <AsyncBoundary
          isLoading={isLoading}
          error={error}
          loadingFallback={
            <div className="flex justify-center py-16 text-muted-foreground">{t("loading")}</div>
          }
          errorFallback={
            <Alert variant="destructive" className="mx-4 my-6">
              <AlertDescription>{getApiErrorMessage(error, t("loadFailed"))}</AlertDescription>
            </Alert>
          }
        >
          <TableJobOrders orders={orders} />
        </AsyncBoundary>
      </Card>
    </div>
  );
}
