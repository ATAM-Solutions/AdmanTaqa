export type MePermissionsLike = {
  permissions?: string[];
};

/**
 * Permission codes exist in two spellings across the platform: the backend's canonical
 * dot keys (`organizations.read`, `job_orders.read`) and the legacy colon/hyphen style
 * still used by some route rules (`organizations:read`, `job-orders:read`). Both are
 * normalized to the canonical dot form before any comparison so they always match.
 */
export const normalizePermissionCode = (code: string): string =>
  code.trim().replace(/:/g, ".").replace(/-/g, "_");

export const buildPermissionHelpers = (me: MePermissionsLike) => {
  const permissionSet = new Set((me.permissions || []).map(normalizePermissionCode));

  const hasPermission = (code: string) => permissionSet.has(normalizePermissionCode(code));
  const hasAnyPermission = (codes: string[]) =>
    codes.some((code) => permissionSet.has(normalizePermissionCode(code)));
  const hasAllPermissions = (codes: string[]) =>
    codes.every((code) => permissionSet.has(normalizePermissionCode(code)));

  return {
    permissionSet,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};
