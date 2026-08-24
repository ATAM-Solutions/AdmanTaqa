import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ALLOWED_ORG_TYPES = ["SERVICE_PROVIDER", "AUTHORITY", "FUEL_STATION", "SUPER_ADMIN"] as const;

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, organization, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only APPROVED organizations with type SERVICE_PROVIDER, AUTHORITY, or FUEL_STATION can access the site
  const isAllowedOrg =
    organization?.status === "APPROVED" &&
    organization?.type != null &&
    ALLOWED_ORG_TYPES.includes(organization.type as (typeof ALLOWED_ORG_TYPES)[number]);

  if (!isAllowedOrg) {
    logout();
    return (
      <Navigate
        to="/login"
        state={{ from: location, message: "access_denied" }}
        replace
      />
    );
  }

  return <>{children}</>;
}
