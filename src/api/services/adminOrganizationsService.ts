import axiosInstance from "@/api/config";
import type {
  AdminActivityListData,
  AdminAssignableRole,
  AdminOrganization,
  AdminOrganizationDetail,
  AdminOrganizationsListData,
  AdminOrganizationsListParams,
  AdminStation,
  AdminUser,
  ApiEnvelope,
  CreateAdminOrganizationBody,
  CreateAdminStationBody,
  CreateAdminUserBody,
  UpdateAdminOrganizationBody,
  UpdateAdminStationBody,
  UpdateAdminUserBody,
} from "@/types/adminOrganization";

const BASE = "admin/organizations";

function unwrap<T>(res: { data: ApiEnvelope<T> }): T {
  return res.data.data;
}

export const adminOrganizationsService = {
  list(params: AdminOrganizationsListParams = {}) {
    const search = new URLSearchParams();
    if (params.type) search.set("type", params.type);
    if (params.status) search.set("status", params.status);
    if (params.isActive !== undefined) search.set("isActive", String(params.isActive));
    if (params.q?.trim()) search.set("q", params.q.trim());
    if (params.page != null) search.set("page", String(params.page));
    if (params.limit != null) search.set("limit", String(params.limit));
    const qs = search.toString();
    return axiosInstance.get<ApiEnvelope<AdminOrganizationsListData>>(qs ? `${BASE}?${qs}` : BASE).then(unwrap);
  },
  get(id: number | string) {
    return axiosInstance.get<ApiEnvelope<AdminOrganizationDetail>>(`${BASE}/${id}`).then(unwrap);
  },
  create(body: CreateAdminOrganizationBody) {
    return axiosInstance.post<ApiEnvelope<AdminOrganizationDetail>>(BASE, body).then(unwrap);
  },
  update(id: number | string, body: UpdateAdminOrganizationBody) {
    return axiosInstance.patch<ApiEnvelope<AdminOrganizationDetail>>(`${BASE}/${id}`, body).then(unwrap);
  },
  setActive(id: number | string, isActive: boolean) {
    return axiosInstance.patch<ApiEnvelope<AdminOrganizationDetail>>(`${BASE}/${id}/active`, { isActive }).then(unwrap);
  },
  uploadLogo(id: number | string, file: File, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append("file", file);
    return axiosInstance
      .post<ApiEnvelope<AdminOrganization>>(`${BASE}/${id}/logo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      })
      .then(unwrap);
  },
  removeLogo(id: number | string) {
    return axiosInstance.delete<ApiEnvelope<AdminOrganization>>(`${BASE}/${id}/logo`).then(unwrap);
  },
  activity(id: number | string, page = 1, limit = 20) {
    return axiosInstance
      .get<ApiEnvelope<AdminActivityListData>>(`${BASE}/${id}/activity?page=${page}&limit=${limit}`)
      .then(unwrap);
  },

  // Stations
  listStations(id: number | string) {
    return axiosInstance.get<ApiEnvelope<AdminStation[]>>(`${BASE}/${id}/stations`).then(unwrap);
  },
  getStation(id: number | string, stationId: number | string) {
    return axiosInstance.get<ApiEnvelope<AdminStation>>(`${BASE}/${id}/stations/${stationId}`).then(unwrap);
  },
  createStation(id: number | string, body: CreateAdminStationBody) {
    return axiosInstance.post<ApiEnvelope<AdminStation>>(`${BASE}/${id}/stations`, body).then(unwrap);
  },
  updateStation(id: number | string, stationId: number | string, body: UpdateAdminStationBody) {
    return axiosInstance.patch<ApiEnvelope<AdminStation>>(`${BASE}/${id}/stations/${stationId}`, body).then(unwrap);
  },

  // Roles + users
  listRoles(id: number | string) {
    return axiosInstance.get<ApiEnvelope<AdminAssignableRole[]>>(`${BASE}/${id}/roles`).then(unwrap);
  },
  listUsers(id: number | string) {
    return axiosInstance.get<ApiEnvelope<AdminUser[]>>(`${BASE}/${id}/users`).then(unwrap);
  },
  getUser(id: number | string, userId: number | string) {
    return axiosInstance.get<ApiEnvelope<AdminUser>>(`${BASE}/${id}/users/${userId}`).then(unwrap);
  },
  createUser(id: number | string, body: CreateAdminUserBody) {
    return axiosInstance.post<ApiEnvelope<AdminUser>>(`${BASE}/${id}/users`, body).then(unwrap);
  },
  updateUser(id: number | string, userId: number | string, body: UpdateAdminUserBody) {
    return axiosInstance.patch<ApiEnvelope<AdminUser>>(`${BASE}/${id}/users/${userId}`, body).then(unwrap);
  },
  resetUserPassword(id: number | string, userId: number | string, password: string) {
    return axiosInstance
      .post<ApiEnvelope<{ id: number; email: string }>>(`${BASE}/${id}/users/${userId}/reset-password`, { password })
      .then(unwrap);
  },
};

/** Own-company branding (company admin): POST/DELETE /organizations/me/logo */
export const companyBrandingService = {
  uploadMyLogo(file: File, onProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append("file", file);
    return axiosInstance
      .post<ApiEnvelope<AdminOrganization>>("organizations/me/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      })
      .then(unwrap);
  },
  removeMyLogo() {
    return axiosInstance.delete<ApiEnvelope<AdminOrganization>>("organizations/me/logo").then(unwrap);
  },
};
