import { createFileRoute } from "@tanstack/react-router";
import DashboardView from "@/components/admin/dashboard/DashboardView";

export const Route = createFileRoute("/_authed/admin/")({
  component: DashboardView,
  head: () => ({ meta: [{ title: "Dashboard · Visitor Log Book" }] }),
});