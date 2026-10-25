import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, Info, Loader2, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
  fetchUserCapabilities,
  setUserCapability,
  type CapabilityEffect,
  type CapabilityState,
} from "@/api/services/warehouseService";
import {
  capabilityQueryKey,
  classifyCapabilityError,
  describeRow,
  editMode,
  groupCapabilities,
  isLockingError,
  matchesFilter,
  shouldOpenModule,
  type CapabilityErrorKind,
  type CapabilityFilter,
  type EditMode,
  type ReadonlyReason,
} from "@/lib/userCapabilities";
import { codeKey } from "@/lib/permissionPolicy";

interface CapabilityListProps {
  capabilities: readonly CapabilityState[];
  mode: Exclude<EditMode, "hidden">;
  reason: ReadonlyReason;
  /** Code whose request is in flight (all buttons lock while any request is pending). */
  pendingCode?: string | null;
  /** Last failure per capability code. */
  errors?: Readonly<Record<string, CapabilityErrorKind | undefined>>;
  onChange?: (code: string, effect: CapabilityEffect) => void;
}

/**
 * The capability rows. Presentational: everything shown (effective access, role source, override, platform eligibility)
 * is what the API returned; the buttons offered are the ones the backend would accept (see `describeRow`).
 */
export function CapabilityList({ capabilities, mode, reason, pendingCode = null, errors = {}, onChange }: CapabilityListProps) {
  const { t } = useTranslation("users");
  const { t: tc } = useTranslation("permissionCatalog");
  const busy = pendingCode != null;
  return (
    <div className="space-y-4">
      {mode === "readonly" && reason ? (
        <Alert data-testid="capability-readonly">
          <Lock className="h-4 w-4" />
          <AlertDescription>{t(`capabilities.readonly.${reason}`)}</AlertDescription>
        </Alert>
      ) : null}

      {capabilities.map((cap) => {
        const row = describeRow(cap);
        // The common case — a permission nobody offers per person and this person does not hold — is shown compactly:
        // name, state, the reason and the (disabled) Allow control. Anything set, held or restricted keeps the full row.
        const slim = (row.reason === "notGrantable" || row.reason === "notWhitelisted") && row.override === "none" && !row.effective && !row.inheritedFromRole;
        const error = errors[cap.code];
        const titleId = `capability-title-${cap.code}`;
        // i18next reads "." as a path separator, so the code is keyed with underscores
        const itemKey = codeKey(cap.code);
        // the two original capabilities keep their own texts; every other permission is named by the shared catalog
        const name = t(`capabilities.items.${itemKey}.name`, { defaultValue: tc(`codes.${itemKey}.name`, { defaultValue: cap.code }) });
        const description = t(`capabilities.items.${itemKey}.description`, { defaultValue: tc(`codes.${itemKey}.description`, { defaultValue: "" }) });
        return (
          <section
            key={cap.code}
            aria-labelledby={titleId}
            className={slim ? "space-y-2 rounded-lg border px-4 py-3" : "space-y-3 rounded-lg border p-4"}
            data-testid={`capability-row-${cap.code}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 id={titleId} className="text-sm font-semibold">
                    {name}
                  </h3>
                  {cap.sensitive ? <Badge variant="outline" className="text-[10px]">{t("capabilities.sensitive")}</Badge> : null}
                  {cap.decisionKind ? <Badge variant="secondary" className="text-[10px]">{tc(`decisionKind.${cap.decisionKind}`)}</Badge> : null}
                </div>
                {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
              </div>
              <Badge
                variant={row.effective ? "default" : "secondary"}
                className={row.restricted || row.unverifiable ? "w-fit shrink-0 opacity-60" : "w-fit shrink-0"}
                data-testid={`capability-state-${cap.code}`}
              >
                {row.effective ? t("capabilities.access.allowed") : t("capabilities.access.notAllowed")}
              </Badge>
            </div>

            {slim ? null : <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted-foreground">{t("capabilities.labels.role")}:</dt>
                <dd data-testid={`capability-role-${cap.code}`}>
                  {row.inheritedFromRole ? t("capabilities.roleSource.yes") : t("capabilities.roleSource.no")}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted-foreground">{t("capabilities.labels.individual")}:</dt>
                <dd data-testid={`capability-override-${cap.code}`}>{t(`capabilities.individual.${row.override}`)}</dd>
              </div>
            </dl>}

            {row.reason === "notGrantable" || row.reason === "notWhitelisted" ? (
              // not an alarm: most permissions simply are not offered per person; say so briefly
              <p className="flex items-start gap-2 text-xs text-muted-foreground" data-testid={`capability-unavailable-${cap.code}`}>
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{t(`capabilities.restricted.${row.reason}`)}</span>
              </p>
            ) : row.restricted || row.unverifiable ? (
              <Alert
                data-testid={`capability-restricted-${cap.code}`}
                className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
              >
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {t(`capabilities.restricted.${row.reason === "notEligible" || row.reason == null ? "role" : row.reason}`)}
                </AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <p className="flex items-start gap-2 text-sm text-destructive" role="alert" data-testid={`capability-error-${cap.code}`}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t(`capabilities.errors.${error}`)}</span>
              </p>
            ) : null}

            {mode === "edit" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy || !row.canGrant}
                  data-testid={`capability-grant-${cap.code}`}
                  onClick={() => onChange?.(cap.code, "GRANT")}
                >
                  {pendingCode === cap.code ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                  {t("capabilities.actions.grant")}
                </Button>
                {slim ? null : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !row.canDeny}
                    data-testid={`capability-deny-${cap.code}`}
                    onClick={() => onChange?.(cap.code, "DENY")}
                  >
                    {t("capabilities.actions.deny")}
                  </Button>
                )}
                {row.canReset ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    data-testid={`capability-reset-${cap.code}`}
                    onClick={() => onChange?.(cap.code, "DEFAULT")}
                  >
                    {t("capabilities.actions.reset")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

interface UserCapabilityCardProps {
  userId: number | string;
  /** Names of the target person's roles (from the user record) — used only to recognise the company administrator. */
  roleNames?: readonly string[];
}

/**
 * Company manager control: allow/deny delegable capabilities (create assets, create warehouse items) for ONE person,
 * without editing the role they share. Visible only to managers holding `team.assign_roles` of a Fuel Station; the
 * backend enforces role eligibility, hierarchy, self and protected-user rules regardless of what is shown here.
 */
export default function UserCapabilityCard({ userId, roleNames }: UserCapabilityCardProps) {
  const { t } = useTranslation("users");
  const { t: tc } = useTranslation("permissionCatalog");
  const { hasPermission, organization, user: viewer } = useAuth();
  const queryClient = useQueryClient();
  const base = editMode({
    viewerHasAssignRoles: hasPermission("team.assign_roles"),
    viewerOrganizationType: organization?.type,
    viewerUserId: viewer?.id,
    targetUserId: userId,
    targetRoleNames: roleNames,
  });
  // the backend can reveal that this person is protected (e.g. a renamed administrator role): lock the card from then on
  const [lockedReason, setLockedReason] = useState<ReadonlyReason>(null);
  const [errors, setErrors] = useState<Record<string, CapabilityErrorKind | undefined>>({});
  const [filter, setFilter] = useState<CapabilityFilter>("all");
  const mode: EditMode = base.mode === "edit" && lockedReason ? "readonly" : base.mode;
  const reason = base.mode === "edit" ? lockedReason : base.reason;

  const key = capabilityQueryKey(organization?.id, userId);
  const query = useQuery({ queryKey: key, queryFn: () => fetchUserCapabilities(userId), enabled: base.mode !== "hidden", retry: false });

  const mutation = useMutation({
    mutationFn: ({ code, effect }: { code: string; effect: CapabilityEffect }) => setUserCapability(userId, code, effect),
    onMutate: ({ code }) => setErrors((prev) => ({ ...prev, [code]: undefined })),
    // the API answers with the person's refreshed capability list: that, and only that, replaces what is shown
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      toast.success(t("capabilities.saved"));
    },
    onError: (error, { code }) => {
      const kind = classifyCapabilityError(error);
      setErrors((prev) => ({ ...prev, [code]: kind }));
      if (isLockingError(kind)) setLockedReason(kind === "selfChange" ? "self" : "protected");
      // eligibility changed under us (Super Admin edited the policy): show the real state
      if (kind === "roleNotEligible") void query.refetch();
    },
  });

  if (mode === "hidden") return null;

  const groups = groupCapabilities(query.data ?? []);
  const loadFailure = query.isError ? classifyCapabilityError(query.error) : null;

  return (
    <Card data-testid="capability-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("capabilities.title")}</CardTitle>
        <CardDescription>{t("capabilities.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("capabilities.loading")}</p>
        ) : query.isError ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert" data-testid="capability-load-error">
            <p className="text-sm text-destructive">
              {t("capabilities.loadFailed")} {t(`capabilities.errors.${loadFailure}`)}
            </p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              {t("capabilities.retry")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("capabilities.filters.label")} data-testid="capability-filters">
              <span className="text-xs text-muted-foreground">{t("capabilities.filters.label")}:</span>
              {(["all", "allowed", "available", "unavailable"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  aria-pressed={filter === f}
                  data-testid={`capability-filter-${f}`}
                  onClick={() => setFilter(f)}
                >
                  {t(`capabilities.filters.${f}`)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("capabilities.staleHint")}</p>
            {mode === "readonly" && reason ? (
              <Alert data-testid="capability-readonly">
                <Lock className="h-4 w-4" />
                <AlertDescription>{t(`capabilities.readonly.${reason}`)}</AlertDescription>
              </Alert>
            ) : null}
            {groups.map((g) => {
              const shown = g.items.filter((c) => matchesFilter(c, filter));
              const allowed = g.items.filter((c) => c.effective).length;
              if (shown.length === 0 && filter !== "all") return null;
              return (
                <details
                  key={g.module}
                  className="rounded-lg border"
                  data-testid={`capability-module-${g.module}`}
                  open={filter !== "all" || shouldOpenModule(g.items)}
                >
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="text-sm font-semibold">{tc(`modules.${g.module}`, { defaultValue: g.module })}</span>
                    <span className="text-xs text-muted-foreground">{t("capabilities.summary", { allowed, total: g.items.length })}</span>
                  </summary>
                  <div className="border-t p-3">
                    <CapabilityList
                      capabilities={shown}
                      mode={mode}
                      reason={null}
                      pendingCode={mutation.isPending ? (mutation.variables?.code ?? null) : null}
                      errors={errors}
                      onChange={(code, effect) => mutation.mutate({ code, effect })}
                    />
                  </div>
                </details>
              );
            })}
            {groups.every((g) => g.items.filter((c) => matchesFilter(c, filter)).length === 0) ? (
              <p className="text-sm text-muted-foreground">{t("capabilities.empty")}</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
