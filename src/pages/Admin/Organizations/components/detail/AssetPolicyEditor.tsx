import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Info, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog, EmptyState } from "@/components/patterns";
import { formatDate } from "@/lib/i18n/formatters";
import {
  buildSaveBody,
  draftFromPolicy,
  excludesCompanyAdmin,
  hasStaleReferences,
  isDirty,
  needsConfirmation,
  rolesLosingEligibility,
  setRestricted,
  toggleRole,
  type PolicyDraft,
} from "@/lib/assetPolicy";
import type { AdminAssetPolicy, SetAssetPolicyBody } from "@/types/adminOrganization";

interface AssetPolicyEditorProps {
  /** What the API returned. Eligibility shown here is the API's verdict, never recomputed. */
  policy: AdminAssetPolicy;
  /** Persist the policy. Must reject when the API does not confirm the save. */
  onSave: (body: SetAssetPolicyBody) => Promise<unknown>;
  isSaving: boolean;
  /** A translated message for the last failed save (shown inline, next to the unsaved changes). */
  saveError?: string | null;
  onDismissError?: () => void;
}

/**
 * Super Admin editor for ONE company's asset-creation policy. All edits live in `edits` (null = nothing edited), so the
 * form always derives from the saved policy and a save replaces it only with what the API confirmed.
 */
export function AssetPolicyEditor({ policy, onSave, isSaving, saveError, onDismissError }: AssetPolicyEditorProps) {
  const { t, i18n } = useTranslation("adminOrganizations");
  const [edits, setEdits] = useState<PolicyDraft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const draft = edits ?? draftFromPolicy(policy);
  const dirty = edits != null && isDirty(policy, edits);
  const edit = (next: PolicyDraft) => {
    onDismissError?.();
    setEdits(next);
  };

  const adminExcluded = excludesCompanyAdmin(policy, draft);
  const losing = rolesLosingEligibility(policy, draft);
  const stale = hasStaleReferences(policy);
  const editable = !isSaving;
  const total = policy.roles.length;

  const submit = async () => {
    try {
      await onSave(buildSaveBody(policy, draft));
      setEdits(null); // only after the API confirmed: the form now derives from the saved policy
    } catch {
      // the caller already reported the failure; keep the draft so nothing is lost
    } finally {
      setConfirmOpen(false);
    }
  };
  const requestSave = () => {
    if (needsConfirmation(policy, draft)) setConfirmOpen(true);
    else void submit();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{t("assetPolicy.title")}</CardTitle>
            <CardDescription>{t("assetPolicy.description")}</CardDescription>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Badge variant={policy.restricted ? "default" : "secondary"} className="gap-1" data-testid="policy-status">
              {policy.restricted ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              {policy.restricted ? t("assetPolicy.status.restricted") : t("assetPolicy.status.unrestricted")}
            </Badge>
            <p className="text-xs text-muted-foreground sm:whitespace-nowrap">
              {policy.hasPolicy && policy.updatedAt
                ? t("assetPolicy.lastUpdated", { date: formatDate(policy.updatedAt, i18n.language, { dateStyle: "medium" }) })
                : t("assetPolicy.never")}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Restrict toggle ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="asset-policy-restricted" className="text-sm font-medium">
              {t("assetPolicy.toggle.label")}
            </Label>
            <p id="asset-policy-restricted-hint" className="text-sm text-muted-foreground">
              {draft.restricted ? t("assetPolicy.toggle.hintOn") : t("assetPolicy.toggle.hintOff")}
            </p>
          </div>
          <Switch
            id="asset-policy-restricted"
            checked={draft.restricted}
            disabled={!editable}
            aria-describedby="asset-policy-restricted-hint"
            onCheckedChange={(checked) => edit(setRestricted(draft, checked))}
          />
        </div>

        {!draft.restricted ? (
          <Alert data-testid="unrestricted-note">
            <Info className="h-4 w-4" />
            <AlertTitle>{t("assetPolicy.unrestricted.title")}</AlertTitle>
            <AlertDescription>{t("assetPolicy.unrestricted.body")}</AlertDescription>
          </Alert>
        ) : null}

        {stale ? (
          <Alert
            data-testid="stale-references"
            className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("assetPolicy.stale.title")}</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>{t("assetPolicy.stale.body")}</p>
              {policy.staleRoleNames.length > 0 ? (
                <p dir="auto">{t("assetPolicy.stale.names", { names: policy.staleRoleNames.join(", ") })}</p>
              ) : null}
              {policy.staleRoleIds.length > 0 ? <p>{t("assetPolicy.stale.ids", { count: policy.staleRoleIds.length })}</p> : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {/* ── Roles ───────────────────────────────────────────────────── */}
        <section aria-labelledby="asset-policy-roles-title" className="space-y-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h3 id="asset-policy-roles-title" className="text-sm font-semibold">
                {t("assetPolicy.roles.title")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("assetPolicy.roles.description")}</p>
            </div>
            {draft.restricted && total > 0 ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2 whitespace-nowrap">
                <span className="text-xs text-muted-foreground" data-testid="selected-count">
                  {t("assetPolicy.roles.selected", { count: policy.roles.filter((r) => draft.allowed.has(r.name)).length, total })}
                </span>
                <Button type="button" size="sm" variant="ghost" disabled={!editable} onClick={() => edit({ ...draft, allowed: new Set(policy.roles.map((r) => r.name)) })}>
                  {t("assetPolicy.roles.selectAll")}
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={!editable} onClick={() => edit({ ...draft, allowed: new Set() })}>
                  {t("assetPolicy.roles.clear")}
                </Button>
              </div>
            ) : null}
          </div>

          {total === 0 ? (
            <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title={t("assetPolicy.roles.empty")} />
          ) : (
            <ul className="space-y-2" aria-label={t("assetPolicy.roles.listLabel")}>
              {policy.roles.map((role) => {
                const checked = draft.restricted ? draft.allowed.has(role.name) : true;
                const inputId = `asset-policy-role-${role.id}`;
                // eligible but the role itself does not grant Create Assets: say so (the hint exists only then)
                const noteVisible = draft.restricted && checked && !role.holdsAssetCreate;
                return (
                  <li
                    key={role.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    data-testid={`role-row-${role.id}`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Checkbox
                        id={inputId}
                        className="mt-0.5"
                        checked={checked}
                        disabled={!editable || !draft.restricted}
                        aria-describedby={noteVisible ? `${inputId}-hint` : undefined}
                        onCheckedChange={(value) => edit(toggleRole(draft, role.name, value === true))}
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Label htmlFor={inputId} className="cursor-pointer text-sm font-medium" dir="auto">
                            {role.name}
                          </Label>
                          {role.isCompanyAdmin ? <Badge variant="outline">{t("assetPolicy.roles.companyAdmin")}</Badge> : null}
                          {role.isSystem ? <Badge variant="outline">{t("assetPolicy.roles.shared")}</Badge> : null}
                        </div>
                        {noteVisible ? (
                          <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
                            {t("assetPolicy.roles.eligibleNote")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Badge variant={role.holdsAssetCreate ? "secondary" : "outline"} className="w-fit shrink-0">
                      {role.holdsAssetCreate ? t("assetPolicy.roles.holds") : t("assetPolicy.roles.doesNotHold")}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {adminExcluded ? (
          <Alert variant="destructive" data-testid="owner-warning">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>{t("assetPolicy.ownerWarning.title")}</AlertTitle>
            <AlertDescription>{t("assetPolicy.ownerWarning.body", { name: adminExcluded.name })}</AlertDescription>
          </Alert>
        ) : null}

        {saveError ? (
          <Alert variant="destructive" data-testid="save-error">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("assetPolicy.errors.saveFailed")}</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}

        {/* ── Save bar ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300" aria-live="polite" data-testid="unsaved-indicator">
            {dirty ? t("assetPolicy.unsaved.label") : " "}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" disabled={!dirty || isSaving} onClick={() => { onDismissError?.(); setEdits(null); }}>
              {t("assetPolicy.unsaved.discard")}
            </Button>
            <Button type="button" className="gap-2" disabled={!dirty || isSaving} onClick={requestSave}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSaving ? t("assetPolicy.unsaved.saving") : t("assetPolicy.unsaved.save")}
            </Button>
          </div>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("assetPolicy.confirm.title")}
        description={t("assetPolicy.confirm.description")}
        confirmLabel={t("assetPolicy.confirm.confirm")}
        cancelLabel={t("actions.cancel")}
        variant="destructive"
        isPending={isSaving}
        onConfirm={submit}
      >
        <div className="space-y-3 text-sm" data-testid="confirm-details">
          {losing.length > 0 ? (
            <div className="space-y-1">
              <p className="font-medium">{t("assetPolicy.confirm.losing")}</p>
              <ul className="list-disc ps-5">
                {losing.map((r) => (
                  <li key={r.id} dir="auto">{r.name}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {adminExcluded ? <p className="font-medium text-destructive">{t("assetPolicy.confirm.admin", { name: adminExcluded.name })}</p> : null}
          {draft.restricted && draft.allowed.size === 0 ? <p className="font-medium text-destructive">{t("assetPolicy.confirm.nobody")}</p> : null}
        </div>
      </ConfirmDialog>
    </Card>
  );
}
