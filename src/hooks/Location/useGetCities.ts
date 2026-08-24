 import axiosInstance from '@/api/config';
import type { CitiesResponse } from '@/types/location';
import { useQuery } from '@tanstack/react-query';
import { reportError } from '@/lib/errorReporting';

const getCities = async (governorateId: number): Promise<CitiesResponse> => {
    try {
        const response = await axiosInstance.get(`locations/governorates/${governorateId}/cities`);
        return response.data;
    } catch (error: unknown) {
        reportError("Error fetching cities:", error);
        throw error;
    }
};

export default function useGetCities(governorateId: number | null) {
    return useQuery({
        queryKey: ["cities", governorateId],
        queryFn: () => getCities(governorateId!),
        enabled: !!governorateId,
    });
}
