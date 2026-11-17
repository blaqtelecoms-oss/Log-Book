import { useEffect, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { recordAudit } from "@/lib/admin-fns";
import { useStaffContext } from "@/hooks/useStaffContext";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SlideForm from "@/components/admin/slides/SlideForm";
import SlidePreview from "@/components/admin/slides/SlidePreview";

const MIN_ACTIVE = 3;

export default function SlidesView() {
  const queryClient = useQueryClient();
  const { data: staff } = useStaffContext();
  const canWrite = !!staff?.canWrite;
  const [rows, setRows] = useState([]);
  const [editor, setEditor] = useState({ open: false, slide: null });
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["slides"],
    queryFn: () => base44.entities.SlideshowSlide.list({ sort: "sort_order" }),
  });

  useEffect(() => {
    if (data?.items) setRows(data.items);
  }, [data]);

  const activeCount = rows.filter((r) => r.is_active).length;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["slides"] });
    queryClient.invalidateQueries({ queryKey: ["kiosk-data"] });
  }

  async function audit(action, summary) {
    await recordAudit({ data: { action, entity: "SlideshowSlide", summary } }).catch(() => {});
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
        audit("update", "Reordered the slideshow");
      })
      .catch(() => {
        toast.error("Could not save the new order.");
        refresh();
      });
  }

  async function toggleActive(row) {
    if (row.is_active && activeCount <= MIN_ACTIVE) {
      toast.error(`Keep at least ${MIN_ACTIVE} active slides — the kiosk needs them.`);
      return;
    }
    await base44.entities.SlideshowSlide.update(row.id, { is_active: !row.is_active });
    await audit("update", `${row.is_active ? "Hid" : "Activated"} the slide “${row.title || row.eyebrow}”`);
    toast.success(row.is_active ? "Slide hidden from the kiosk." : "Slide is live on the kiosk.");
    refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow="Kiosk content"
        title="Sign-in slideshow"
        subtitle={`Minimum ${MIN_ACTIVE} active slides. Each slide needs a unique, relevant image.`}
      >
        {canWrite ? (
          <button
            type="button"
            onClick={() => setEditor({ open: true, slide: null })}
            className="inline-flex h-11 items-center rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-4 text-[13.5px] font-semibold text-white"
          >
            + Add slide
          </button>
        ) : null}
      </PageHeader>

      <div className={`mb-4 rounded-2xl px-4 py-3 text-[13px] font-semibold ${activeCount >= MIN_ACTIVE ? "bg-[rgba(15,154,62,.12)] text-[var(--brand-green)]" : "bg-[rgba(217,41,28,.12)] text-[var(--brand-red)]"}`}>
        {activeCount} of {rows.length} slides active
        {activeCount < MIN_ACTIVE ? ` — activate at least ${MIN_ACTIVE - activeCount} more.` : ""}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="emf-card p-2">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="emf-skel h-24" />
              ))}
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="slides">
                {(dropProvided) => (
                  <ul ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="divide-y divide-[var(--line)]">
                    {rows.map((row, index) => (
                      <Draggable key={row.id} draggableId={row.id} index={index} isDragDisabled={!canWrite}>
                        {(dragProvided) => (
                          <li ref={dragProvided.innerRef} {...dragProvided.draggableProps} className="flex items-center gap-3 p-3">
                            <span {...dragProvided.dragHandleProps} className="text-[var(--muted)]" aria-label="Reorder">
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <div className="h-[68px] w-[110px] flex-none overflow-hidden rounded-xl bg-[var(--field)]">
                              {row.image_url ? <img src={row.image_url} alt="" className="h-full w-full object-cover" /> : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-semibold text-[var(--ink)]">{row.title || row.eyebrow || "Untitled slide"}</p>
                              <p className="truncate text-xs text-[var(--muted)]">
                                {row.eyebrow} · {row.duration_seconds || 6}s · {row.credit || "no credit"}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={!canWrite}
                              onClick={() => toggleActive(row)}
                              className={`flex-none rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${
                                row.is_active ? "bg-[rgba(15,154,62,.14)] text-[var(--brand-green)]" : "bg-[var(--field)] text-[var(--muted)]"
                              }`}
                            >
                              {row.is_active ? "Active" : "Hidden"}
                            </button>
                            {canWrite ? (
                              <div className="flex flex-none gap-1">
                                <button type="button" onClick={() => setEditor({ open: true, slide: row })} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--field)] hover:text-[var(--brand-blue)]" title="Edit slide">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDelete(row)}
                                  className="rounded-lg p-2 text-[var(--muted)] hover:bg-[rgba(217,41,28,.1)] hover:text-[var(--brand-red)]"
                                  title="Delete slide"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
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

        <SlidePreview slides={rows} />
      </div>

      <SlideForm
        open={editor.open}
        slide={editor.slide}
        canWrite={canWrite}
        onClose={() => setEditor({ open: false, slide: null })}
        onSaved={(verb, title) => {
          audit(verb === "created" ? "create" : "update", `${verb === "created" ? "Added" : "Updated"} the slide “${title}”`);
          refresh();
        }}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete this slide?"
        body={`“${pendingDelete?.title || pendingDelete?.eyebrow}” will be removed from the kiosk slideshow.`}
        confirmLabel="Delete slide"
        onConfirm={async () => {
          if (pendingDelete.is_active && activeCount <= MIN_ACTIVE) {
            toast.error(`Keep at least ${MIN_ACTIVE} active slides.`);
            setPendingDelete(null);
            return;
          }
          await base44.entities.SlideshowSlide.delete(pendingDelete.id);
          await audit("delete", `Deleted the slide “${pendingDelete.title || pendingDelete.eyebrow}”`);
          setPendingDelete(null);
          toast.success("Slide deleted.");
          refresh();
        }}
      />
    </>
  );
}