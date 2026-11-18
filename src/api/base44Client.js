import { createEntities } from "@/api/entityAdapter";
import { supabase } from "@/api/supabase";

/**
 * The app's backend client, backed by Supabase.
 *
 * It keeps the shape the app was written against (`entities.*`, `auth.*`,
 * `integrations.Core.UploadPublicFile`) so pages and server functions can call it
 * unchanged; every call now goes to the Supabase project instead of Base44.
 */

const errorMessage = (error) => {
  const message = error?.message || "Something went wrong";
  if (/invalid login credentials/i.test(message)) return "Invalid email or password";
  if (/email not confirmed/i.test(message)) return "Confirm your email address before signing in";
  if (/user already registered/i.test(message)) return "An account with that email already exists";
  return message;
};

const failure = (error) => Object.assign(new Error(errorMessage(error)), { status: error?.status });
const throwIf = (error) => {
  if (error) throw failure(error);
};

/** Synchronous check for a stored session, so the auth query can skip a pointless request. */
const hasStoredSession = () => {
  if (typeof window === "undefined") return false;
  try {
    // A large session is split into chunks: sb-<ref>-auth-token, or ...-auth-token.0/.1/…
    const sessionKey = /^sb-.*-auth-token(\.\d+)?$/;
    return Object.keys(window.localStorage).some((key) => sessionKey.test(key));
  } catch {
    return false;
  }
};

const profileFor = async (user) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,app_role,staff_role,branch,created_at")
    .eq("id", user.id)
    .maybeSingle();
  return {
    id: user.id,
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name || "",
    role: profile?.app_role ?? "user",
    staff_role: profile?.staff_role ?? null,
    branch: profile?.branch ?? null,
    created_date: profile?.created_at ?? user.created_at,
  };
};

const auth = {
  hasToken: () => hasStoredSession(),

  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) throw Object.assign(new Error("Not signed in"), { status: 401 });
    return profileFor(data.user);
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    throwIf(error);
    return data?.user ? profileFor(data.user) : null;
  },

  async logout() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") window.location.assign("/login");
  },

  redirectToLogin(returnTo) {
    if (typeof window === "undefined") return;
    const target = returnTo || window.location.href;
    window.location.assign(`/login?returnTo=${encodeURIComponent(target)}`);
  },

  // Supabase keeps the session itself; kept so the existing pages can call it.
  setToken() {},

  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/login` },
    });
    throwIf(error);
    return { user: data?.user ?? null, session: data?.session ?? null };
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: "signup" });
    throwIf(error);
    return { access_token: data?.session?.access_token ?? null, user: data?.user ?? null };
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    throwIf(error);
    return { ok: true };
  },

  async resetPasswordRequest(email) {
    const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    throwIf(error);
    return { ok: true };
  },

  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    throwIf(error);
    return { ok: true };
  },

  async loginWithProvider(provider, returnTo) {
    const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}${returnTo || "/"}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    throwIf(error);
    return { ok: true };
  },
};

/**
 * Uploads a file to Supabase Storage and returns its public URL (stored publicly — anyone
 * with the link can open them). `bucket` picks the category: "logos" or "slides".
 */
const UploadPublicFile = async ({ file, bucket = "slides" }) => {
  const safeName = String(file?.name || "file").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80);
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file?.type || undefined,
  });
  throwIf(error);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { file_url: data.publicUrl };
};

export const base44 = {
  entities: createEntities(supabase),
  auth,
  integrations: { Core: { UploadPublicFile } },
};
