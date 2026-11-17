import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DEFAULT_SITES } from "@/lib/branches";
import { clean, formatDateTime, isValidSaPhone, nowHHMM, todayISO, validateVisit } from "@/lib/kioskFormat";

const field = "mt-1 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-blue)]";
const label = "text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]";

function blank() {
  return {
    full_name: "",
    address: "",
    contact_number: "",
    email: "",
    town: "",
    reason: "",
    visit_date: todayISO(),
    time_in: nowHHMM(),
    time_out: "",
    branch: "",
    status: "active",
    consent_given: false,
    notes: "",
  };
}

/** Side panel to view, edit or add a visit. */
export default function VisitDrawer({
  open,
  mode,
  visit,
  reasons,
  canWrite,
  isSuperAdmin,
  staffBranch,
  sites = DEFAULT_SITES,
  saving,
  onClose,
  onModeChange,
  onSave,
}) {
  const [fields, setFields] = useState(blank);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (mode === "create" || !visit) setFields({ ...blank(), branch: isSuperAdmin ? "" : staffBranch });
    else setFields({ ...blank(), ...visit });
  }, [open, mode, visit, isSuperAdmin, staffBranch]);

  if (!open) return null;
  const readOnly = mode === "view";

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function submit(e) {
    e.preventDefault();
    const found = validateVisit(fields, { requireConsent: mode === "create" });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({
      full_name: clean(fields.full_name),
      address: clean(fields.address),
      contact_number: clean(fields.contact_number),
      email: clean(fields.email).toLowerCase(),
      town: fields.town,
      reason: fields.reason,
      visit_date: fields.visit_date,
      time_in: fields.time_in,
      time_out: fields.time_out || "",
      branch: clean(fields.branch),
      status: fields.status,
      consent_given: !!fields.consent_given,
      notes: clean(fields.notes),
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[rgba(6,24,47,.5)]" onClick={onClose}>
      <form
        className="h-full w-full max-w-[460px] overflow-y-auto bg-[var(--card)] p-6 emf-scrollbar"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <span className="emf-eyebrow emf-eyebrow--dark">Visit</span>
            <h2 className="emf-serif mt-1 text-2xl text-[var(--ink)]">
              {mode === "create" ? "Add a visit" : mode === "edit" ? "Edit visit" : "Visit details"}
            </h2>
            {visit?.created_date ? (
              <p className="mt-1 text-xs text-[var(--muted)]">Recorded {formatDateTime(visit.created_date)}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--field)]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className={`${label} block`}>
            Name & Surname
            <input className={field} value={fields.full_name} onChange={set("full_name")} readOnly={readOnly} />
            {errors.full_name ? <span className="mt-1 block text-xs font-normal normal-case text-[var(--brand-red)]">{errors.full_name}</span> : null}
          </label>
          <label className={`${label} block`}>
            Address
            <input className={field} value={fields.address} onChange={set("address")} readOnly={readOnly} />
            {errors.address ? <span className="mt-1 block text-xs font-normal normal-case text-[var(--brand-red)]">{errors.address}</span> : null}
          </label>
          <label className={`${label} block`}>
            Contact number
            <input className={field} value={fields.contact_number} onChange={set("contact_number")} readOnly={readOnly} />
            {errors.contact_number || (fields.contact_number && !isValidSaPhone(fields.contact_number)) ? (
              <span className="mt-1 block text-xs font-normal normal-case text-[var(--brand-red)]">
                {errors.contact_number ?? "Enter a valid SA number, e.g. 082 123 4567."}
              </span>
            ) : null}
          </label>
          <label className={`${label} block`}>
            Email
            <input type="email" className={field} value={fields.email} onChange={set("email")} readOnly={readOnly} />
            {errors.email ? <span className="mt-1 block text-xs font-normal normal-case text-[var(--brand-red)]">{errors.email}</span> : null}
          </label>
          <label className={`${label} block`}>
            Company / organisation
            <input className={field} value={fields.town} onChange={set("town")} readOnly={readOnly} />
            {errors.town ? <span className="mt-1 block text-xs font-normal normal-case text-[var(--brand-red)]">{errors.town}</span> : null}
          </label>
          <label className={`${label} block`}>
            Purpose of visit
            <select className={field} value={fields.reason} onChange={set("reason")} disabled={readOnly}>
              <option value="">Choose a purpose</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className={`${label} block`}>
              Date
              <input type="date" className={field} value={fields.visit_date} onChange={set("visit_date")} readOnly={readOnly} />
            </label>
            <label className={`${label} block`}>
              Time in
              <input type="time" className={field} value={fields.time_in} onChange={set("time_in")} readOnly={readOnly} />
            </label>
            <label className={`${label} block`}>
              Time out
              <input type="time" className={field} value={fields.time_out} onChange={set("time_out")} readOnly={readOnly} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={`${label} block`}>
              Site
              <select className={field} value={fields.branch} onChange={set("branch")} disabled={readOnly || !isSuperAdmin}>
                <option value="">Choose a site</option>
                {sites.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${label} block`}>
              Status
              <select className={field} value={fields.status} onChange={set("status")} disabled={readOnly}>
                <option value="active">active</option>
                <option value="flagged">flagged</option>
                <option value="archived">archived</option>
              </select>
            </label>
          </div>
          <label className={`${label} block`}>
            Internal notes
            <textarea
              className={`${field} h-24 py-2`}
              value={fields.notes}
              onChange={set("notes")}
              readOnly={readOnly}
              placeholder="Staff only — never shown to visitors"
            />
          </label>
          <label className="flex items-start gap-2 text-[12.5px] text-[var(--muted)]">
            <input type="checkbox" checked={fields.consent_given} onChange={set("consent_given")} disabled={readOnly} className="mt-0.5 h-4 w-4 accent-[var(--brand-blue)]" />
            <span>Privacy consent recorded for this visitor.</span>
          </label>
          {errors.consent_given ? <span className="block text-xs text-[var(--brand-red)]">{errors.consent_given}</span> : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {readOnly ? (
            <>
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => onModeChange("edit")}
                  className="h-11 rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-5 text-sm font-semibold text-white"
                >
                  Edit this visit
                </button>
              ) : null}
              <button type="button" onClick={onClose} className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-semibold text-[var(--ink)]">
                Close
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : mode === "create" ? "Add visit" : "Save changes"}
              </button>
              <button type="button" onClick={onClose} className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-semibold text-[var(--ink)]">
                Cancel
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}