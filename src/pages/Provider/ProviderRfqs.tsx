import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useProviderRfqs from "@/hooks/Provider/useProviderRfqs";
import type { ProviderRfqItem } from "@/types/provider";
import { formatDate } from "@/lib/i18n/formatters";

function rfqTitle(rfq: ProviderRfqItem, fallback: string): string {
  return rfq.formData?.title ?? rfq.title ?? fallback;
}

const PRIORITY_VALUES = ["all", "high", "medium", "low"] as const;

export default function ProviderRfqs() {
  const { t, i18n } = useTranslation("provider");
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const limit = 20;
  const { data, isLoading } = useProviderRfqs({
    page,
    limit,
    title: title.trim() || undefined,
    priority: priority === "all" ? undefined : priority,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setPage(1);
  };
  const handlePriorityChange = (value: string) => {
    setPriority(value);
    setPage(1);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("rfqs.title")}</h1>
        <p className="text-muted-foreground">{t("rfqs.subtitle")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t("rfqs.titleLabel")}</span>
          <Input
            placeholder={t("rfqs.titlePlaceholder")}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-[200px] h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t("rfqs.priorityLabel")}</span>
          <Select value={priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("rfqs.priorityOptions.all")} />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`rfqs.priorityOptions.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Card className="p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("rfqs.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("rfqs.empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("rfqs.table.title")}</TableHead>
                <TableHead>{t("rfqs.table.priority")}</TableHead>
                <TableHead>{t("rfqs.table.branch")}</TableHead>
                <TableHead>{t("rfqs.table.organization")}</TableHead>
                <TableHead>{t("rfqs.table.area")}</TableHead>
                <TableHead>{t("rfqs.table.created")}</TableHead>
                <TableHead className="text-end">{t("rfqs.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((rfq) => (
                <TableRow key={rfq.id}>
                  <TableCell className="font-medium">{rfqTitle(rfq, `RFQ #${rfq.id}`)}</TableCell>
                  <TableCell>{rfq.formData?.priority ?? "—"}</TableCell>
                  <TableCell>
                    {rfq.Branch?.nameEn ?? rfq.Branch?.nameAr ?? (rfq.branchId != null ? t("rfqs.branchFallback", { id: rfq.branchId }) : "—")}
                  </TableCell>
                  <TableCell>{rfq.Organization?.name ?? "—"}</TableCell>
                  <TableCell>{rfq.Area?.name ?? "—"}</TableCell>
                  <TableCell>
                    {rfq.createdAt ? formatDate(rfq.createdAt, i18n.language, { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/provider-rfqs/${rfq.id}`}>{t("rfqs.view")}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {total > limit && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t("rfqs.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("rfqs.next")}
            </Button>
            <span className="text-sm text-muted-foreground self-center">
              {t("rfqs.totalCount", { count: total })}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
