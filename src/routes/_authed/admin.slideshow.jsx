import { createFileRoute } from "@tanstack/react-router";
import SlidesView from "@/components/admin/slides/SlidesView";

export const Route = createFileRoute("/_authed/admin/slideshow")({
  component: SlidesView,
  head: () => ({ meta: [{ title: "Slideshow · Visitor Log Book" }] }),
});