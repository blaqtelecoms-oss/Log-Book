const PALETTE = ["var(--brand-blue)", "var(--brand-gold)", "var(--brand-green)", "var(--brand-red)", "#4d9be0"];

/** Share of visits by reason, as ranked meters. */
export default function VisitsByReasonChart({ data = [] }) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  const rows = data.slice(0, 6);

  return (
    <section className="emf-card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--ink)]">Visits by reason</h3>
      <p className="mb-4 text-xs text-[var(--muted)]">Last 30 days</p>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">No visits recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {rows.map((row, i) => {
            const pct = total ? Math.round((row.count / total) * 100) : 0;
            return (
              <li key={row.label} className="text-[13.5px]">
                <div className="mb-1.5 flex justify-between gap-3">
                  <span className="truncate text-[var(--ink)]">{row.label}</span>
                  <span className="font-semibold text-[var(--muted)]">
                    {pct}% · {row.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--field)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: PALETTE[i % PALETTE.length] }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}