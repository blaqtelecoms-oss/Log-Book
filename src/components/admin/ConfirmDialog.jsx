import { useState } from "react";
import Modal from "@/components/admin/Modal";

/** Confirmation for anything destructive, with an optional typed word to proceed. */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  requireWord,
  busy,
}) {
  const [typed, setTyped] = useState("");
  const blocked = requireWord ? typed.trim().toUpperCase() !== requireWord : false;

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <p className="text-sm leading-relaxed text-[var(--muted)]">{body}</p>

      {requireWord ? (
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Type {requireWord} to continue
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--brand-blue)]"
          />
        </label>
      ) : null}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--field)]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={blocked || busy}
          onClick={async () => {
            await onConfirm();
            setTyped("");
          }}
          className="h-11 rounded-xl bg-[var(--brand-red)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}