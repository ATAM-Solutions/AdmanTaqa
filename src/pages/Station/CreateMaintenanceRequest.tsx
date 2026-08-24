import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Building2 } from "lucide-react";
import { toast } from "sonner";
import useGetBranches from "@/hooks/Branches/useGetBranches";
import useCreateMaintenanceRequest from "@/hooks/Station/useCreateMaintenanceRequest";
import useLinkedProviders from "@/hooks/Station/useLinkedProviders";
import type { MaintenanceMode, MaintenancePriority } from "@/types/station";

export default function CreateMaintenanceRequest() {
  const { t } = useTranslation("station");
  const navigate = useNavigate();
  const { data: branches = [] } = useGetBranches();
  const { data: linkedProviders = [], isLoading: linkedLoading } = useLinkedProviders();
  const createMutation = useCreateMaintenanceRequest();

  const [branchId, setBranchId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<MaintenancePriority>("MEDIUM");
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceMode>("INTERNAL");
  const [firstTaskNotes, setFirstTaskNotes] = useState("");
  const [selectedProviderIds, setSelectedProviderIds] = useState<number[]>([]);

  const toggleProvider = (orgId: number) => {
    setSelectedProviderIds((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bid = branchId ? Number(branchId) : undefined;
    if (!bid || !title.trim()) {
      toast.error(t("create.toasts.branchTitleRequired"));
      return;
    }
    if (!description.trim()) {
      toast.error(t("create.toasts.descriptionRequired"));
      return;
    }
    createMutation.mutate(
      {
        branchId: bid!,
        title: title.trim(),
        description: description.trim(),
        priority,
        maintenanceMode,
        firstTask:
          maintenanceMode === "INTERNAL" && firstTaskNotes.trim()
            ? { notes: firstTaskNotes.trim() }
            : undefined,
        providerOrganizationIds:
          maintenanceMode === "EXTERNAL" && selectedProviderIds.length > 0
            ? selectedProviderIds
            : undefined,
      },
      {
        onSuccess: (data) => {
          if (maintenanceMode === "EXTERNAL" && selectedProviderIds.length === 0 && data?.externalRequest?.id) {
            toast.success(t("create.toasts.createdPendingSend"));
          } else {
            toast.success(t("create.toasts.created"));
          }
          if (maintenanceMode === "INTERNAL" && data?.internalWorkOrder?.id) {
            navigate(`/internal-work-orders/${data.internalWorkOrder.id}`);
          } else if (maintenanceMode === "EXTERNAL" && data?.externalRequest?.id) {
            navigate(`/station-requests/${data.externalRequest.id}`);
          } else {
            navigate("/station-requests");
          }
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : t("create.toasts.createFailed")),
      }
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Button variant="ghost" asChild>
        <Link to="/station-requests" className="gap-2">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{t("create.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("create.subtitle")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("create.branch")}</Label>
              <Select value={branchId} onValueChange={setBranchId} required>
                <SelectTrigger>
                  <SelectValue placeholder={t("create.selectBranch")} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.nameEn ?? b.nameAr ?? t("create.branchFallback", { id: b.id })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">{t("create.requestTitle")}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("create.titlePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("create.description")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("create.descriptionPlaceholder")}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("create.priority")}</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as MaintenancePriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t("create.priorityLow")}</SelectItem>
                  <SelectItem value="MEDIUM">{t("create.priorityMedium")}</SelectItem>
                  <SelectItem value="HIGH">{t("create.priorityHigh")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("create.executionMode")}</Label>
              <Select
                value={maintenanceMode}
                onValueChange={(v) => setMaintenanceMode(v as MaintenanceMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">{t("create.modeInternal")}</SelectItem>
                  <SelectItem value="EXTERNAL">{t("create.modeExternal")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {maintenanceMode === "INTERNAL" ? t("create.modeHintInternal") : t("create.modeHintExternal")}
              </p>
            </div>
            {maintenanceMode === "INTERNAL" && (
              <div className="space-y-2">
                <Label htmlFor="firstTaskNotes">{t("create.firstTaskNotes")}</Label>
                <Input
                  id="firstTaskNotes"
                  value={firstTaskNotes}
                  onChange={(e) => setFirstTaskNotes(e.target.value)}
                  placeholder={t("create.firstTaskNotesPlaceholder")}
                />
              </div>
            )}
            {maintenanceMode === "EXTERNAL" && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                <Label className="text-base font-semibold">{t("create.providersHeading")}</Label>
                <p className="text-sm text-muted-foreground">{t("create.providersDescription")}</p>
                {linkedLoading ? (
                  <p className="text-sm text-muted-foreground">{t("create.loadingProviders")}</p>
                ) : linkedProviders.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {t("create.noLinkedProvidersPrefix")}{" "}
                    <Link to="/linked-providers" className="underline font-medium">
                      {t("create.linkProviders")}
                    </Link>{" "}
                    {t("create.noLinkedProvidersSuffix")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {linkedProviders.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 rounded-md border bg-background px-3 py-2 cursor-pointer hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedProviderIds.includes(p.organizationId)}
                          onCheckedChange={() => toggleProvider(p.organizationId)}
                        />
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {p.organizationName ?? t("create.providerFallback", { id: p.organizationId })}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {linkedProviders.length > 0 && selectedProviderIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("create.selectedProvidersCount", { count: selectedProviderIds.length })}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? t("create.submitting") : t("create.submit")}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/station-requests">{t("create.cancel")}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
