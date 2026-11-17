import { Archive, Clock, Eye, Flag, History, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/kioskFormat";

const STATUS_TONE = {
  active: "bg-[rgba(15,154,62,.14)] text-[var(--brand-green)]",
  flagged: "bg-[rgba(217,41,28,.12)] text-[var(--brand-red)]",
  archived: "bg-[var(--field)] text-[var(--muted)]",
};

const iconBtn =
  "rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--field)] hover:text-[var(--brand-blue)]";

function renderCell(col, row) {
  if (col.render) return col.render(row);
  if (col.key === "status") {
    return (
      <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold lowercase ${STATUS_TONE[row.status] ?? STATUS_TONE.active}`}>
        {row.status}
      </span>
    );
  }
  if (col.key === "contact_number" || col.key === "full_name") {
    return <span className="font-medium text-[var(--ink)]">{row[col.key]}</span>;
  }
  if (col.key === "visit_date") return formatDate(row.visit_date);
  return row[col.key] || "—";
}

/** Visits table: sticky header, selection, sorting and row actions. */
export default function DataTable({
  rows,
  columns,
  loading,
  sort,
  onSort,
  selected,
  onToggleAll,
  onToggleRow,
  canWrite,
  onView,
  onEdit,
  onSignOut,
  onFlag,
  onArchive,
  onHistory,
  onDelete,
}) {
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="emf-card overflow-auto emf-scrollbar">
      <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 w-10 border-b border-[var(--line)] bg-[var(--card)] px-4 py-3">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allSelected}
                onChange={onToggleAll}
                className="h-4 w-4 accent-[var(--brand-blue)]"
              />
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className="sticky top-0 z-10 whitespace-nowrap border-b border-[var(--line)] bg-[var(--card)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]"
              >
                {col.sort ? (
                  <button type="button" onClick={() => onSort(col.sort)} className="inline-flex items-center gap-1 uppercase hover:text-[var(--brand-blue)]">
                    {col.header}
                    {sort === col.sort ? " ▲" : sort === `-${col.sort}` ? " ▼" : ""}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
            <th className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--card)] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + 2} className="px-4 py-6">
                <div className="emf-skel h-8" />
                <div className="emf-skel mt-2 h-8" />
                <div className="emf-skel mt-2 h-8" />
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 2} className="px-4 py-14 text-center text-sm text-[var(--muted)]">
                No visits match these filters yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-[var(--field)]">
                <td className="border-b border-[var(--line)] px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.full_name}`}
                    checked={selected.includes(row.id)}
                    onChange={() => onToggleRow(row.id)}
                    className="h-4 w-4 accent-[var(--brand-blue)]"
                  />
                </td>
                {columns.map((col) => (
                  <td key={col.key} className="border-b border-[var(--line)] px-4 py-3 align-top text-[var(--ink)]">
                    {col.key === "contact_number" ? (
                      <button type="button" onClick={() => onHistory(row)} className="font-medium underline decoration-dotted">
                        {row.contact_number}
                      </button>
                    ) : (
                      renderCell(col, row)
                    )}
                  </td>
                ))}
                <td className="border-b border-[var(--line)] px-4 py-3">
                  <div className="flex justify-end gap-0.5">
                    <button type="button" className={iconBtn} title="View details" onClick={() => onView(row)}>
                      <Eye className="h-4 w-4" />
                    </button>
                    {canWrite ? (
                      <>
                        <button type="button" className={iconBtn} title="Edit" onClick={() => onEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" className={iconBtn} title="Record exit time" onClick={() => onSignOut(row)}>
                          <Clock className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          title={row.status === "flagged" ? "Remove flag" : "Flag"}
                          onClick={() => onFlag(row)}
                        >
                          <Flag className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={iconBtn}
                          title={row.status === "archived" ? "Restore" : "Archive"}
                          onClick={() => onArchive(row)}
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                        <button type="button" className={iconBtn} title="Visitor history" onClick={() => onHistory(row)}>
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[rgba(217,41,28,.1)] hover:text-[var(--brand-red)]"
                          title="Delete"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span className="pr-1 text-[11px] text-[var(--muted)]">
                        <Archive className="inline h-3.5 w-3.5" /> read-only
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}