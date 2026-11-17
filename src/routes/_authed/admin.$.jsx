import { createFileRoute } from "@tanstack/react-router";
import AdminNotFound from "@/components/admin/AdminNotFound";

export const Route = createFileRoute("/_authed/admin/$")({
  component: AdminNotFound,
  head: () => ({ meta: [{ title: "Not found · Visitor Log Book" }] }),
});