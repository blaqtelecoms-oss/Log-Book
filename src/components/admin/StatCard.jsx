/** One KPI: a label, a big serif number and how it moved against the last period. */
export default function StatCard({ label, value, delta, hint, tone = "plain" }) {
  const featured = tone === "gold";
  const up = typeof delta === "number" ? delta >= 0 : null;

  return (
    <div
      className={
        featured
          ? "rounded-2xl bg-[linear-gradient(135deg,#06182f,#0b4a86)] p-5 text-white shadow-[var(--soft-shadow)]"
          : "emf-card p-5"
      }
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${featured ? "text-[var(--brand-gold)]" : "text-[var(--muted)]"}`}
      >
        {label}
      </p>
      <p className={`emf-serif mt-2 text-[34px] leading-none ${featured ? "text-white" : "text-[var(--ink)]"}`}>{value}</p>
      {delta !== undefined && delta !== null ? (
        <p className={`mt-2 text-xs font-semibold ${up ? "text-[var(--brand-green)]" : "text-[var(--brand-red)]"}`}>
          {up ? "▲" : "▼"} {Math.abs(delta)}% vs previous period
        </p>
      ) : null}
      {hint ? (
        <p className={`mt-2 text-xs ${featured ? "text-white/70" : "text-[var(--muted)]"}`}>{hint}</p>
      ) : null}
    </div>
  );
}