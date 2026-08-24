import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import type { TeamMembersListResponse } from "@/types/operator";

const getAvailableTeamMembers = async (): Promise<TeamMembersListResponse> => {
  const response = await axiosInstance.get<TeamMembersListResponse>("operators/team-members");
  return response.data;
};

export default function useGetAvailableTeamMembers(enabled = true) {
  return useQuery({
    queryKey: ["operators", "team-members"],
    queryFn: getAvailableTeamMembers,
    enabled,
  });
}
