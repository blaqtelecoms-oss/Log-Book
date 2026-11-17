const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// getUTCDay() is Sunday-first; draw Monday-first.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Busiest hours: weekday by hour, darker means busier. */
export default function BusyHoursHeatmap({ matrix = [] }) {
  const max = Math.max(1, ...matrix.flat());

  return (
    <section className="emf-card min-w-0 p-5">
      <h3 className="text-[15px] font-semibold text-[var(--ink)]">Busiest hours</h3>
      <p className="mb-4 text-xs text-[var(--muted)]">Sign-ins by weekday and hour, last 30 days</p>

      <div className="overflow-x-auto emf-scrollbar">
        <div className="min-w-[560px]">
          <div className="mb-1 flex gap-[3px] pl-9">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="w-[18px] text-center text-[9px] text-[var(--muted)]">
                {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
              </span>
            ))}
          </div>
          {ORDER.map((dayIndex, row) => (
            <div key={dayIndex} className="mb-[3px] flex items-center gap-[3px]">
              <span className="w-8 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {DAYS[row]}
              </span>
              {Array.from({ length: 24 }, (_, h) => {
                const value = matrix[dayIndex]?.[h] ?? 0;
                const alpha = value === 0 ? 0 : 0.14 + (value / max) * 0.86;
                return (
                  <span
                    key={h}
                    title={`${DAYS[row]} ${String(h).padStart(2, "0")}:00 · ${value} visit${value === 1 ? "" : "s"}`}
                    className="h-[18px] w-[18px] rounded-[4px]"
                    style={{
                      background: value === 0 ? "var(--field)" : `rgba(11,94,168,${alpha.toFixed(2)})`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}