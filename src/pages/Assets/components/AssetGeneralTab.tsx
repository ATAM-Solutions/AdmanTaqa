import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/i18n/formatters";
import { formatDateOnly, formatDateTime } from "@/lib/assets";
import { getBranchDisplayName } from "@/lib/company";
import type { AssetDetail } from "@/types/asset";
import { AssetStatusBadge, MaintenanceTypeBadge } from "./AssetBadges";

function Item({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm" dir="auto">{children}</dd>
    </div>
  );
}

/** General information: exactly the fields GET /assets/:id returns (plus its computed overview values). */
export default function AssetGeneralTab({ asset }: { asset: AssetDetail }) {
  const { t, i18n } = useTranslation("assets");
  const lang = i18n.language;
  const dash = "—";
  const cost = asset.purchaseCost == null || asset.purchaseCost === "" ? null : Number(asset.purchaseCost);
  const hasOverview = asset.healthScore != null || asset.documentCount != null || asset.maintenanceHistoryCount != null || asset.workOrderCount != null;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">{t("details.general.title")}</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2" data-testid="asset-general">
            <Item label={t("details.general.station")}>{getBranchDisplayName(asset.Branch, lang) || dash}</Item>
            <Item label={t("details.general.status")}><AssetStatusBadge status={asset.status} /></Item>
            <Item label={t("details.general.maintenanceType")}><MaintenanceTypeBadge type={asset.maintenanceType} /></Item>
            <Item label={t("details.general.type")}>{asset.type || dash}</Item>
            <Item label={t("details.general.manufacturer")}>{asset.manufacturer || dash}</Item>
            <Item label={t("details.general.model")}>{asset.model || dash}</Item>
            <Item label={t("details.general.serialNumber")}><span dir="ltr">{asset.serialNumber || dash}</span></Item>
            <Item label={t("details.general.location")}>{asset.location || dash}</Item>
            <Item label={t("details.general.installationDate")}>{formatDateOnly(asset.installationDate, lang)}</Item>
            <Item label={t("details.general.purchaseDate")}>{formatDateOnly(asset.purchaseDate, lang)}</Item>
            <Item label={t("details.general.purchaseCost")}>
              {cost == null || Number.isNaN(cost) ? dash : <span dir="ltr">{formatNumber(cost, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
            </Item>
            <Item label={t("details.general.warrantyExpiry")}>{formatDateOnly(asset.warrantyExpiry, lang)}</Item>
            <Item label={t("details.general.createdAt")}>{formatDateTime(asset.createdAt, lang)}</Item>
            <Item label={t("details.general.description")} wide>
              <span className="whitespace-pre-wrap">{asset.description || dash}</span>
            </Item>
          </dl>
        </CardContent>
      </Card>

      {hasOverview ? (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("details.general.overview")}</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-4" data-testid="asset-overview">
              {asset.healthScore != null ? <Item label={t("details.general.healthScore")}><span dir="ltr">{formatNumber(asset.healthScore, lang)} / 100</span></Item> : null}
              <Item label={t("details.general.lastMaintenance")}>{formatDateOnly(asset.lastMaintenanceDate, lang)}</Item>
              <Item label={t("details.general.nextMaintenance")}>{formatDateOnly(asset.nextMaintenanceDate, lang)}</Item>
              {asset.documentCount != null ? <Item label={t("details.general.documents")}>{formatNumber(asset.documentCount, lang)}</Item> : null}
              {asset.maintenanceHistoryCount != null ? <Item label={t("details.general.maintenanceRecords")}>{formatNumber(asset.maintenanceHistoryCount, lang)}</Item> : null}
              {asset.workOrderCount != null ? <Item label={t("details.general.workOrders")}>{formatNumber(asset.workOrderCount, lang)}</Item> : null}
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
