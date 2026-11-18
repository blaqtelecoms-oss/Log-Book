import { useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/admin/Modal";
import { supabase } from "@/api/supabase";

const field =
  "mt-1 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-blue)]";

/** Lets a signed-in staff member replace the shared starter password with their own. */
export default function ChangePasswordDialog({ open, onClose }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not update your password.");
      return;
    }
    toast.success("Password updated.");
    setPassword("");
    setConfirm("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Change your password" width="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-[var(--ink)]">
          New password
          <input
            type="password"
            autoComplete="new-password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <label className="block text-sm font-medium text-[var(--ink)]">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            className={field}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink)]"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-11 rounded-xl bg-[var(--brand-blue)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
