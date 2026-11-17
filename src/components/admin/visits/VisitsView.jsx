import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useStaffContext } from "@/hooks/useStaffContext";
import { siteLabel, sitesFrom } from "@/lib/branches";
import { buildVisitFilter, fetchAllVisits } from "@/lib/visitQuery";
import { DEFAULT_HIDDEN, EXPORT_COLUMNS, VISIT_COLUMNS } from "@/lib/visitColumns";
import { downloadCsv, downloadExcel, printRegister } from "@/lib/exporters";
import { recordAudit } from "@/lib/admin-fns";
import { nowHHMM, todayISO } from "@/lib/kioskFormat";
import { useAuditedMutation, useVisitsQuery } from "@/hooks/useVisitMutations";
import PageHeader from "@/components/admin/PageHeader";
import VisitsToolbar from "@/components/admin/visits/VisitsToolbar";
import DataTable from "@/components/admin/visits/DataTable";
import VisitDrawer from "@/components/admin/visits/VisitDrawer";
import VisitorHistory from "@/components/admin/visits/VisitorHistory";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function VisitsView({ search }) {
  const navigate = useNavigate();
  const { data: staff } = useStaffContext();
  const canWrite = !!staff?.canWrite;

  const [cursors, setCursors] = useState([undefined]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [selected, setSelected] = useState([]);
  const [hidden, setHidden] = useState(DEFAULT_HIDDEN);
  const [drawer, setDrawer] = useState({ open: false, mode: "view", visit: null });
  const [history, setHistory] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const size = search.size ?? 25;
  const sort = search.sort ?? "-visit_date";
  const filter = useMemo(() => buildVisitFilter(search), [search]);
  const signature = JSON.stringify([filter, sort, size]);

  useEffect(() => {
    setCursors([undefined]);
    setCursorIndex(0);
    setSelected([]);
  }, [signature]);

  useEffect(() => {
    if (search.new === "1") {
      setDrawer({ open: true, mode: "create", visit: null });
      navigate({ to: "/admin/visits", search: (prev) => ({ ...prev, new: undefined }), replace: true });
    }
  }, [search.new, navigate]);

  const { data: reasonsPage } = useQuery({
    queryKey: ["reasons", "active"],
    queryFn: () => base44.entities.VisitReason.filter({ is_active: true }, { sort: "sort_order" }),
  });
  const reasons = reasonsPage?.items ?? [];
  const { data: settings } = useQuery({
    queryKey: ["library-settings"],
    queryFn: async () => {
      const page = await base44.entities.Settings.list({ sort: "-updated_date", limit: 1 });
      return page?.items?.[0] ?? null;
    },
  });
  const branches = sitesFrom(settings);

  const query = useVisitsQuery(filter, { sort, size, cursor: cursors[cursorIndex] });
  const rows = query.data?.items ?? [];
  const canGoNext = !!query.data?.next_cursor;

  const mutate = useAuditedMutation({
    onDone: () => {
      setDrawer({ open: false, mode: "view", visit: null });
      setPendingDelete(null);
      setSelected([]);
    },
  });

  const visibleColumns = VISIT_COLUMNS.filter((c) => !hidden.includes(c.key));

  function patchSearch(patch) {
    navigate({ to: "/admin/visits", search: (prev) => ({ ...prev, ...patch }) });
  }

  async function loadAll() {
    return fetchAllVisits(filter, sort);
  }

  async function runExport(kind) {
    setBusy(true);
    try {
      const all = await loadAll();
      const stamp = todayISO();
      if (kind === "csv") downloadCsv(`visitor-log-${stamp}.csv`, all, EXPORT_COLUMNS);
      if (kind === "excel") downloadExcel(`visitor-log-${stamp}.xls`, all, EXPORT_COLUMNS);
      if (kind === "print") {
        printRegister({
          visits: all,
          columns: EXPORT_COLUMNS.slice(0, 10),
          companyName: settings?.company_name || "Visitor Log Book",
          siteName: staff?.isSuperAdmin ? siteLabel(branches, search.branch) : staff?.branch || "All sites",
          dateLabel: search.from || search.to ? `${search.from ?? "start"} – ${search.to ?? "today"}` : "All records",
        });
      }
      await recordAudit({
        data: {
          action: "export",
          entity: "Visit",
          summary: `Exported ${all.length} visits (${kind})`,
        },
      }).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Records"
        title="Visits"
        subtitle={
          staff?.isSuperAdmin
            ? "Every visitor sign-in and sign-out, across all sites, with search, bulk actions and exports."
            : `Sign-ins recorded at the ${staff?.branch ?? ""} site, with search, bulk actions and exports.`
        }
      >
        {canWrite ? (
          <button
            type="button"
            onClick={() => setDrawer({ open: true, mode: "create", visit: null })}
            className="inline-flex h-11 items-center rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-4 text-[13.5px] font-semibold text-white"
          >
            + Add visit
          </button>
        ) : null}
      </PageHeader>

      <VisitsToolbar
        search={search}
        onPatch={patchSearch}
        reasons={reasons}
        branches={branches}
        size={size}
        hidden={hidden}
        onToggleColumn={(key) => setHidden((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]))}
        onExport={runExport}
        busy={busy}
        loaded={rows.length}
        isSuperAdmin={!!staff?.isSuperAdmin}
      />

      {selected.length > 0 && canWrite ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3">
          <span className="text-[13px] font-semibold text-[var(--ink)]">{selected.length} selected</span>
          <button type="button" className="rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-[12.5px] font-semibold" onClick={() => bulk("archive")}>
            Archive
          </button>
          <button type="button" className="rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-[12.5px] font-semibold" onClick={() => bulk("flagged")}>
            Flag
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--brand-red)]"
            onClick={() => exportSelection()}
          >
            Export selection
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--brand-red)] px-3 py-1.5 text-[12.5px] font-semibold text-white"
            onClick={() => setPendingDelete({ ids: selected, bulk: true })}
          >
            Delete
          </button>
          <button type="button" className="ml-auto text-[12.5px] font-semibold text-[var(--muted)]" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={visibleColumns}
        loading={query.isLoading}
        sort={sort}
        onSort={(key) => patchSearch({ sort: sort === key ? `-${key}` : key })}
        selected={selected}
        onToggleAll={() =>
          setSelected(rows.length > 0 && selected.length === rows.length ? [] : rows.map((r) => r.id))
        }
        onToggleRow={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
        canWrite={canWrite}
        onView={(visit) => setDrawer({ open: true, mode: "view", visit })}
        onEdit={(visit) => setDrawer({ open: true, mode: "edit", visit })}
        onSignOut={(visit) => signOut(visit)}
        onFlag={(visit) =>
          setStatus(visit, visit.status === "flagged" ? "active" : "flagged", visit.status === "flagged" ? "Unflagged" : "Flagged")
        }
        onArchive={(visit) =>
          setStatus(visit, visit.status === "archived" ? "active" : "archived", visit.status === "archived" ? "Restored" : "Archived")
        }
        onHistory={(visit) => setHistory(visit.contact_number)}
        onDelete={(visit) => setPendingDelete({ ids: [visit.id], visit })}
      />

      <div className="mt-4 flex items-center justify-between text-[13px] text-[var(--muted)]">
        <span>Page {cursorIndex + 1}</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={cursorIndex === 0}
            onClick={() => setCursorIndex((i) => Math.max(0, i - 1))}
            className="h-10 rounded-xl border border-[var(--line)] px-4 font-semibold text-[var(--ink)] disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => {
              setCursors((c) => [...c.slice(0, cursorIndex + 1), query.data.next_cursor]);
              setCursorIndex((i) => i + 1);
              setSelected([]);
            }}
            className="h-10 rounded-xl border border-[var(--line)] px-4 font-semibold text-[var(--ink)] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <VisitDrawer
        open={drawer.open}
        mode={drawer.mode}
        visit={drawer.visit}
        reasons={reasons}
        canWrite={canWrite}
        isSuperAdmin={!!staff?.isSuperAdmin}
        staffBranch={staff?.branch ?? ""}
        sites={branches}
        saving={mutate.isPending}
        onClose={() => setDrawer({ open: false, mode: "view", visit: null })}
        onModeChange={(mode) => setDrawer((d) => ({ ...d, mode }))}
        onSave={(payload) => saveVisit(payload)}
      />

      <VisitorHistory contact={history} onClose={() => setHistory(null)} />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        busy={mutate.isPending}
        title={pendingDelete?.bulk ? "Delete selected visits?" : "Delete this visit?"}
        body={`This permanently removes ${pendingDelete?.ids?.length ?? 0} record(s) from the visitor log book.`}
        confirmLabel="Delete"
        onConfirm={() =>
          mutate.mutate({
            action: "delete",
            summary: `Deleted ${pendingDelete?.ids?.length ?? 0} visit record(s)`,
            run: () =>
              base44.entities.Visit.deleteMany({ id: { $in: pendingDelete.ids } }),
          })
        }
      />
    </>
  );

  function bulk(nextStatus) {
    mutate.mutate({
      action: "update",
      summary: `Marked ${selected.length} visit(s) as ${nextStatus}`,
      run: () => base44.entities.Visit.updateMany({ id: { $in: selected } }, { $set: { status: nextStatus } }),
    });
  }

  async function exportSelection() {
    setBusy(true);
    try {
      const all = await fetchAllVisits({ id: { $in: selected } }, sort);
      downloadCsv(`visitor-log-selection-${todayISO()}.csv`, all, EXPORT_COLUMNS);
      await recordAudit({
        data: { action: "export", entity: "Visit", summary: `Exported ${all.length} selected visits (CSV)` },
      }).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  function setStatus(visit, next, label) {
    mutate.mutate({
      action: "update",
      entityId: visit.id,
      summary: `${label} the visit for ${visit.full_name}`,
      run: () => base44.entities.Visit.update(visit.id, { status: next }),
    });
  }

  function signOut(visit) {
    mutate.mutate({
      action: "update",
      entityId: visit.id,
      summary: `Signed out ${visit.full_name}`,
      run: () => base44.entities.Visit.update(visit.id, { time_out: nowHHMM() }),
    });
  }

  function saveVisit(payload) {
    if (drawer.mode === "create") {
      mutate.mutate({
        action: "create",
        summary: `Added a visit for ${payload.full_name}`,
        run: () => base44.entities.Visit.create(payload),
      });
      return;
    }
    mutate.mutate({
      action: "update",
      entityId: drawer.visit.id,
      summary: `Updated the visit for ${payload.full_name}`,
      run: () => base44.entities.Visit.update(drawer.visit.id, payload),
    });
  }
}