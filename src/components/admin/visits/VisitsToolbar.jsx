import { useState } from "react";
import { Columns3, Download, Printer, Search, SlidersHorizontal } from "lucide-react";
import { VISIT_COLUMNS } from "@/lib/visitColumns";

const STATUSES = ["active", "flagged", "archived"];

/** Search, filters, column visibility and the export menu for the visits table. */
export default function VisitsToolbar({
  search,
  onPatch,
  reasons,
  branches,
  size,
  hidden,
  onToggleColumn,
  onExport,
  busy,
  loaded,
  isSuperAdmin,
}) {
  const [panels, setPanels] = useState({ filters: false, columns: false, export: false });
  const toggle = (key) => setPanels((p) => ({ ...p, [key]: !p[key] }));
  const field = "h-11 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-[13.5px] text-[var(--ink)]";

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3">
          <Search className="h-4 w-4 flex-none text-[var(--muted)]" />
          <input
            value={search.q ?? ""}
            onChange={(e) => onPatch({ q: e.target.value || undefined })}
            placeholder="Search name, contact, address…"
            className="w-full bg-transparent text-[13.5px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>

        <button type="button" onClick={() => toggle("filters")} className={`${field} inline-flex items-center gap-2 font-semibold`}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </button>
        <button type="button" onClick={() => toggle("columns")} className={`${field} inline-flex items-center gap-2 font-semibold`}>
          <Columns3 className="h-4 w-4" /> Columns
        </button>
        <button
          type="button"
          onClick={() => toggle("export")}
          disabled={busy}
          className={`${field} inline-flex items-center gap-2 font-semibold disabled:opacity-60`}
        >
          <Download className="h-4 w-4" /> {busy ? "Working…" : "Export"}
        </button>
        <button
          type="button"
          onClick={() => onExport("print")}
          className={`${field} inline-flex items-center gap-2 font-semibold`}
        >
          <Printer className="h-4 w-4" /> Print register
        </button>
      </div>

      {panels.filters ? (
        <div className="emf-card flex flex-wrap items-end gap-3 p-4">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            From
            <input type="date" value={search.from ?? ""} onChange={(e) => onPatch({ from: e.target.value || undefined })} className={`${field} mt-1 block`} />
          </label>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            To
            <input type="date" value={search.to ?? ""} onChange={(e) => onPatch({ to: e.target.value || undefined })} className={`${field} mt-1 block`} />
          </label>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Reason
            <select value={search.reason ?? ""} onChange={(e) => onPatch({ reason: e.target.value || undefined })} className={`${field} mt-1 block`}>
              <option value="">All reasons</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Status
            <select value={search.status ?? ""} onChange={(e) => onPatch({ status: e.target.value || undefined })} className={`${field} mt-1 block`}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {isSuperAdmin ? (
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Site
              <select value={search.branch ?? ""} onChange={(e) => onPatch({ branch: e.target.value || undefined })} className={`${field} mt-1 block`}>
                <option value="">All sites</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Rows
            <select value={size} onChange={(e) => onPatch({ size: Number(e.target.value) })} className={`${field} mt-1 block`}>
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => onPatch({ q: undefined, reason: undefined, status: undefined, branch: undefined, from: undefined, to: undefined })}
            className="h-11 rounded-xl px-3 text-[13px] font-semibold text-[var(--brand-blue)]"
          >
            Clear filters
          </button>
        </div>
      ) : null}

      {panels.columns ? (
        <div className="emf-card flex flex-wrap gap-4 p-4">
          {VISIT_COLUMNS.map((col) => (
            <label key={col.key} className="flex items-center gap-2 text-[13px] text-[var(--ink)]">
              <input
                type="checkbox"
                checked={!hidden.includes(col.key)}
                disabled={col.key === "full_name"}
                onChange={() => onToggleColumn(col.key)}
                className="h-4 w-4 accent-[var(--brand-blue)]"
              />
              {col.header}
            </label>
          ))}
        </div>
      ) : null}

      {panels.export ? (
        <div className="emf-card flex flex-wrap gap-2 p-4">
          <button type="button" onClick={() => onExport("csv")} className="rounded-xl bg-[var(--brand-blue)] px-4 py-2.5 text-[13px] font-semibold text-white">
            Export CSV
          </button>
          <button type="button" onClick={() => onExport("excel")} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-[13px] font-semibold text-[var(--ink)]">
            Export for Excel
          </button>
          <button type="button" onClick={() => onExport("print")} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-[13px] font-semibold text-[var(--ink)]">
            Printable register
          </button>
          <span className="self-center text-xs text-[var(--muted)]">
            Covers the current filters · {loaded} row{loaded === 1 ? "" : "s"} shown
          </span>
        </div>
      ) : null}
    </div>
  );
}