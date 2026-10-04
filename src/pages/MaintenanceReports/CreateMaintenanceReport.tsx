import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BranchSelect from "@/components/BranchSelect";
import useGetAssets from "@/hooks/Assets/useGetAssets";
import useCreateMaintenanceReport from "@/hooks/MaintenanceReports/useCreateMaintenanceReport";
import { getApiErrorMessage } from "@/lib/utils";
import {
  MAINTENANCE_REPORT_CATEGORIES,
  MAINTENANCE_REPORT_PRIORITIES,
  type MaintenanceReportCategory,
  type MaintenanceReportPriority,
} from "@/types/maintenanceReport";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

export default function CreateMaintenanceReport() {
  const { t } = useTranslation("maintenanceReports");
  const navigate = useNavigate();
  const createMutation = useCreateMaintenanceReport();

  const [branchId, setBranchId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MaintenanceReportCategory | "">("");
  const [priority, setPriority] = useState<MaintenanceReportPriority>("MEDIUM");
  const [location, setLocation] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const selectedBranchId = branchId ? Number(branchId) : undefined;
  const {
    data: assets = [],
    isLoading: assetsLoading,
    isError: assetsFailed,
    refetch: refetchAssets,
  } = useGetAssets({ branchId: selectedBranchId });

  // Changing the branch invalidates the asset choice: an asset of the previous branch would be
  // rejected by the server (and would be wrong to file anyway).
  const handleBranchChange = (value: string) => {
    setBranchId(value);
    setAssetId("");
  };

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(t("create.fileTypeRejected", { name: file.name }));
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(t("create.fileTooLarge", { name: file.name }));
        continue;
      }
      if (next.length >= MAX_FILES) {
        toast.error(t("create.tooManyFiles", { count: MAX_FILES }));
        break;
      }
      next.push(file);
    }
    setFiles(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t("create.titleRequired"));
      return;
    }
    createMutation.mutate(
      {
        body: {
          title: title.trim(),
          description: description.trim() || null,
          branchId: selectedBranchId ?? null,
          assetId: assetId ? Number(assetId) : null,
          category: category || null,
          location: location.trim() || null,
          priority,
        },
        files,
      },
      {
        onSuccess: ({ report, failedAttachments }) => {
          if (failedAttachments.length > 0) {
            toast.warning(
              t("create.createdWithFailedAttachments", { names: failedAttachments.map((f) => f.name).join(", ") })
            );
          } else {
            toast.success(t("create.success"));
          }
          navigate(`/maintenance-reports/${report.id}`, { replace: true });
        },
        onError: (err) => toast.error(getApiErrorMessage(err, t("create.error"))),
      }
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("create.title")}</CardTitle>
          <CardDescription>{t("create.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="report-branch">{t("fields.branch")}</Label>
                <BranchSelect
                  id="report-branch"
                  value={branchId}
                  onValueChange={handleBranchChange}
                  allowEmpty
                  emptyLabel={t("fields.noBranch")}
                  placeholder={t("create.selectBranch")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-asset">{t("fields.asset")}</Label>
                {!selectedBranchId ? (
                  <p className="text-sm text-muted-foreground">{t("create.pickBranchFirst")}</p>
                ) : assetsLoading ? (
                  <p className="text-sm text-muted-foreground">{t("create.assetsLoading")}</p>
                ) : assetsFailed ? (
                  <div className="flex items-center gap-3 text-sm text-destructive" role="alert">
                    <span>{t("create.assetsLoadFailed")}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => refetchAssets()}>
                      {t("list.retry")}
                    </Button>
                  </div>
                ) : assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("create.assetsEmpty")}</p>
                ) : (
                  <Select value={assetId} onValueChange={(v) => setAssetId(v === "__none__" ? "" : v)}>
                    <SelectTrigger id="report-asset">
                      <SelectValue placeholder={t("create.selectAsset")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("create.noAsset")}</SelectItem>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name ?? a.nameEn ?? a.nameAr ?? `#${a.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-title">{t("fields.title")}</Label>
              <Input id="report-title" value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-description">{t("fields.description")}</Label>
              <Textarea id="report-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="report-category">{t("fields.category")}</Label>
                <Select value={category || "__none__"} onValueChange={(v) => setCategory(v === "__none__" ? "" : (v as MaintenanceReportCategory))}>
                  <SelectTrigger id="report-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("create.noCategory")}</SelectItem>
                    {MAINTENANCE_REPORT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`category.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.priority")}</Label>
                <div className="flex gap-2">
                  {MAINTENANCE_REPORT_PRIORITIES.map((p) => (
                    <Button key={p} type="button" variant={priority === p ? "default" : "outline"} size="sm" onClick={() => setPriority(p)}>
                      {t(`priority.${p}`)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-location">{t("fields.location")}</Label>
              <Input id="report-location" value={location} maxLength={500} placeholder={t("create.locationPlaceholder")} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-files">{t("fields.attachments")}</Label>
              <Input
                id="report-files"
                type="file"
                multiple
                accept={ACCEPTED.join(",")}
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">{t("create.attachmentsHint", { count: MAX_FILES })}</p>
              {files.length > 0 && (
                <ul className="space-y-1">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" disabled={createMutation.isPending} onClick={() => navigate("/maintenance-reports")}>
                {t("create.cancel")}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t("create.submitting")}
                  </>
                ) : (
                  t("create.submit")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
