import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

/** Shown to a signed-in visitor who has no access to the staff portal. */
export default function AccessDenied({ email }) {
  return (
    <div className="emf-page flex min-h-screen items-center justify-center p-6">
      <div className="emf-card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[rgba(217,41,28,.12)]">
          <ShieldAlert className="h-7 w-7 text-[var(--brand-red)]" />
        </div>
        <h1 className="emf-serif text-2xl text-[var(--ink)]">Access denied</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          {email ? (
            <>
              <span className="font-semibold text-[var(--ink)]">{email}</span> does not have staff access.
            </>
          ) : (
            "This account does not have staff access."
          )}{" "}
          Ask a super admin to invite you to the portal.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-blue-dark)]"
        >
          Back to the kiosk
        </Link>
      </div>
    </div>
  );
}