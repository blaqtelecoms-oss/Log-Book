import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { recordAudit } from "@/lib/admin-fns";
import { getDashboardData } from "@/lib/admin-fns";

/** Audit a staff action and refresh the affected views. */
export function useAuditedMutation({ onDone } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, entity = "Visit", entityId = "", summary, run }) => {
      const result = await run();
      await recordAudit({ data: { action, entity, entity_id: entityId, summary } }).catch(() => {});
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone?.();
    },
  });
}

export function useVisitsQuery(filter, { sort, size, cursor }) {
  return useQuery({
    queryKey: ["visits", filter, sort, size, cursor],
    queryFn: () => base44.entities.Visit.filter(filter, { sort, limit: size, cursor }),
    placeholderData: (prev) => prev,
  });
}

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    refetchInterval: 15_000,
  });
}