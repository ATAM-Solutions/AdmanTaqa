import { useAuth } from "@/context/AuthContext";
import OrganizationDetails from "@/pages/Authority/Organizations/OrganizationDetails";
import AdminOrganizationDetail from "./AdminOrganizationDetail";

/**
 * /organizations/:id — SUPER_ADMIN gets the company control center;
 * AUTHORITY keeps its read-only review page.
 */
export default function OrganizationDetailEntry() {
  const { organization } = useAuth();
  return organization?.type === "SUPER_ADMIN" ? <AdminOrganizationDetail /> : <OrganizationDetails />;
}
