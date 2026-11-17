import { createFileRoute } from "@tanstack/react-router";
import SettingsView from "@/components/admin/settings/SettingsView";

export const Route = createFileRoute("/_authed/admin/settings")({
  component: SettingsView,
  head: () => ({ meta: [{ title: "Settings · Visitor Log Book" }] }),
});