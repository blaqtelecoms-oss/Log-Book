import { createFileRoute } from "@tanstack/react-router";
import Kiosk from "@/components/kiosk/Kiosk";

export const Route = createFileRoute("/")({
  component: Kiosk,
  head: () => ({
    meta: [
      { title: "Visitor Log Book" },
      { name: "description", content: "Sign in at the visitor log book." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
  }),
});