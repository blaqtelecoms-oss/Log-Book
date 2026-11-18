import { Link } from "@tanstack/react-router";
import { AlertTriangle, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/api/supabase";
import { base44 } from "@/api/base44Client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The /reset-password page; the reset email links here and Supabase signs the visit
// in with the short-lived recovery session it carries.
export function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setHasSession(!!data.session);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await base44.auth.resetPassword({ newPassword: password });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Failed to reset password");
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <AuthLayout icon={Lock} title="New password" subtitle="Checking your reset link">
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AuthLayout>
    );
  }

  if (!hasSession) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Invalid reset link"
        subtitle="This password reset link is missing or has expired"
        footer={
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-center text-sm text-foreground">The link you used appears to be incomplete. Please request a new password reset email.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={Lock} title="New password" subtitle="Enter your new password below">
      <AuthError>{error}</AuthError>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-password">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="reset-password" type="password" autoComplete="new-password" autoFocus placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="reset-confirm" type="password" autoComplete="new-password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12 pl-10" required />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Resetting...">
          Reset password
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
