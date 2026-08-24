import axiosInstance from '@/api/config';
import type { OrganizationResponse } from '@/types/organization';
import { useQuery } from '@tanstack/react-query';
import { reportError } from '@/lib/errorReporting';

const getOrganization = async (): Promise<OrganizationResponse> => {
  try {
    const response = await axiosInstance.get("organizations/me");
    return response.data;
  } catch (error: unknown) {
    reportError("Error fetching organization:", error);
    throw error;
  }
};

export default function useGetOrganization() {
  return (
    useQuery({
      queryKey: ["organization"],
      queryFn: () => getOrganization(),
    })
  )
}
