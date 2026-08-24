import axiosInstance from '@/api/config';
import type { CountriesResponse } from '@/types/location';
import { useQuery } from '@tanstack/react-query';
import { reportError } from '@/lib/errorReporting';

const getCountries = async (): Promise<CountriesResponse> => {
    try {
        const response = await axiosInstance.get("locations/countries");
        return response.data;
    } catch (error: unknown) {
        reportError("Error fetching countries:", error);
        throw error;
    }
};

export default function useGetCountries() {
    return useQuery({
        queryKey: ["countries"],
        queryFn: getCountries,
    });
}
