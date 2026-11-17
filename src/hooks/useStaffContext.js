import { useQuery } from "@tanstack/react-query";
import { getStaffContext } from "@/lib/admin-fns";

/** Shared staff context: one call per session, cached across the whole portal. */
export function useStaffContext() {
  return useQuery({
    queryKey: ["staff-context"],
    queryFn: () => getStaffContext(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}