import { createFileRoute } from "@tanstack/react-router";
import StaffView from "@/components/admin/staff/StaffView";

export const Route = createFileRoute("/_authed/admin/admins")({
  component: StaffView,
  head: () => ({ meta: [{ title: "Admins · Visitor Log Book" }] }),
});