import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getHomePath } from "@/lib/navigation";

/** Index route: sends each org type to its landing page (see getHomePath). */
export default function HomeRedirect() {
  const { organization } = useAuth();
  return <Navigate to={getHomePath(organization?.type)} replace />;
}
