import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { listMembers } from "@/lib/member-fns";

/**
 * The member register, one page at a time. `search` is debounced by the caller;
 * `refresh` reloads every loaded page after a card is added, edited or removed.
 */
export function useMembers(search) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["members", search ?? ""],
    initialPageParam: null,
    queryFn: ({ pageParam }) => listMembers({ data: { search, cursor: pageParam ?? undefined } }),
    getNextPageParam: (last) => last?.next_cursor ?? undefined,
  });

  const pages = query.data?.pages ?? [];

  return {
    rows: pages.flatMap((page) => page.items ?? []),
    total: pages[0]?.total ?? 0,
    branch: pages[0]?.branch ?? "",
    isSuperAdmin: pages[0]?.isSuperAdmin ?? false,
    isPending: query.isPending,
    isError: query.isError,
    hasMore: !!query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    loadMore: query.fetchNextPage,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  };
}