import axiosInstance from "@/api/config";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

export interface DeleteAccountBody {
  password: string;
}

/** Error carrying the HTTP status and the backend's stable `code` so the UI never matches English text. */
export class DeleteAccountError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "DeleteAccountError";
    this.status = status;
    this.code = code;
  }
}

const deleteAccount = async (userId: number | string, body: DeleteAccountBody) => {
  try {
    const response = await axiosInstance.post(`users/${userId}/delete-account`, body);
    return response.data;
  } catch (err) {
    const e = err as { response?: { status?: number; data?: { message?: string; code?: string } } };
    const message =
      typeof e.response?.data?.message === "string"
        ? e.response.data.message
        : err instanceof Error
          ? err.message
          : "Failed to delete account.";
    throw new DeleteAccountError(message, e.response?.status, e.response?.data?.code);
  }
};

export default function useDeleteAccount() {
  const { logout } = useAuth();

  return useMutation({
    mutationFn: ({ userId, password }: { userId: number | string; password: string }) =>
      deleteAccount(userId, { password }),
    onSuccess: () => {
      logout();
      window.location.hash = "#/login";
    },
  });
}
