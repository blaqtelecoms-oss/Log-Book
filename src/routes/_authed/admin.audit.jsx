import { createFileRoute } from "@tanstack/react-router";
import AuditView from "@/components/admin/audit/AuditView";

export const Route = createFileRoute("/_authed/admin/audit")({
  component: AuditView,
  head: () => ({ meta: [{ title: "Audit log · Visitor Log Book" }] }),
});