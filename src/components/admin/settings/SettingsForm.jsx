import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { saveSettings } from "@/lib/admin-fns";
import { DEFAULT_SITES, sitesFrom } from "@/lib/branches";
import { FALLBACK_SETTINGS } from "@/lib/kioskData";
import BrandMark from "@/components/brand/BrandMark";

const field = "mt-1 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-blue)]";
const label = "text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]";

/** Company branding, kiosk behaviour and privacy configuration. */
export default function SettingsForm({ settings, canWrite, onSaved }) {
  const [fields, setFields] = useState(FALLBACK_SETTINGS);
  const [sitesText, setSitesText] = useState(DEFAULT_SITES.join(", "));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setFields({ ...FALLBACK_SETTINGS, ...settings });
    setSitesText(sitesFrom(settings).join(", "));
  }, [settings]);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFields((f) => ({ ...f, [key]: value }));
  };

  const sites = sitesText
    .split(",")
    .map((site) => site.trim())
    .filter(Boolean);

  async function uploadLogo(file) {
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setFields((f) => ({ ...f, logo_url: file_url }));
      toast.success("Logo uploaded — remember to save.");
    } catch {
      toast.error("Upload failed. Try a smaller PNG or JPG.");
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (sites.length === 0) {
      toast.error("Add at least one site.");
      return;
    }
    setSaving(true);
    try {
      const siteName = sites.includes(fields.site_name) ? fields.site_name : sites[0];
      await saveSettings({
        data: {
          id: settings?.id,
          patch: {
            company_name: fields.company_name,
            site_name: siteName,
            sites,
            logo_url: fields.logo_url ?? "",
            welcome_message: fields.welcome_message,
            redirect_seconds: Number(fields.redirect_seconds) || 5,
            idle_reset_seconds: Number(fields.idle_reset_seconds) || 60,
            require_consent: !!fields.require_consent,
            privacy_notice_text: fields.privacy_notice_text ?? "",
            retention_days: Number(fields.retention_days) || 0,
            contact_email: fields.contact_email ?? "",
            opening_hours: fields.opening_hours ?? "",
          },
        },
      });
      if (siteName !== fields.site_name) setFields((f) => ({ ...f, site_name: siteName }));
      toast.success("Settings saved — the kiosk picks them up immediately.");
      onSaved?.();
    } catch {
      toast.error("Could not save the settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="emf-card p-6" onSubmit={submit}>
      <h2 className="emf-serif text-xl text-[var(--ink)]">Company & kiosk</h2>
      <p className="mb-5 text-xs text-[var(--muted)]">Branding and behaviour of the visitor kiosk.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${label} block`}>
          Company / premises name
          <input className={field} value={fields.company_name} onChange={set("company_name")} disabled={!canWrite} />
        </label>
        <label className={`${label} block`}>
          Kiosk site
          <select className={field} value={fields.site_name} onChange={set("site_name")} disabled={!canWrite}>
            {sites.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] normal-case tracking-normal text-[var(--muted)]">
            Every sign-in at this kiosk is filed under this site.
          </span>
        </label>

        <label className={`${label} block sm:col-span-2`}>
          Sites
          <input className={field} value={sitesText} onChange={(e) => setSitesText(e.target.value)} disabled={!canWrite} />
          <span className="mt-1 block text-[11px] normal-case tracking-normal text-[var(--muted)]">
            Separate each premises with a comma, e.g. Head Office, Warehouse, Cape Town branch.
          </span>
        </label>

        <label className={`${label} block sm:col-span-2`}>
          Welcome message
          <input className={field} value={fields.welcome_message} onChange={set("welcome_message")} disabled={!canWrite} />
          <span className="mt-1 block text-[11px] normal-case tracking-normal text-[var(--muted)]">
            Use {"{name}"} where the visitor's name should appear.
          </span>
        </label>

        <div className="sm:col-span-2">
          <span className={label}>Logo</span>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <BrandMark logoUrl={fields.logo_url} className="h-14 w-14 rounded-xl border border-[var(--line)] p-1.5" />
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-[13.5px] font-semibold text-[var(--ink)]">
              <Upload className="h-4 w-4" /> Upload logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} disabled={!canWrite} />
            </label>
            {fields.logo_url ? (
              <button type="button" onClick={() => setFields((f) => ({ ...f, logo_url: "" }))} className="text-[13px] font-semibold text-[var(--brand-red)]" disabled={!canWrite}>
                Use the built-in mark
              </button>
            ) : null}
          </div>
        </div>

        <label className={`${label} block`}>
          Return to start after (seconds)
          <input type="number" min="1" max="60" className={field} value={fields.redirect_seconds} onChange={set("redirect_seconds")} disabled={!canWrite} />
        </label>
        <label className={`${label} block`}>
          Idle reset (seconds)
          <input type="number" min="5" max="3600" className={field} value={fields.idle_reset_seconds} onChange={set("idle_reset_seconds")} disabled={!canWrite} />
        </label>

        <label className={`${label} block`}>
          Contact email
          <input type="email" className={field} value={fields.contact_email} onChange={set("contact_email")} disabled={!canWrite} />
        </label>
        <label className={`${label} block`}>
          Opening hours
          <input className={field} value={fields.opening_hours} onChange={set("opening_hours")} disabled={!canWrite} />
        </label>

        <label className={`${label} block`}>
          Retention (days · 0 keeps forever)
          <input type="number" min="0" max="3650" className={field} value={fields.retention_days} onChange={set("retention_days")} disabled={!canWrite} />
        </label>
        <label className="flex items-center gap-2 self-end text-[13px] text-[var(--ink)]">
          <input type="checkbox" checked={!!fields.require_consent} onChange={set("require_consent")} className="h-4 w-4 accent-[var(--brand-blue)]" disabled={!canWrite} />
          Require privacy consent on the kiosk
        </label>

        <label className={`${label} block sm:col-span-2`}>
          Privacy notice text
          <textarea
            className={`${field} h-32 py-3`}
            value={fields.privacy_notice_text}
            onChange={set("privacy_notice_text")}
            disabled={!canWrite}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving || !canWrite}
        className="mt-6 h-11 rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-6 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
      {!canWrite ? <p className="mt-3 text-xs text-[var(--muted)]">Viewers can read settings but not change them.</p> : null}
    </form>
  );
}