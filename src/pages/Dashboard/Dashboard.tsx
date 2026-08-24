import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import SuperAdminDashboard from "./SuperAdminDashboard";
import FuelStationDashboard from "./FuelStationDashboard";
import ServiceProviderDashboard from "./ServiceProviderDashboard";

/**
 * Thin dispatcher: each org type gets its own fully separate dashboard
 * component (never one generic dashboard mixing company types). Authority
 * has no dashboard variant (not requested) — falls back to Profile.
 */
export default function Dashboard() {
  const { organization } = useAuth();

  switch (organization?.type) {
    case "SUPER_ADMIN":
      return <SuperAdminDashboard />;
    case "FUEL_STATION":
      return <FuelStationDashboard />;
    case "SERVICE_PROVIDER":
      return <ServiceProviderDashboard />;
    default:
      return <Navigate to="/profile" replace />;
  }
}
