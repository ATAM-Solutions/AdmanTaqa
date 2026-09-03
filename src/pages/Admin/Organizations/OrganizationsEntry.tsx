import { useAuth } from "@/context/AuthContext";
import Organizations from "@/pages/Authority/Organizations/Organizations";
import AdminOrganizations from "./AdminOrganizations";

/**
 * /organizations — SUPER_ADMIN gets the full company-management list;
 * AUTHORITY keeps its registration-approval queue.
 */
export default function OrganizationsEntry() {
  const { organization } = useAuth();
  return organization?.type === "SUPER_ADMIN" ? <AdminOrganizations /> : <Organizations />;
}
