import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, ChevronLeft, PackageX, Pencil } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/patterns";
import { useAuth } from "@/context/AuthContext";
import { useAsset } from "@/hooks/Assets/useAssetManagement";
import { assetCapabilities, classifyAssetError, isTerminalAssetError } from "@/lib/assets";
import { getBranchDisplayName } from "@/lib/company";
import { AssetStatusBadge, MaintenanceTypeBadge } from "./components/AssetBadges";
import { assetErrorMessage } from "./components/assetErrors";
import AssetGeneralTab from "./components/AssetGeneralTab";
import AssetDocumentsTab from "./components/AssetDocumentsTab";
import AssetWarrantiesTab from "./components/AssetWarrantiesTab";
import AssetInspectionsTab from "./components/AssetInspectionsTab";
import AssetMaintenanceTab from "./components/AssetMaintenanceTab";
import AssetHistoryTab from "./components/AssetHistoryTab";

const TABS = ["general", "documents", "warranties", "inspections", "maintenance", "history"] as const;
type Tab = (typeof TABS)[number];
const isTab = (v: string | null): v is Tab => v != null && (TABS as readonly string[]).includes(v);

/** Keyed by company and asset: a cached or open asset of one company can never be shown under another. */
export default function AssetDetails() {
  const { organization } = useAuth();
  const { id } = useParams<{ id: string }>();
  return <AssetDetailsContent key={`${organization?.id ?? "none"}-${id}`} />;
}

function AssetDetailsContent() {
  const { t, i18n } = useTranslation("assets");
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const caps = assetCapabilities(hasPermission);
  const [params, setParams] = useSearchParams();
  const validId = id && /^\d+$/.test(id) ? id : undefined;
  const query = useAsset(validId);
  const asset = query.data;
  const tab: Tab = isTab(params.get("tab")) ? (params.get("tab") as Tab) : "general";
  const setTab = (next: string) => {
    if (!isTab(next)) return;
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next === "general") p.delete("tab");
      else p.set("tab", next);
      return p;
    }, { replace: true });
  };

  const back = (
    <Button asChild variant="outline" className="gap-2">
      <Link to="/assets"><ChevronLeft className="h-4 w-4 rtl:rotate-180" />{t("details.back")}</Link>
    </Button>
  );

  if (!validId) {
    return <div className="p-4 md:p-8"><EmptyState icon={<PackageX className="h-6 w-6" />} title={t("details.notFoundTitle")} description={t("details.notFoundDescription")} action={back} /></div>;
  }
  if (query.isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-8" aria-busy="true" data-testid="asset-loading">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError || !asset) {
    const kind = classifyAssetError(query.error).kind;
    if (isTerminalAssetError(kind)) {
      // 404 is also what another company's asset looks like; 403 is a station outside the caller's scope
      return (
        <div className="p-4 md:p-8" data-testid="asset-unavailable">
          <EmptyState icon={<PackageX className="h-6 w-6" />} title={t("details.notFoundTitle")} description={kind === "notFound" ? t("details.notFoundDescription") : assetErrorMessage(t, query.error)} action={back} />
        </div>
      );
    }
    return (
      <div className="space-y-4 p-4 md:p-8">
        <Alert variant="destructive" data-testid="asset-load-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{t("errors.loadFailed")} {assetErrorMessage(t, query.error)}</span>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>{t("list.retry")}</Button>
          </AlertDescription>
        </Alert>
        {back}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 animate-in fade-in duration-500 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="ghost" size="icon" aria-label={t("details.back")}>
            <Link to="/assets"><ChevronLeft className="h-5 w-5 rtl:rotate-180" /></Link>
          </Button>
          <div className="min-w-0 space-y-2">
            <h1 className="truncate text-3xl font-bold tracking-tight" dir="auto" data-testid="asset-title">{asset.name}</h1>
            <p className="text-muted-foreground" dir="auto">{getBranchDisplayName(asset.Branch, i18n.language)}</p>
            <div className="flex flex-wrap items-center gap-2">
              <AssetStatusBadge status={asset.status} />
              <MaintenanceTypeBadge type={asset.maintenanceType} />
              {asset.serialNumber ? <span className="font-mono text-xs text-muted-foreground" dir="ltr">{asset.serialNumber}</span> : null}
            </div>
          </div>
        </div>
        {caps.update ? (
          <Button asChild variant="outline" className="gap-2" data-testid="edit-asset">
            <Link to={`/assets/${asset.id}/edit`}><Pencil className="h-4 w-4" />{t("details.edit")}</Link>
          </Button>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          {TABS.map((k) => <TabsTrigger key={k} value={k}>{t(`details.tabs.${k}`)}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="general"><AssetGeneralTab asset={asset} /></TabsContent>
        <TabsContent value="documents"><AssetDocumentsTab assetId={asset.id} caps={caps} /></TabsContent>
        <TabsContent value="warranties"><AssetWarrantiesTab assetId={asset.id} caps={caps} /></TabsContent>
        <TabsContent value="inspections"><AssetInspectionsTab assetId={asset.id} caps={caps} /></TabsContent>
        <TabsContent value="maintenance"><AssetMaintenanceTab assetId={asset.id} caps={caps} /></TabsContent>
        <TabsContent value="history"><AssetHistoryTab assetId={asset.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
