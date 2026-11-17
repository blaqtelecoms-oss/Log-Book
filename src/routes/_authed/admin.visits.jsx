import { createFileRoute } from "@tanstack/react-router";
import VisitsView from "@/components/admin/visits/VisitsView";

const text = (value) => (typeof value === "string" && value ? value : undefined);

export const Route = createFileRoute("/_authed/admin/visits")({
  component: VisitsPage,
  head: () => ({ meta: [{ title: "Visits · Visitor Log Book" }] }),
  validateSearch: (search) => ({
    q: text(search.q),
    reason: text(search.reason),
    status: text(search.status),
    branch: text(search.branch),
    from: text(search.from),
    to: text(search.to),
    sort: text(search.sort),
    size: Number(search.size) === 50 || Number(search.size) === 100 ? Number(search.size) : undefined,
    new: search.new === "1" ? "1" : undefined,
  }),
});

function VisitsPage() {
  const search = Route.useSearch();
  return <VisitsView search={search} />;
}