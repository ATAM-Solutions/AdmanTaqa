import axiosInstance from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import type { OperatorsListResponse } from "@/types/operator";

const getOperators = async (): Promise<OperatorsListResponse> => {
  const response = await axiosInstance.get<OperatorsListResponse>("operators");
  return response.data;
};

export default function useGetOperators() {
  return useQuery({
    queryKey: ["operators"],
    queryFn: getOperators,
  });
}
