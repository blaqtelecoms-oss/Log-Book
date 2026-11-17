/** Visits per day for the last 30 days, drawn with the brand palette. */
export default function VisitsPerDayChart({ data = [] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const label = (iso) => {
    const [, m, d] = String(iso).split("-");
    return `${d}/${m}`;
  };

  return (
    <section className="emf-card min-w-0 p-5">
      <h3 className="text-[15px] font-semibold text-[var(--ink)]">Visits per day</h3>
      <p className="mb-4 text-xs text-[var(--muted)]">Last 30 days</p>
      <div className="flex h-[190px] items-end gap-[4px]">
        {data.map((d, i) => (
          <div
            key={d.date}
            title={`${d.date} · ${d.count} visit${d.count === 1 ? "" : "s"}`}
            className={`flex-1 rounded-t-md ${
              i === data.length - 1
                ? "bg-[linear-gradient(180deg,var(--brand-gold),#c9a14a)]"
                : "bg-[linear-gradient(180deg,var(--brand-blue),#4d9be0)]"
            }`}
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[var(--muted)]">
        <span>{data[0] ? label(data[0].date) : ""}</span>
        <span>{data[Math.floor(data.length / 2)] ? label(data[Math.floor(data.length / 2)].date) : ""}</span>
        <span>Today</span>
      </div>
    </section>
  );
}