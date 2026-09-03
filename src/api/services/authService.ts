import axios from "axios";
import axiosInstance from "../config";
import { apiUrl } from "../config";
import type { AuthResponse, MeData, MeResponse, RegisterV2Response } from "@/types/auth";

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  organizationName: string;
  organizationType: "SERVICE_PROVIDER" | "FUEL_STATION";
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

/** Payload for POST /api/auth/register-v2 (inside FormData field "payload") — registration-v2-api.md */
export interface RegisterV2Profile {
  licenseNumber?: string;
  yearsExperience?: number;
  areaId?: number;
  cityId?: number;
  street?: string;
  serviceCategories?: (number | string)[];
  amount?: number;
}

export interface RegisterV2Payload {
  organizationName: string;
  organizationType: "SERVICE_PROVIDER" | "FUEL_STATION";
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  profile?: RegisterV2Profile;
}

export interface RefreshBody {
  refreshToken: string;
}

export const authService = {
  async login(body: LoginBody): Promise<AuthResponse> {
    const { data } = await axiosInstance.post<AuthResponse>("auth/login", body);
    return data;
  },
  async register(body: RegisterBody): Promise<AuthResponse> {
    const { data } = await axiosInstance.post<AuthResponse>("auth/register", body);
    return data;
  },
  /** POST /api/auth/register-v2 — multipart/form-data: payload (JSON string) + optional files (org_*, sp_*) */
  async registerV2(formData: FormData): Promise<RegisterV2Response> {
    const { data } = await axiosInstance.post<RegisterV2Response>("auth/register-v2", formData);
    return data;
  },
  async refresh(body: RefreshBody): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(`${apiUrl}auth/refresh`, body, {
      headers: { "Content-Type": "application/json" },
    });
    return data;
  },
  /**
   * GET /api/auth/me. The backend answers with a FLAT payload
   * (`{ user, organization, roles, permissions, scope }`, shared with the mobile app),
   * so it is normalized into the `{ success, data }` envelope the app expects —
   * without this, roles/permissions and the organization identity (name, logo)
   * were silently never applied after login or on refresh.
   */
  async me(): Promise<MeResponse> {
    const { data } = await axiosInstance.get<MeResponse | MeData>("auth/me");
    if (data && typeof data === "object" && "data" in data && (data as MeResponse).data?.user) {
      return data as MeResponse;
    }
    return { success: true, data: data as MeData };
  },
};
