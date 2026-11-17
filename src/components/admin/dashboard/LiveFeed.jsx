import { formatDate, formatDateTime } from "@/lib/kioskFormat";

const STATUS_TONE = {
  active: "bg-[rgba(11,94,168,.12)] text-[var(--brand-blue)]",
  flagged: "bg-[rgba(217,41,28,.12)] text-[var(--brand-red)]",
  archived: "bg-[var(--field)] text-[var(--muted)]",
};

/** The latest sign-ins, refreshed every 15 seconds by the dashboard. */
export default function LiveFeed({ visits = [] }) {
  return (
    <section className="emf-card flex flex-col p-5">
      <h3 className="text-[15px] font-semibold text-[var(--ink)]">Live feed</h3>
      <p className="mb-4 text-xs text-[var(--muted)]">Latest sign-ins · refreshes every 15 seconds</p>

      {visits.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">No sign-ins yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--line)]">
          {visits.map((visit) => (
            <li key={visit.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{visit.full_name}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {visit.reason} · {formatDate(visit.visit_date)} · {visit.time_in}
                </p>
              </div>
              <div className="flex flex-none flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold lowercase ${STATUS_TONE[visit.status] ?? STATUS_TONE.active}`}>
                  {visit.status}
                </span>
                <span className="text-[10.5px] text-[var(--muted)]">{formatDateTime(visit.created_date)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}