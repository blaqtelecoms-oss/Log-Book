import { createFileRoute, redirect } from "@tanstack/react-router";
import { authQuery } from "@/lib/AuthContext";

/**
 * The staff entry point. Signed-in staff land on the portal; everyone else is
 * sent to the login page with /admin as the way back.
 */
export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { user } = await context.queryClient.ensureQueryData(authQuery);
    if (user) throw redirect({ to: "/admin" });
    throw redirect({ to: "/login", search: { returnTo: "/admin", from_url: "/admin" } });
  },
  component: () => null,
});