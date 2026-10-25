import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Info, Loader2, Lock, ShieldCheck, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/patterns";
import {
  buildDraft,
  codeKey,
  diffDraft,
  isEditable,
  losers,
  moduleRank,
  toggleRestricted,
  toggleRole,
  type PolicyDraft,
} from "@/lib/permissionPolicy";
import type { AdminPermissionPolicy, PermissionPolicyEntry, PolicyPermission } from "@/types/adminOrganization";

interface PermissionPolicyEditorProps {
  /** What the API returned. Eligibility shown here is the API's verdict; the draft only describes the edit in progress. */
  policy: AdminPermissionPolicy;
  /** Persist the changed permissions. Must reject when the API does not confirm the save. */
  onSave: (policies: PermissionPolicyEntry[]) => Promise<unknown>;
  isSaving: boolean;
  /** A translated message for the last failed save (shown next to the unsaved changes). */
  saveError?: string | null;
  onDismissError?: () => void;
}

/**
 * Super Admin matrix for ONE company: for each governable permission, either the platform default (every Job Title keeps what
 * it has; nothing new can be granted per person) or a restriction to the selected Job Titles. The company administrator is
 * always eligible. Everything shown comes from the API; a save replaces the screen only with what the API confirmed.
 */
export function PermissionPolicyEditor({ policy, onSave, isSaving, saveError, onDismissError }: PermissionPolicyEditorProps) {
  const { t } = useTranslation("adminOrganizations");
  const { t: tc } = useTranslation("permissionCatalog");
  const [edits, setEdits] = useState<PolicyDraft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const draft = edits ?? buildDraft(policy);
  const changes = edits ? diffDraft(policy, edits) : [];
  const dirty = changes.length > 0;
  const losing = edits ? losers(policy, edits) : [];
  const edit = (next: PolicyDraft) => {
    onDismissError?.();
    setEdits(next);
  };

  const submit = async () => {
    try {
      await onSave(changes);
      setEdits(null); // only after the API confirmed
    } catch {
      // the caller already reported the failure; keep the draft so nothing is lost
    } finally {
      setConfirmOpen(false);
    }
  };
  const requestSave = () => (losing.length > 0 ? setConfirmOpen(true) : void submit());

  const nameOf = (code: string) => tc(`codes.${codeKey(code)}.name`, { defaultValue: code });
  const descriptionOf = (code: string) => tc(`codes.${codeKey(code)}.description`, { defaultValue: "" });
  const modules = [...policy.modules].sort((a, b) => moduleRank(a.id) - moduleRank(b.id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t("permissionPolicy.title")}</CardTitle>
        <CardDescription>{t("permissionPolicy.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {policy.usersWithoutJobTitle > 0 ? (
          <Alert data-testid="no-job-title-note">
            <Users className="h-4 w-4" />
            <AlertDescription>{t("permissionPolicy.noJobTitle", { count: policy.usersWithoutJobTitle })}</AlertDescription>
          </Alert>
        ) : null}

        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("permissionPolicy.adminAlways")}</span>
        </p>

        <div className="space-y-3">
          {modules.map((m) => {
            const restrictedCount = m.permissions.filter((p) => draft[p.code]?.restricted ?? p.restricted).length;
            return (
              <details key={m.id} className="group rounded-lg border" data-testid={`module-${m.id}`} open={restrictedCount > 0}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="text-sm font-semibold">{tc(`modules.${m.id}`, { defaultValue: m.id })}</span>
                  <span className="text-xs text-muted-foreground">
                    {restrictedCount > 0
                      ? t("permissionPolicy.moduleRestricted", { count: restrictedCount, total: m.permissions.length })
                      : t("permissionPolicy.moduleDefault", { total: m.permissions.length })}
                  </span>
                </summary>
                <div className="divide-y border-t">
                  {m.permissions.map((p) => (
                    <PermissionRow
                      key={p.code}
                      perm={p}
                      roles={policy.roles}
                      entry={draft[p.code]}
                      disabled={isSaving}
                      name={nameOf(p.code)}
                      description={descriptionOf(p.code)}
                      onToggle={(on) => edit(toggleRestricted(draft, p, on))}
                      onRole={(roleName, on) => edit(toggleRole(draft, p.code, roleName, on))}
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </div>

        {saveError ? (
          <p className="flex items-start gap-2 text-sm text-destructive" role="alert" data-testid="save-error">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{saveError}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground" data-testid="change-count">
            {dirty ? t("permissionPolicy.unsaved", { count: changes.length }) : t("permissionPolicy.noChanges")}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!dirty || isSaving} onClick={() => setEdits(null)} data-testid="discard">
              {t("permissionPolicy.discard")}
            </Button>
            <Button disabled={!dirty || isSaving} onClick={requestSave} data-testid="save">
              {isSaving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
              {t("permissionPolicy.save")}
            </Button>
          </div>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("permissionPolicy.confirm.title")}
        description={t("permissionPolicy.confirm.description")}
        confirmLabel={t("permissionPolicy.confirm.confirm")}
        cancelLabel={t("actions.cancel")}
        variant="destructive"
        isPending={isSaving}
        onConfirm={submit}
      >
        <ul className="space-y-1 text-sm" data-testid="confirm-details">
          {losing.map((l) => (
            <li key={`${l.code}:${l.roleName}`}>
              <span className="font-medium">{l.roleName}</span> — {nameOf(l.code)}
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </Card>
  );
}

interface RowProps {
  perm: PolicyPermission;
  roles: AdminPermissionPolicy["roles"];
  entry: { restricted: boolean; eligible: string[] } | undefined;
  disabled: boolean;
  name: string;
  description: string;
  onToggle: (on: boolean) => void;
  onRole: (roleName: string, on: boolean) => void;
}

function PermissionRow({ perm, roles, entry, disabled, name, description, onToggle, onRole }: RowProps) {
  const { t } = useTranslation("adminOrganizations");
  const { t: tc } = useTranslation("permissionCatalog");
  const editable = isEditable(perm);
  const restricted = editable ? (entry?.restricted ?? perm.restricted) : perm.restricted;
  const eligible = new Set(entry?.eligible ?? perm.eligibleRoleNames ?? []);
  const switchId = `restrict-${perm.code}`;

  return (
    <div className="space-y-3 px-4 py-3" data-testid={`perm-${perm.code}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-medium">{name}</h4>
            {perm.sensitive ? <Badge variant="outline" className="text-[10px]">{tc("sensitive")}</Badge> : null}
            {perm.decisionKind ? <Badge variant="secondary" className="text-[10px]">{tc(`decisionKind.${perm.decisionKind}`)}</Badge> : null}
          </div>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          <p className="text-xs text-muted-foreground">
            {t("permissionPolicy.holdsToday")}: {perm.holdingRoleNames.length > 0 ? perm.holdingRoleNames.join(", ") : t("permissionPolicy.nobody")}
          </p>
        </div>
        {editable ? (
          <div className="flex items-center gap-2">
            <Label htmlFor={switchId} className="text-xs text-muted-foreground">
              {restricted ? t("permissionPolicy.restricted") : t("permissionPolicy.platformDefault")}
            </Label>
            <Switch id={switchId} checked={restricted} disabled={disabled} onCheckedChange={onToggle} data-testid={`restrict-${perm.code}`} />
          </div>
        ) : (
          <Badge variant="secondary" className="w-fit gap-1" data-testid={`managed-elsewhere-${perm.code}`}>
            <Lock className="h-3 w-3" />
            {t("permissionPolicy.managedByAssetPolicy")}
          </Badge>
        )}
      </div>

      {editable && !restricted ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground" data-testid={`default-note-${perm.code}`}>
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{perm.grantDefault === "open" ? t("permissionPolicy.defaultOpen") : t("permissionPolicy.defaultClosed")}</span>
        </p>
      ) : null}

      {editable && restricted ? (
        <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid={`roles-${perm.code}`}>
          <legend className="sr-only">{t("permissionPolicy.jobTitles")}</legend>
          {roles.map((r) => {
            const id = `${perm.code}-${r.id}`;
            const checked = r.isCompanyAdmin || eligible.has(r.name);
            return (
              <div key={r.id} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={checked}
                  disabled={disabled || r.isCompanyAdmin}
                  onCheckedChange={(v) => onRole(r.name, v === true)}
                  data-testid={`role-${perm.code}-${r.name}`}
                />
                <Label htmlFor={id} className="flex flex-wrap items-center gap-1 text-sm font-normal">
                  <span dir="auto">{r.name}</span>
                  {r.isCompanyAdmin ? <Lock className="h-3 w-3 text-muted-foreground" aria-label={t("permissionPolicy.alwaysEligible")} /> : null}
                  {perm.holdingRoleNames.includes(r.name) ? <span className="text-[10px] text-muted-foreground">({t("permissionPolicy.holdsShort")})</span> : null}
                </Label>
              </div>
            );
          })}
        </fieldset>
      ) : null}
    </div>
  );
}
