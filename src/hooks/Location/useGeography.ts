import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/api/config";
import type { GeographyLevel, GeographyListResponse, GeographyNode } from "@/types/location";

/**
 * Lookup endpoints (public, active rows only, server-side search + paging) used by company/station forms.
 * Paths keep the legacy storage names: region = governorates, district = areas.
 */
const LOOKUP_PATH: Record<Exclude<GeographyLevel, "country">, (parentId: number) => string> = {
  region: (id) => `locations/countries/${id}/governorates`,
  city: (id) => `locations/governorates/${id}/cities`,
  district: (id) => `locations/cities/${id}/areas`,
};

export const geographyKeys = {
  lookup: (level: string, parentId: number | null, q: string) => ["geography", "lookup", level, parentId, q] as const,
  admin: (level: string, params: Record<string, unknown>) => ["geography", "admin", level, params] as const,
  all: ["geography"] as const,
};

export const LOOKUP_PAGE_SIZE = 50;

/**
 * Keep the previous page visible while a search/page change loads — but ONLY for the same level and parent.
 * (Blindly using keepPreviousData showed the regions table as "cities" for a moment after switching tabs.)
 */
function keepWhenSameScope<T>(sameScope: (prevKey: readonly unknown[]) => boolean) {
  return (prev: T | undefined, prevQuery?: { queryKey: readonly unknown[] }) =>
    prevQuery && sameScope(prevQuery.queryKey) ? prev : undefined;
}

export function useGeographyLookup(
  level: Exclude<GeographyLevel, "country">,
  parentId: number | null,
  search: string,
  enabled = true,
) {
  const q = search.trim();
  return useQuery({
    queryKey: geographyKeys.lookup(level, parentId, q),
    enabled: enabled && parentId != null,
    placeholderData: keepWhenSameScope<GeographyListResponse>(
      (k) => k[2] === level && k[3] === parentId
    ),
    staleTime: 60_000,
    queryFn: async (): Promise<GeographyListResponse> => {
      const res = await axiosInstance.get(LOOKUP_PATH[level](parentId as number), {
        params: { limit: LOOKUP_PAGE_SIZE, page: 1, ...(q ? { q } : {}) },
      });
      return res.data;
    },
  });
}

export interface GeographyAdminParams {
  level: GeographyLevel;
  parentId?: number | null;
  q?: string;
  isActive?: boolean | null;
  page: number;
  limit: number;
}

/** SUPER_ADMIN management listing (includes inactive rows and child/reference counts). */
export function useGeographyAdminList(params: GeographyAdminParams, enabled = true) {
  const { level, parentId, q, isActive, page, limit } = params;
  return useQuery({
    queryKey: geographyKeys.admin(level, { parentId, q, isActive, page, limit }),
    enabled,
    placeholderData: keepWhenSameScope<GeographyListResponse>((k) => {
      const prevParams = k[3] as { parentId?: number | null } | undefined;
      return k[2] === level && (prevParams?.parentId ?? null) === (parentId ?? null);
    }),
    queryFn: async (): Promise<GeographyListResponse> => {
      const res = await axiosInstance.get(`locations/manage/${level}`, {
        params: {
          page,
          limit,
          ...(parentId != null ? { parentId } : {}),
          ...(q?.trim() ? { q: q.trim() } : {}),
          ...(isActive != null ? { isActive } : {}),
        },
      });
      return res.data;
    },
  });
}

export interface GeographyWriteBody {
  parentId?: number;
  name?: string;
  nameAr?: string;
  code?: string | null;
  isActive?: boolean;
}

function useInvalidateGeography() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: geographyKeys.all });
}

export function useCreateGeography(level: GeographyLevel) {
  const invalidate = useInvalidateGeography();
  return useMutation({
    mutationFn: async (body: GeographyWriteBody) =>
      (await axiosInstance.post<{ data: GeographyNode }>(`locations/manage/${level}`, body)).data.data,
    onSuccess: invalidate,
  });
}

export function useUpdateGeography(level: GeographyLevel) {
  const invalidate = useInvalidateGeography();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: GeographyWriteBody }) =>
      (await axiosInstance.patch<{ data: GeographyNode }>(`locations/manage/${level}/${id}`, body)).data.data,
    onSuccess: invalidate,
  });
}

export function useDeleteGeography(level: GeographyLevel) {
  const invalidate = useInvalidateGeography();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(`locations/manage/${level}/${id}`);
    },
    onSuccess: invalidate,
  });
}
