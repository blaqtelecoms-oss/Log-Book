import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { recordAudit } from "@/lib/admin-fns";
import { useStaffContext } from "@/hooks/useStaffContext";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

/** Reasons stay unique, ordered and instantly reflected in the kiosk dropdown. */
export default function ReasonsView() {
  const queryClient = useQueryClient();
  const { data: staff } = useStaffContext();
  const canWrite = !!staff?.canWrite;
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reasons-all"],
    queryFn: () => base44.entities.VisitReason.list({ sort: "sort_order" }),
  });
  const { data: usage } = useQuery({
    queryKey: ["reason-usage"],
    queryFn: () => base44.entities.Visit.aggregate({ groupBy: "reason" }),
  });

  useEffect(() => {
    if (data?.items) setRows(data.items);
  }, [data]);

  const counts = useMemo(() => {
    const map = new Map();
    (usage?.rows ?? []).forEach((row) => map.set(row.reason, row.count));
    return map;
  }, [usage]);

  async function refresh() {
    queryClient.invalidateQueries({ queryKey: ["reasons-all"] });
    queryClient.invalidateQueries({ queryKey: ["reasons"] });
    queryClient.invalidateQueries({ queryKey: ["kiosk-data"] });
  }

  async function audit(action, summary) {
    await recordAudit({ data: { action, entity: "VisitReason", summary } }).catch(() => {});
  }

  function onDragEnd(result) {
    if (!result.destination || result.destination.index === result.source.index) return;
    const next = [...rows];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    const ordered = next.map((row, i) => ({ ...row, sort_order: i + 1 }));
    setRows(ordered);
    base44.entities
      .bulkUpdate(ordered.map((row) => ({ id: row.id, sort_order: row.sort_order })))
      .then(() => {
        refresh();
        audit("update", "Reordered the visit reasons");
      })
      .catch(() => {
        toast.error("Could not save the new order.");
        refresh();
      });
  }

  async function addReason() {
    const label = draft.trim();
    if (!label) return;
    if (rows.some((r) => r.label.toLowerCase() === label.toLowerCase())) {
      toast.error("That reason already exists.");
      return;
    }
    await base44.entities.VisitReason.create({ label, is_active: true, sort_order: rows.length + 1 });
    setDraft("");
    await audit("create", `Added the visit reason “${label}”`);
    toast.success("Reason added — it is live on the kiosk now.");
    refresh();
  }

  async function saveRename(row) {
    const label = String(row.label ?? "").trim();
    if (!label) return;
    if (rows.some((r) => r.id !== row.id && r.label.toLowerCase() === label.toLowerCase())) {
      toast.error("Another reason already uses that name.");
      return;
    }
    await base44.entities.VisitReason.update(row.id, { label });
    setEditing(null);
    await audit("update", `Renamed a visit reason to “${label}”`);
    toast.success("Reason renamed.");
    refresh();
  }

  async function toggleActive(row) {
    await base44.entities.VisitReason.update(row.id, { is_active: !row.is_active });
    await audit("update", `${row.is_active ? "Deactivated" : "Activated"} the reason “${row.label}”`);
    toast.success(row.is_active ? "Reason hidden from the kiosk." : "Reason is live on the kiosk.");
    refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow="Kiosk content"
        title="Visit purposes"
        subtitle="Drag to reorder. Active purposes appear in the kiosk dropdown straight away."
      />

      {canWrite ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New reason, e.g. Job search"
            className="h-11 min-w-[240px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-blue)]"
          />
          <button
            type="button"
            onClick={addReason}
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-5 text-[13.5px] font-semibold text-white"
          >
            + Add reason
          </button>
        </div>
      ) : null}

      <div className="emf-card p-2">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="emf-skel h-12" />
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="reasons">
              {(dropProvided) => (
                <ul ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="divide-y divide-[var(--line)]">
                  {rows.map((row, index) => (
                    <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={!canWrite}>
                      {(dragProvided) => (
                        <li
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className="flex flex-wrap items-center gap-3 px-3 py-3"
                        >
                          <span {...dragProvided.dragHandleProps} className="text-[var(--muted)]" aria-label="Reorder">
                            <GripVertical className="h-4 w-4" />
                          </span>

                          {editing === row.id ? (
                            <input
                              value={row.label}
                              onChange={(e) => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))}
                              className="h-10 min-w-[200px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 text-sm text-[var(--ink)] outline-none"
                            />
                          ) : (
                            <span className="min-w-[200px] flex-1 text-[14px] font-medium text-[var(--ink)]">{row.label}</span>
                          )}

                          <span className="text-xs text-[var(--muted)]">{counts.get(row.label) ?? 0} uses</span>

                          <button
                            type="button"
                            disabled={!canWrite}
                            onClick={() => toggleActive(row)}
                            className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
                              row.is_active
                                ? "bg-[rgba(15,154,62,.14)] text-[var(--brand-green)]"
                                : "bg-[var(--field)] text-[var(--muted)]"
                            }`}
                          >
                            {row.is_active ? "Active" : "Inactive"}
                          </button>

                          {canWrite ? (
                            editing === row.id ? (
                              <div className="flex gap-2">
                                <button type="button" onClick={() => saveRename(row)} className="text-[12.5px] font-semibold text-[var(--brand-blue)]">
                                  Save
                                </button>
                                <button type="button" onClick={() => setEditing(null)} className="text-[12.5px] font-semibold text-[var(--muted)]">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-3">
                                <button type="button" onClick={() => setEditing(row.id)} className="text-[12.5px] font-semibold text-[var(--brand-blue)]">
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDelete(row)}
                                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--brand-red)]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </button>
                              </div>
                            )
                          ) : null}
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete this reason?"
        body={`“${pendingDelete?.label}” will be removed from the kiosk dropdown. Visits already recorded keep their reason.`}
        confirmLabel="Delete reason"
        onConfirm={async () => {
          await base44.entities.VisitReason.delete(pendingDelete.id);
          await audit("delete", `Deleted the visit reason “${pendingDelete.label}”`);
          setPendingDelete(null);
          toast.success("Reason deleted.");
          refresh();
        }}
      />
    </>
  );
}