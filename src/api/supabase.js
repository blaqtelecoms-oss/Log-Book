import { createClient } from "@supabase/supabase-js";

/**
 * The browser's Supabase client. The session lives in local storage, so a page
 * reload stays signed in; confirmation and recovery links are picked up from the
 * URL automatically.
 */
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
