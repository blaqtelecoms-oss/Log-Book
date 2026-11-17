import { Link } from "@tanstack/react-router";

/** 404 for any unknown page under /admin. */
export default function AdminNotFound() {
  return (
    <div className="emf-card p-10 text-center">
      <span className="emf-eyebrow emf-eyebrow--dark">Admin</span>
      <h1 className="emf-serif mt-3 text-3xl text-[var(--ink)]">Page not found</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">That admin page does not exist.</p>
      <Link
        to="/admin"
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--brand-blue)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-blue-dark)]"
      >
        Back to the dashboard
      </Link>
    </div>
  );
}