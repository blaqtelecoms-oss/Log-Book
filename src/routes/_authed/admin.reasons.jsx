import { createFileRoute } from "@tanstack/react-router";
import ReasonsView from "@/components/admin/reasons/ReasonsView";

export const Route = createFileRoute("/_authed/admin/reasons")({
  component: ReasonsView,
  head: () => ({ meta: [{ title: "Visit purposes · Visitor Log Book" }] }),
});