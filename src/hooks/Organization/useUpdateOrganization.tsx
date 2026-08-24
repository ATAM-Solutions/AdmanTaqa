import axiosInstance from '@/api/config';
import type { OrganizationResponse } from '@/types/organization';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { reportError } from '@/lib/errorReporting';

const updateOrganization = async (data: { name: string }): Promise<OrganizationResponse> => {
  try {
    const response = await axiosInstance.patch("organizations/me", data);
    return response.data;
  } catch (error: unknown) {
    reportError("Error updating organization:", error);
    throw error;
  }
};

export default function useUpdateOrganization() {
  const { t } = useTranslation("profile");
  const queryClient = useQueryClient();

  return (
    useMutation({
      mutationFn: (data: { name: string }) => updateOrganization(data),
      onSuccess: (response) => {
        if (response.success) {
          queryClient.invalidateQueries({ queryKey: ["organization"] });
          queryClient.invalidateQueries({ queryKey: ["organization", "full"] });
          toast.success(response.message || t("editModal.orgUpdated"));
        } else {
          toast.error(response.message || t("editModal.orgUpdateFailed"));
        }
      },
      onError: (error:any) => {
        const errorMessage = error.response?.data?.message || t("editModal.orgUpdateError");
        toast.error(errorMessage);
      },
    })
  )
}
