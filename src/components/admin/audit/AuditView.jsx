import { useState } from "react";
import { Download, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { recordAudit } from "@/lib/admin-fns";
import { downloadCsv } from "@/lib/exporters";
import { formatDateTime, todayISO } from "@/lib/kioskFormat";
import PageHeader from "@/components/admin/PageHeader";

const ACTIONS = ["create", "update", "delete", "export", "login", "settings_change"];

const ACTION_TONE = {
  create: "bg-[rgba(15,154,62,.14)] text-[var(--brand-green)]",
  update: "bg-[rgba(11,94,168,.12)] text-[var(--brand-blue)]",
  delete: "bg-[rgba(217,41,28,.12)] text-[var(--brand-red)]",
  export: "bg-[rgba(232,195,106,.25)] text-[var(--brand-gold-deep)]",
  login: "bg-[var(--field)] text-[var(--muted)]",
  settings_change: "bg-[rgba(11,94,168,.12)] text-[var(--brand-blue)]",
};

const AUDIT_COLUMNS = [
  { key: "created_date", header: "When", value: (row) => formatDateTime(row.created_date) },
  { key: "actor_email", header: "Admin" },
  { key: "action", header: "Action" },
  { key: "entity", header: "Entity" },
  { key: "summary", header: "Summary" },
];

export default function AuditView() {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");

  const filter = action ? { action } : {};
  const { data, isLoading } = useQuery({
    queryKey: ["audit", action],
    queryFn: () => base44.entities.AuditLog.filter(filter, { sort: "-created_date", limit: 200 }),
  });

  const rows = (data?.items ?? []).filter((row) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return `${row.summary} ${row.actor_email} ${row.entity}`.toLowerCase().includes(needle);
  });

  return (
    <>
      <PageHeader eyebrow="Accountability" title="Audit log" subtitle="Every staff action on visitor data, newest first.">
        <button
          type="button"
          onClick={async () => {
            downloadCsv(`emfuleni-audit-${todayISO()}.csv`, rows, AUDIT_COLUMNS);
            await recordAudit({
              data: { action: "export", entity: "AuditLog", summary: `Exported ${rows.length} audit entries (CSV)` },
            }).catch(() => {});
          }}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-[13.5px] font-semibold text-[var(--ink)]"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3">
          <Search className="h-4 w-4 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search summaries, admins…"
            className="w-full bg-transparent text-[13.5px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-11 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-[13.5px] text-[var(--ink)]"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="emf-card overflow-auto emf-scrollbar">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead>
            <tr>
              {["When", "Admin", "Action", "Summary"].map((h) => (
                <th key={h} className="border-b border-[var(--line)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6">
                  <div className="emf-skel h-8" />
                  <div className="emf-skel mt-2 h-8" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-[var(--muted)]">
                  No audit entries match this filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--field)]">
                  <td className="whitespace-nowrap border-b border-[var(--line)] px-4 py-3 text-[var(--muted)]">
                    {formatDateTime(row.created_date)}
                  </td>
                  <td className="border-b border-[var(--line)] px-4 py-3 text-[var(--ink)]">{row.actor_email}</td>
                  <td className="border-b border-[var(--line)] px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${ACTION_TONE[row.action] ?? ACTION_TONE.login}`}>
                      {row.action}
                    </span>
                  </td>
                  <td className="border-b border-[var(--line)] px-4 py-3 text-[var(--ink)]">{row.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">Showing the latest 200 entries.</p>
    </>
  );
}