import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Building2,
  CircleCheck,
  ClipboardList,
  FileOutput,
  GitBranch,
  History,
  Mail,
  MapPin,
  Phone,
  Send,
  Users,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog, EmptyState } from "@/components/patterns";
import { ActiveBadge, OrganizationStatusBadge, OrganizationTypeBadge } from "@/components/company/CompanyBadges";
import {
  useRemoveAdminOrganizationLogo,
  useUploadAdminOrganizationLogo,
} from "@/hooks/AdminOrganizations/useAdminOrganizations";
import { getOrganizationDisplayName } from "@/lib/company";
import { formatDate, formatNumber } from "@/lib/i18n/formatters";
import { cn, getApiErrorMessage } from "@/lib/utils";
import type { AdminOrganizationDetail } from "@/types/adminOrganization";
import { CompanyLogoUploader } from "../CompanyLogoUploader";

interface OverviewTabProps {
  organization: AdminOrganizationDetail;
}

export function OverviewTab({ organization }: OverviewTabProps) {
  const { t, i18n } = useTranslation("adminOrganizations");
  const uploadLogo = useUploadAdminOrganizationLogo();
  const removeLogo = useRemoveAdminOrganizationLogo();
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const isFuelStation = organization.type === "FUEL_STATION";
  const displayName = getOrganizationDisplayName(organization, i18n.language);
  const notSet = t("detail.overview.notSet");
  const date = (value: string | null | undefined) =>
    value ? formatDate(value, i18n.language, { dateStyle: "medium", timeStyle: "short" }) : notSet;

  const approvals = useMemo(
    () =>
      [...(organization.OrganizationApprovals ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [organization.OrganizationApprovals]
  );

  const handleUpload = (file: File) => {
    uploadLogo.mutate(
      { id: organization.id, file },
      {
        onSuccess: () => toast.success(t("toasts.logoUploaded")),
        onError: (e) => toast.error(getApiErrorMessage(e, t("toasts.error"))),
      }
    );
  };

  const handleRemove = () => {
    removeLogo.mutate(organization.id, {
      onSuccess: () => {
        toast.success(t("toasts.logoRemoved"));
        setRemoveConfirmOpen(false);
      },
      onError: (e) => toast.error(getApiErrorMessage(e, t("toasts.error"))),
    });
  };

  const summary = organization.summary;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* ── Left column ─────────────────────────────────────────────────── */}
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t("detail.overview.companyInfo")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <InfoRow label={t("detail.overview.type")} value={<OrganizationTypeBadge type={organization.type} />} />
              <InfoRow
                label={t("detail.overview.status")}
                value={<OrganizationStatusBadge status={organization.status} />}
              />
              <InfoRow label={t("detail.overview.activeState")} value={<ActiveBadge isActive={organization.isActive} />} />
              <InfoRow
                label={t("detail.overview.registrationNumber")}
                value={organization.registrationNumber ? <span dir="ltr" className="font-mono">{organization.registrationNumber}</span> : notSet}
              />
              <InfoRow label={t("detail.overview.createdAt")} value={date(organization.createdAt)} />
              <InfoRow label={t("detail.overview.approvedAt")} value={date(organization.approvedAt)} />
              <InfoRow
                label={t("detail.overview.approvedBy")}
                value={organization.approvedBy?.fullName ?? notSet}
              />
              {organization.status === "REJECTED" ? (
                <InfoRow
                  label={t("detail.overview.rejectionReason")}
                  value={organization.rejectionReason ?? notSet}
                  className="sm:col-span-2"
                />
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t("detail.overview.contact")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <InfoRow
                label={t("detail.overview.email")}
                icon={<Mail className="h-3.5 w-3.5" />}
                value={
                  organization.email ? (
                    <a href={`mailto:${organization.email}`} dir="ltr" className="hover:underline break-all">
                      {organization.email}
                    </a>
                  ) : (
                    notSet
                  )
                }
              />
              <InfoRow
                label={t("detail.overview.phone")}
                icon={<Phone className="h-3.5 w-3.5" />}
                value={
                  organization.phone ? (
                    <a href={`tel:${organization.phone}`} dir="ltr" className="hover:underline">
                      {organization.phone}
                    </a>
                  ) : (
                    notSet
                  )
                }
              />
              <InfoRow
                label={t("detail.overview.city")}
                icon={<MapPin className="h-3.5 w-3.5" />}
                value={organization.City?.name ?? notSet}
              />
              <InfoRow
                label={t("detail.overview.address")}
                value={organization.address ?? notSet}
                className="sm:col-span-2"
              />
            </dl>
          </CardContent>
        </Card>

        {summary ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{t("detail.overview.summaryTitle")}</CardTitle>
              <CardDescription>{t("detail.overview.summaryDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile
                icon={<Wrench className="h-4 w-4" />}
                label={t("detail.overview.openMaintenance")}
                value={formatNumber(summary.openMaintenanceIssues, i18n.language)}
                accent={summary.openMaintenanceIssues > 0 ? "warning" : "default"}
              />
              <StatTile
                icon={<ClipboardList className="h-4 w-4" />}
                label={t("detail.overview.internalWorkOrders")}
                value={formatNumber(summary.internalWorkOrders.open, i18n.language)}
                hint={`/ ${formatNumber(summary.internalWorkOrders.total, i18n.language)}`}
              />
              <StatTile
                icon={<Send className="h-4 w-4" />}
                label={t("detail.overview.externalRequests")}
                value={formatNumber(summary.externalRequests.open, i18n.language)}
                hint={`/ ${formatNumber(summary.externalRequests.total, i18n.language)}`}
              />
              <StatTile
                icon={<FileOutput className="h-4 w-4" />}
                label={t("detail.overview.quotesAwaiting")}
                value={formatNumber(summary.quotesAwaitingDecision, i18n.language)}
                accent={summary.quotesAwaitingDecision > 0 ? "warning" : "default"}
              />
              <StatTile
                icon={<CircleCheck className="h-4 w-4" />}
                label={t("detail.overview.activeJobs")}
                value={formatNumber(summary.activeJobs, i18n.language)}
              />
              <StatTile
                icon={<CircleCheck className="h-4 w-4" />}
                label={t("detail.overview.completedJobs")}
                value={formatNumber(summary.completedJobs, i18n.language)}
              />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t("detail.overview.approvalHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {approvals.length === 0 ? (
              <EmptyState
                icon={<History className="h-6 w-6" />}
                title={t("detail.overview.noApprovals")}
                className="py-8"
              />
            ) : (
              <ul className="space-y-3">
                {approvals.map((approval, index) => (
                  <li key={approval.id}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <OrganizationStatusBadge status={approval.decision} className="mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          {approval.reason ? <p className="text-sm break-words">{approval.reason}</p> : null}
                          <p className="text-xs text-muted-foreground">
                            {approval.User?.fullName
                              ? t("detail.overview.reviewedBy", { name: approval.User.fullName })
                              : t("detail.activity.system")}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{date(approval.createdAt)}</span>
                    </div>
                    {index < approvals.length - 1 ? <Separator className="mt-3" /> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Right column ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t("detail.overview.branding")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyLogoUploader
              logoUrl={organization.logoUrl}
              name={displayName}
              isUploading={uploadLogo.isPending}
              progress={uploadLogo.progress}
              onUpload={handleUpload}
              onRemove={organization.logoUrl ? () => setRemoveConfirmOpen(true) : undefined}
              isRemoving={removeLogo.isPending}
              size="lg"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{t("detail.overview.stats")}</CardTitle>
          </CardHeader>
          <CardContent className={cn("grid gap-3", isFuelStation ? "grid-cols-2" : "grid-cols-1")}>
            {isFuelStation ? (
              <StatTile
                icon={<GitBranch className="h-4 w-4" />}
                label={t("detail.overview.stations")}
                value={formatNumber(organization.stationsCount ?? 0, i18n.language)}
                hint={t("detail.overview.activeStations", {
                  count: organization.activeStationsCount,
                })}
              />
            ) : null}
            <StatTile
              icon={<Users className="h-4 w-4" />}
              label={t("detail.overview.users")}
              value={formatNumber(organization.usersCount ?? 0, i18n.language)}
              hint={t("detail.overview.activeUsers", { count: organization.activeUsersCount })}
            />
            {!isFuelStation ? (
              <StatTile
                icon={<Building2 className="h-4 w-4" />}
                label={t("detail.overview.type")}
                value={t(`type.${organization.type}`)}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={removeConfirmOpen}
        onOpenChange={setRemoveConfirmOpen}
        title={t("confirm.removeLogoTitle")}
        description={t("confirm.removeLogoDescription")}
        confirmLabel={t("actions.removeLogo")}
        cancelLabel={t("actions.cancel")}
        variant="destructive"
        isPending={removeLogo.isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium break-words" dir="auto">
        {value}
      </dd>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  accent = "default",
}: {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "default" | "warning";
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/20 p-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
        <p className="mt-1 text-xl font-bold tracking-tight">
          {value}
          {hint ? <span className="ms-1 text-xs font-normal text-muted-foreground">{hint}</span> : null}
        </p>
      </div>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          accent === "warning"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            : "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </div>
    </div>
  );
}
