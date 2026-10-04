import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";

export interface ManagerCandidate {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
}

interface ManagerCandidatesResponse {
  success: boolean;
  data: ManagerCandidate[];
}

/** GET /api/branches/manager-candidates — active Station Managers of the caller's own company. */
async function getManagerCandidates(): Promise<ManagerCandidate[]> {
  const response = await axiosInstance.get<ManagerCandidatesResponse>("branches/manager-candidates");
  return response.data?.data ?? [];
}

export default function useGetManagerCandidates(enabled = true) {
  return useQuery({
    queryKey: ["branches", "manager-candidates"],
    queryFn: getManagerCandidates,
    enabled,
  });
}
