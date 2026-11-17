/** New versus repeat visitors, matched on contact number. */
export default function VisitorMix({ visitors = { unique: 0, repeat: 0, newVisitors: 0 } }) {
  const total = Math.max(1, visitors.unique);
  const repeatShare = visitors.unique ? visitors.repeat / total : 0;
  const circumference = 2 * Math.PI * 54;

  return (
    <section className="emf-card min-w-0 p-5">
      <h3 className="text-[15px] font-semibold text-[var(--ink)]">New vs repeat visitors</h3>
      <p className="mb-4 text-xs text-[var(--muted)]">Matched on contact number, last 30 days</p>

      <div className="flex items-center gap-6">
        <svg viewBox="0 0 140 140" className="h-[132px] w-[132px] flex-none -rotate-90">
          <circle cx="70" cy="70" r="54" fill="none" stroke="var(--field)" strokeWidth="14" />
          <circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke="var(--brand-gold)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${circumference * repeatShare} ${circumference}`}
          />
        </svg>
        <dl className="min-w-0 flex-1 space-y-3 text-sm">
          <div>
            <dt className="text-[var(--muted)]">Returning visitors</dt>
            <dd className="emf-serif text-2xl text-[var(--ink)]">{visitors.repeat}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">First-time visitors</dt>
            <dd className="emf-serif text-2xl text-[var(--ink)]">{visitors.newVisitors}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Unique people</dt>
            <dd className="text-[13px] font-semibold text-[var(--brand-blue)]">{visitors.unique}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}