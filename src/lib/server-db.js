/* global __SUPABASE_URL__, __SUPABASE_SERVICE_ROLE_KEY__ */
import { createClient } from "@supabase/supabase-js";
import { createEntities } from "@/api/entityAdapter";

/**
 * Server-side Supabase access.
 *
 * `__SUPABASE_URL__` / `__SUPABASE_SERVICE_ROLE_KEY__` are replaced at build time by
 * `vite.config.js` from the environment the dev server was started with, so the
 * service-role key never reaches the browser bundle.
 */

/* The shared starter password for staff accounts created from the portal, until each
   person sets their own from the account menu. */
export const DEFAULT_STAFF_PASSWORD = "Love1090";

let adminClient;

export function admin() {
  adminClient ??= createClient(__SUPABASE_URL__, __SUPABASE_SERVICE_ROLE_KEY__, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return adminClient;
}

const mapUser = (user, profile) => ({
  id: user.id,
  email: user.email,
  full_name: profile?.full_name || user.user_metadata?.full_name || "",
  role: profile?.app_role ?? "user",
  staff_role: profile?.staff_role ?? null,
  branch: profile?.branch ?? null,
  created_date: profile?.created_at ?? user.created_at,
});

/** The visitor behind a request, or null when it carries no valid access token. */
export async function userFromRequest(request) {
  const header = request?.headers?.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const client = admin();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: profile } = await client
    .from("profiles")
    .select("full_name,app_role,staff_role,branch,created_at")
    .eq("id", data.user.id)
    .maybeSingle();
  return mapUser(data.user, profile);
}

/**
 * Everything a server function reaches through `context.getBase44()`: the service-role
 * entity API (the staff guards in `staffAccess.js` decide who may use it), the caller's
 * identity, and the staff-account helpers.
 */
export function serverBackend(request) {
  const client = admin();
  const entities = createEntities(client);

  return {
    entities,
    asServiceRole: { entities },
    auth: {
      async me() {
        const user = await userFromRequest(request);
        if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
        return user;
      },
    },
    users: {
      async inviteUser(email, staffRole = "admin") {
        const { data, error } = await client.auth.admin.createUser({
          email,
          password: DEFAULT_STAFF_PASSWORD,
          email_confirm: true,
          user_metadata: { staff_role: staffRole },
        });
        if (error) {
          throw Object.assign(new Error(error.message || "The invite could not be created"), {
            status: error.status ?? 400,
          });
        }
        await client.from("profiles").update({ staff_role: staffRole, app_role: "admin" }).eq("id", data.user.id);
        return { ok: true, id: data.user.id };
      },
      async removeUser(id) {
        const { error } = await client.auth.admin.deleteUser(id);
        if (error) throw Object.assign(new Error(error.message || "Could not remove that account"), { status: 400 });
        return { ok: true };
      },
    },
  };
}
