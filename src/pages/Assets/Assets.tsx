import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Boxes, Plus, Search, SearchX } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/patterns";
import TablePagination from "@/components/TablePagination";
import { useAuth } from "@/context/AuthContext";
import { useAssetList } from "@/hooks/Assets/useAssetManagement";
import useGetBranches from "@/hooks/Branches/useGetBranches";
import {
  ASSETS_PAGE_SIZE,
  assetCapabilities,
  classifyAssetError,
  formatDateOnly,
  hasActiveFilters,
  isTerminalAssetError,
  paginate,
  toListParams,
} from "@/lib/assets";
import { getBranchDisplayName } from "@/lib/company";
import { AssetStatusBadge, MaintenanceTypeBadge } from "./components/AssetBadges";
import { assetErrorMessage } from "./components/assetErrors";

const ALL = "__all__";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(handle);
  }, [value, ms]);
  return debounced;
}

/** Keyed by company: switching company (or account) remounts the page, so filters and page number can never carry over. */
export default function Assets() {
  const { organization } = useAuth();
  return <AssetsContent key={organization?.id ?? "none"} />;
}

function AssetsContent() {
  const { t, i18n } = useTranslation("assets");
  const { hasPermission } = useAuth();
  const caps = assetCapabilities(hasPermission);

  const [searchInput, setSearchInput] = useState("");
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(searchInput, 300);
  const params = toListParams(branchId, search);

  const { data: branches = [] } = useGetBranches(); // server-scoped: only the stations this user may see
  const query = useAssetList(params);
  const assets = query.data ?? [];
  const view = paginate(assets, page, ASSETS_PAGE_SIZE);
  const filtered = hasActiveFilters(params);
  const refreshing = query.isFetching && !query.isLoading;

  const clearFilters = () => {
    setSearchInput("");
    setBranchId("");
    setPage(1);
  };

  return (
    <div className="space-y-6 p-4 animate-in fade-in duration-500 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        {caps.create ? (
          <Button asChild className="gap-2 shadow-sm" data-testid="add-asset">
            <Link to="/assets/create">
              <Plus className="h-4 w-4" />
              {t("list.addAsset")}
            </Link>
          </Button>
        ) : null}
      </div>

      {/* inline-size containment: the table scrolls inside the card and never widens the page shell */}
      <Card className="overflow-hidden [contain:inline-size]">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
              placeholder={t("list.searchPlaceholder")}
              aria-label={t("list.searchLabel")}
              className="ps-9"
              data-testid="asset-search"
            />
          </div>
          <Select value={branchId || ALL} onValueChange={(v) => { setBranchId(v === ALL ? "" : v); setPage(1); }}>
            <SelectTrigger className="md:w-64" aria-label={t("list.stationLabel")} data-testid="asset-station-filter">
              <SelectValue placeholder={t("list.allStations")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("list.allStations")}</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{getBranchDisplayName(b, i18n.language) || `#${b.id}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isLoading ? (
          <div className="space-y-2 p-4" aria-busy="true" data-testid="assets-loading">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : query.isError ? (
          <div className="p-4">
            <Alert variant="destructive" data-testid="assets-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{t("list.loadFailed")} {assetErrorMessage(t, query.error)}</span>
                {isTerminalAssetError(classifyAssetError(query.error).kind) ? null : (
                  <Button size="sm" variant="outline" onClick={() => query.refetch()}>{t("list.retry")}</Button>
                )}
              </AlertDescription>
            </Alert>
          </div>
        ) : assets.length === 0 ? (
          <div className="p-6" data-testid={filtered ? "assets-no-match" : "assets-empty"}>
            {filtered ? (
              <EmptyState
                icon={<SearchX className="h-6 w-6" />}
                title={t("list.noMatchTitle")}
                description={t("list.noMatchDescription")}
                action={<Button variant="outline" onClick={clearFilters}>{t("list.clearFilters")}</Button>}
              />
            ) : (
              <EmptyState
                icon={<Boxes className="h-6 w-6" />}
                title={t("list.emptyTitle")}
                description={t("list.emptyDescription")}
                action={caps.create ? (
                  <Button asChild className="gap-2"><Link to="/assets/create"><Plus className="h-4 w-4" />{t("list.addAsset")}</Link></Button>
                ) : undefined}
              />
            )}
          </div>
        ) : (
          <>
            {refreshing ? <p className="px-4 pt-3 text-xs text-muted-foreground" role="status">{t("list.refreshing")}</p> : null}
            {/* phones: one tappable card per asset (the wide table would hide the station and status) */}
            <ul className="divide-y md:hidden" data-testid="asset-cards">
              {view.items.map((asset) => (
                <li key={asset.id} data-testid={`asset-card-${asset.id}`}>
                  <Link to={`/assets/${asset.id}`} className="flex flex-col gap-1.5 p-4 hover:bg-muted/50 focus-visible:bg-muted/50" aria-label={t("list.viewAsset", { name: asset.name })}>
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-medium" dir="auto">{asset.name}</span>
                      <AssetStatusBadge status={asset.status} />
                    </span>
                    <span className="text-sm text-muted-foreground" dir="auto">{getBranchDisplayName(asset.Branch, i18n.language) || "—"}</span>
                    {asset.serialNumber ? <span className="font-mono text-xs text-muted-foreground" dir="ltr">{asset.serialNumber}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[640px]">
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-foreground">{t("list.columns.name")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("list.columns.serialNumber")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("list.columns.station")}</TableHead>
                    <TableHead className="hidden font-bold text-foreground lg:table-cell">{t("list.columns.details")}</TableHead>
                    <TableHead className="font-bold text-foreground">{t("list.columns.status")}</TableHead>
                    <TableHead className="hidden font-bold text-foreground xl:table-cell">{t("list.columns.maintenance")}</TableHead>
                    <TableHead className="hidden font-bold text-foreground md:table-cell">{t("list.columns.warranty")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {view.items.map((asset) => {
                    const details = [asset.type, [asset.manufacturer, asset.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
                    return (
                      <TableRow key={asset.id} data-testid={`asset-row-${asset.id}`}>
                        <TableCell className="min-w-[8rem] font-medium">
                          <Link to={`/assets/${asset.id}`} className="hover:underline focus-visible:underline" dir="auto" aria-label={t("list.viewAsset", { name: asset.name })}>
                            {asset.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground"><span dir="ltr">{asset.serialNumber || "—"}</span></TableCell>
                        <TableCell className="whitespace-nowrap" dir="auto">{getBranchDisplayName(asset.Branch, i18n.language) || "—"}</TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell" dir="auto">{details || "—"}</TableCell>
                        <TableCell><AssetStatusBadge status={asset.status} /></TableCell>
                        <TableCell className="hidden xl:table-cell"><MaintenanceTypeBadge type={asset.maintenanceType} /></TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateOnly(asset.warrantyExpiry, i18n.language)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              currentPage={view.page}
              totalPages={view.totalPages}
              total={view.total}
              pageSize={ASSETS_PAGE_SIZE}
              startIndex={view.startIndex}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
