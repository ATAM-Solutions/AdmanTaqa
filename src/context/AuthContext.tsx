import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User, Organization, AuthData, AuthRole } from "../types/auth";
import { buildPermissionHelpers } from "@/lib/permissions";
import { authService } from "@/api/services/authService";

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  roles: AuthRole[];
  permissions: string[];
  accessToken: string | null;
  login: (data: AuthData) => void;
  logout: () => void;
  /** Re-fetch /auth/me and refresh the organization identity (e.g. after a logo upload). */
  refreshOrganization: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ORG_TYPE_STORAGE_KEY = "organization_type";

const isOrganizationType = (
  value: string | null
): value is Organization["type"] =>
  value === "FUEL_STATION" ||
  value === "SERVICE_PROVIDER" ||
  value === "AUTHORITY" ||
  value === "SUPER_ADMIN";

/** Transient failures worth retrying: no response (network), throttling, or a 5xx. 401/403 are final. */
function isTransientAuthFailure(err: unknown): boolean {
  const status = (err as { response?: { status?: number } } | null)?.response?.status;
  return status === undefined || status === 429 || status >= 500;
}

/**
 * GET /auth/me with a short bounded retry. Without it a single throttled/dropped response left the
 * session with an empty permission list and no way to recover until the next full reload.
 */
async function fetchMeWithRetry(): Promise<Awaited<ReturnType<typeof authService.me>>> {
  const delaysMs = [400, 1200];
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await authService.me();
    } catch (err) {
      if (attempt >= delaysMs.length || !isTransientAuthFailure(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
    }
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  /** Who is signed in right now — used to drop cached server data when the identity changes. */
  const currentUserIdRef = useRef<number | string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<AuthRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    setAccessToken(token);
    const cachedOrganizationType = localStorage.getItem(ORG_TYPE_STORAGE_KEY);
    if (isOrganizationType(cachedOrganizationType)) {
      // Lightweight fallback to keep org-type based guards stable across refresh
      // until /me completes (or if it fails temporarily).
      setOrganization((prev) =>
        prev ??
        ({
          id: 0,
          name: "",
          type: cachedOrganizationType,
          status: "APPROVED",
        } as Organization)
      );
    }

    void (async () => {
      try {
        const me = await fetchMeWithRetry();
        if (me.success && me.data) {
          currentUserIdRef.current = me.data.user.id;
          setUser(me.data.user);
          setOrganization(me.data.organization);
          setRoles(me.data.roles ?? []);
          setPermissions(me.data.permissions ?? []);
          localStorage.setItem(ORG_TYPE_STORAGE_KEY, me.data.organization.type);
        }
      } catch {
        // If token is stale, keep fallback auth state based on token only.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = (data: AuthData) => {
    // A different identity (or a fresh sign-in after the previous session ended without an explicit
    // logout, e.g. an expired refresh token) must never see the previous user's cached lists.
    if (currentUserIdRef.current !== data.user.id) queryClient.clear();
    currentUserIdRef.current = data.user.id;
    setUser(data.user);
    setOrganization(data.organization);
    setRoles(data.roles ?? []);
    setPermissions(data.permissions ?? []);
    setAccessToken(data.accessToken);
    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem(ORG_TYPE_STORAGE_KEY, data.organization.type);
    if (data.refreshToken) {
      localStorage.setItem("refresh_token", data.refreshToken);
    }
  };

  const refreshOrganization = async () => {
    try {
      const me = await authService.me();
      if (me.success && me.data) {
        setUser(me.data.user);
        setOrganization(me.data.organization);
        setRoles(me.data.roles ?? []);
        setPermissions(me.data.permissions ?? []);
        localStorage.setItem(ORG_TYPE_STORAGE_KEY, me.data.organization.type);
      }
    } catch {
      // Keep the current in-memory identity if /auth/me is temporarily unavailable.
    }
  };

  const logout = () => {
    currentUserIdRef.current = null;
    queryClient.clear();
    setUser(null);
    setOrganization(null);
    setRoles([]);
    setPermissions([]);
    setAccessToken(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem(ORG_TYPE_STORAGE_KEY);
  };

  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    buildPermissionHelpers({ permissions });

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        roles,
        permissions,
        accessToken,
        login,
        logout,
        refreshOrganization,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAuthenticated: !!accessToken,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
