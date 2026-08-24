import React, { createContext, useContext, useState, useEffect } from "react";
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
        const me = await authService.me();
        if (me.success && me.data) {
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

  const logout = () => {
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
