import { useEffect, useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import Modal from "@/components/admin/Modal";

const field = "mt-1 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-blue)]";
const label = "text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]";

const EMPTY = {
  eyebrow: "",
  title: "",
  subtitle: "",
  image_url: "",
  image_alt: "",
  credit: "",
  duration_seconds: 6,
  is_active: true,
};

/** Create or edit one slideshow slide, with a live image check. */
export default function SlideForm({ open, slide, canWrite, onClose, onSaved }) {
  const [fields, setFields] = useState(EMPTY);
  const [imageOk, setImageOk] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFields({ ...EMPTY, ...(slide ?? {}) });
    setImageOk(null);
  }, [open, slide]);

  useEffect(() => {
    if (!fields.image_url) {
      setImageOk(null);
      return undefined;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setImageOk(true);
    img.onerror = () => !cancelled && setImageOk(false);
    img.src = fields.image_url;
    return () => {
      cancelled = true;
    };
  }, [fields.image_url]);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFields((f) => ({ ...f, [key]: value }));
  };

  async function upload(file) {
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setFields((f) => ({ ...f, image_url: file_url }));
      toast.success("Image uploaded.");
    } catch {
      toast.error("Upload failed. Try again or paste an image URL.");
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!fields.image_url.trim()) {
      toast.error("A slide needs an image.");
      return;
    }
    setSaving(true);
    const payload = {
      ...fields,
      title: fields.title.trim(),
      duration_seconds: Number(fields.duration_seconds) || 6,
    };
    try {
      if (slide?.id) await base44.entities.SlideshowSlide.update(slide.id, payload);
      else await base44.entities.SlideshowSlide.create({ ...payload, sort_order: 99 });
      onSaved(slide?.id ? "updated" : "created", payload.title || payload.eyebrow);
      onClose();
    } catch {
      toast.error("Could not save the slide.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={slide?.id ? "Edit slide" : "Add slide"} width="max-w-2xl">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className={`${label} block`}>
          Eyebrow
          <input className={field} value={fields.eyebrow} onChange={set("eyebrow")} placeholder="Visitor Log Book" />
        </label>
        <label className={`${label} block`}>
          Duration (seconds)
          <input type="number" min="3" max="30" className={field} value={fields.duration_seconds} onChange={set("duration_seconds")} />
        </label>
        <label className={`${label} block sm:col-span-2`}>
          Title
          <input className={field} value={fields.title} onChange={set("title")} placeholder="Welcome to *our premises*" />
          <span className="mt-1 block text-[11px] normal-case tracking-normal text-[var(--muted)]">
            Wrap key words in *asterisks* for the italic gold emphasis.
          </span>
        </label>
        <label className={`${label} block sm:col-span-2`}>
          Subtitle
          <input className={field} value={fields.subtitle} onChange={set("subtitle")} />
        </label>
        <label className={`${label} block sm:col-span-2`}>
          Image URL
          <input className={field} value={fields.image_url} onChange={set("image_url")} placeholder="https://images.unsplash.com/…" />
        </label>
        <label className={`${label} block sm:col-span-2`}>
          Or upload an image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            className="mt-1 block w-full text-[12.5px] text-[var(--muted)]"
          />
        </label>

        {fields.image_url ? (
          <div className="sm:col-span-2">
            <div className="h-40 w-full overflow-hidden rounded-xl bg-[var(--field)]">
              <img src={fields.image_url} alt="" className="h-full w-full object-cover" />
            </div>
            {imageOk === false ? (
              <p className="mt-2 rounded-lg bg-[rgba(217,41,28,.1)] px-3 py-2 text-[12.5px] font-semibold text-[var(--brand-red)]">
                This image failed to load. Check the URL — a broken slide will show a blank background.
              </p>
            ) : null}
          </div>
        ) : null}

        <label className={`${label} block`}>
          Alt text
          <input className={field} value={fields.image_alt} onChange={set("image_alt")} />
        </label>
        <label className={`${label} block`}>
          Credit
          <input className={field} value={fields.credit} onChange={set("credit")} />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[var(--ink)]">
          <input type="checkbox" checked={!!fields.is_active} onChange={set("is_active")} className="h-4 w-4 accent-[var(--brand-blue)]" />
          Active in the kiosk slideshow
        </label>

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-semibold text-[var(--ink)]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !canWrite}
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save slide"}
          </button>
        </div>
      </form>
    </Modal>
  );
}