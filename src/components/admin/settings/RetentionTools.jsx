import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { previewRetention, purgeOldVisits, removeDemoVisits, wipeAllVisits } from "@/lib/admin-fns";
import { fetchAllVisits } from "@/lib/visitQuery";
import { EXPORT_COLUMNS } from "@/lib/visitColumns";
import { downloadCsv } from "@/lib/exporters";
import { todayISO } from "@/lib/kioskFormat";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

const field = "h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-blue)]";

/** Data retention and the destructive actions, both behind confirmations. */
export default function RetentionTools({ settings, demoCount = 0, canWrite, isSuperAdmin }) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(settings?.retention_days || 730);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["visits"] });
    queryClient.invalidateQueries({ queryKey: ["demo-count"] });
  }

  async function runPreview() {
    setBusy(true);
    try {
      setPreview(await previewRetention({ data: { days: Number(days) } }));
    } catch {
      toast.error("Could not count the records.");
    } finally {
      setBusy(false);
    }
  }

  async function exportEverything() {
    setBusy(true);
    try {
      const all = await fetchAllVisits({}, "-visit_date");
      downloadCsv(`emfuleni-visits-full-export-${todayISO()}.csv`, all, EXPORT_COLUMNS);
      toast.success(`Exported ${all.length} visits.`);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="emf-card p-6">
        <h2 className="emf-serif text-xl text-[var(--ink)]">Data retention</h2>
        <p className="mb-4 text-xs text-[var(--muted)]">
          Remove visitor records older than the retention window. Preview first — deletion cannot be undone.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Older than (days)
            <input type="number" min="1" max="3650" className={`${field} mt-1`} value={days} onChange={(e) => setDays(e.target.value)} disabled={!canWrite} />
          </label>
          <button
            type="button"
            onClick={runPreview}
            disabled={busy || !canWrite}
            className="h-11 rounded-xl border border-[var(--line)] px-4 text-[13.5px] font-semibold text-[var(--ink)] disabled:opacity-60"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setConfirm({ kind: "retention" })}
            disabled={!preview || preview.count === 0 || !canWrite}
            className="h-11 rounded-xl bg-[var(--brand-red)] px-4 text-[13.5px] font-semibold text-white disabled:opacity-50"
          >
            Delete these records
          </button>
        </div>
        {preview ? (
          <p className="mt-3 text-[13px] text-[var(--ink)]">
            <span className="font-semibold">{preview.count}</span> visit{preview.count === 1 ? "" : "s"} recorded before{" "}
            <span className="font-semibold">{preview.cutoff}</span>.
          </p>
        ) : null}
      </section>

      <section className="emf-card border-[rgba(217,41,28,.4)] p-6">
        <h2 className="emf-serif text-xl text-[var(--brand-red)]">Danger zone</h2>
        <p className="mb-4 text-xs text-[var(--muted)]">
          These actions change or remove visitor data permanently.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportEverything}
            disabled={busy}
            className="h-11 rounded-xl border border-[var(--line)] px-4 text-[13.5px] font-semibold text-[var(--ink)] disabled:opacity-60"
          >
            Export everything (CSV)
          </button>
          <button
            type="button"
            onClick={() => setConfirm({ kind: "demo" })}
            disabled={demoCount === 0 || !canWrite}
            className="h-11 rounded-xl border border-[var(--line)] px-4 text-[13.5px] font-semibold text-[var(--ink)] disabled:opacity-50"
          >
            Remove demo data ({demoCount})
          </button>
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => setConfirm({ kind: "wipe" })}
              disabled={!canWrite}
              className="h-11 rounded-xl bg-[var(--brand-red)] px-4 text-[13.5px] font-semibold text-white disabled:opacity-60"
            >
              Wipe all visit data
            </button>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        open={confirm?.kind === "retention"}
        onClose={() => setConfirm(null)}
        busy={busy}
        title="Delete old visits?"
        body={`${preview?.count ?? 0} records before ${preview?.cutoff ?? ""} will be permanently deleted.`}
        confirmLabel="Delete records"
        requireWord="DELETE"
        onConfirm={async () => {
          setBusy(true);
          try {
            const result = await purgeOldVisits({ data: { days: Number(days) } });
            toast.success(`Deleted ${result.deleted} old visits.`);
            setPreview(null);
            setConfirm(null);
            refresh();
          } catch {
            toast.error("Could not delete those records.");
          } finally {
            setBusy(false);
          }
        }}
      />

      <ConfirmDialog
        open={confirm?.kind === "demo"}
        onClose={() => setConfirm(null)}
        busy={busy}
        title="Remove demo data?"
        body={`${demoCount} sample records created for demonstration will be deleted. Real visits are untouched.`}
        confirmLabel="Remove demo data"
        onConfirm={async () => {
          setBusy(true);
          try {
            const result = await removeDemoVisits();
            toast.success(`Removed ${result.deleted} demo records.`);
            setConfirm(null);
            refresh();
          } catch {
            toast.error("Could not remove the demo data.");
          } finally {
            setBusy(false);
          }
        }}
      />

      <ConfirmDialog
        open={confirm?.kind === "wipe"}
        onClose={() => setConfirm(null)}
        busy={busy}
        title="Wipe all visit data?"
        body="Every visitor record will be permanently deleted. Export first if you need a copy."
        confirmLabel="Wipe everything"
        requireWord="DELETE"
        onConfirm={async () => {
          setBusy(true);
          try {
            const result = await wipeAllVisits({ data: { confirm: "DELETE" } });
            toast.success(`Wiped ${result.deleted} visit records.`);
            setConfirm(null);
            refresh();
          } catch {
            toast.error("Could not wipe the data.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}