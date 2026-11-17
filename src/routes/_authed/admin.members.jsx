import { createFileRoute } from "@tanstack/react-router";
import MembersView from "@/components/admin/members/MembersView";

export const Route = createFileRoute("/_authed/admin/members")({
  component: MembersView,
  head: () => ({ meta: [{ title: "Registered visitors · Visitor Log Book" }] }),
});