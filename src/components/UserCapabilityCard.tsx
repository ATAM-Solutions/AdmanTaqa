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
  isLockingError,
  visibleCapabilities,
  type CapabilityErrorKind,
  type EditMode,
  type ReadonlyReason,
} from "@/lib/userCapabilities";

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
        const error = errors[cap.code];
        const titleId = `capability-title-${cap.code}`;
        // i18next reads "." as a path separator, so the code is keyed with underscores
        const itemKey = cap.code.replace(/\./g, "_");
        return (
          <section
            key={cap.code}
            aria-labelledby={titleId}
            className="space-y-3 rounded-lg border p-4"
            data-testid={`capability-row-${cap.code}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 id={titleId} className="text-sm font-semibold">
                  {t(`capabilities.items.${itemKey}.name`)}
                </h3>
                <p className="text-sm text-muted-foreground">{t(`capabilities.items.${itemKey}.description`)}</p>
              </div>
              <Badge
                variant={row.effective ? "default" : "secondary"}
                className={row.restricted || row.unverifiable ? "w-fit shrink-0 opacity-60" : "w-fit shrink-0"}
                data-testid={`capability-state-${cap.code}`}
              >
                {row.effective ? t("capabilities.access.allowed") : t("capabilities.access.notAllowed")}
              </Badge>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
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
            </dl>

            {row.restricted || row.unverifiable ? (
              <Alert
                data-testid={`capability-restricted-${cap.code}`}
                className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
              >
                <Info className="h-4 w-4" />
                <AlertDescription>{row.unverifiable ? t("capabilities.restricted.unverifiable") : t("capabilities.restricted.role")}</AlertDescription>
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
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !row.canDeny}
                  data-testid={`capability-deny-${cap.code}`}
                  onClick={() => onChange?.(cap.code, "DENY")}
                >
                  {t("capabilities.actions.deny")}
                </Button>
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

  const capabilities = visibleCapabilities(query.data ?? []);
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
          <CapabilityList
            capabilities={capabilities}
            mode={mode}
            reason={reason}
            pendingCode={mutation.isPending ? (mutation.variables?.code ?? null) : null}
            errors={errors}
            onChange={(code, effect) => mutation.mutate({ code, effect })}
          />
        )}
      </CardContent>
    </Card>
  );
}
