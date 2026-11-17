import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Briefcase, CalendarDays, Clock, ListChecks, Mail, MapPin, Phone, User } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import FloatingField from "@/components/kiosk/FloatingField";
import PrivacyNoticeModal from "@/components/kiosk/PrivacyNoticeModal";
import { clean, nowHHMM, todayISO, validateVisit } from "@/lib/kioskFormat";

const EMPTY = {
  full_name: "",
  address: "",
  contact_number: "",
  email: "",
  town: "",
  reason: "",
  visit_date: "",
  time_in: "",
  consent_given: false,
  website: "",
};

/** The visitor log form: one screen, inline validation, privacy consent. */
export default function KioskForm({ reasons, settings, onSubmit, onBack }) {
  const [fields, setFields] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    setFields((f) => ({ ...f, visit_date: todayISO(), time_in: nowHHMM() }));
  }, []);

  // Idle reset: untouched for idle_reset_seconds, the kiosk returns to the slideshow.
  useEffect(() => {
    const seconds = Number(settings.idle_reset_seconds) || 0;
    if (!seconds) return undefined;
    const id = setTimeout(() => onBack(), seconds * 1000);
    return () => clearTimeout(id);
  }, [fields, settings.idle_reset_seconds, onBack]);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError("");
  };

  const reasonOptions = useMemo(() => (reasons || []).filter((r) => r.is_active !== false), [reasons]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (fields.website) return; // honeypot
    const found = validateVisit(fields, { requireConsent: settings.require_consent !== false });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError("Please complete the highlighted fields to sign in.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await onSubmit({
        full_name: clean(fields.full_name),
        address: clean(fields.address),
        contact_number: clean(fields.contact_number),
        email: clean(fields.email).toLowerCase(),
        town: clean(fields.town),
        reason: fields.reason,
        visit_date: fields.visit_date,
        time_in: fields.time_in,
        consent_given: !!fields.consent_given,
        branch: settings.site_name,
        website: fields.website,
      });
    } catch (err) {
      setSaving(false);
      setFormError("We couldn't save your visit just now. Please check the connection and try again.");
    }
  }

  return (
    <div className="kiosk kiosk--light">
      <div className="kf-head">
        <div className="kf-hrow">
          <button type="button" className="kf-back" onClick={onBack} aria-label="Back to the welcome screen">
            <ArrowLeft />
          </button>
          <BrandMark logoUrl={settings.logo_url} className="kf-logo" />
        </div>
        <h2>
          Sign the <em>log book</em>
        </h2>
        <p>Record your visit to {settings.company_name} in less than a minute.</p>
      </div>

      <div className="kf-scroll">
        <form className="kf-card" onSubmit={handleSubmit} noValidate>
          <FloatingField
            id="kiosk-name"
            label="Name & Surname"
            icon={User}
            autoComplete="name"
            value={fields.full_name}
            onChange={set("full_name")}
            error={errors.full_name}
          />
          <FloatingField
            id="kiosk-address"
            label="Address"
            icon={MapPin}
            autoComplete="street-address"
            value={fields.address}
            onChange={set("address")}
            error={errors.address}
          />
          <FloatingField
            id="kiosk-contact"
            label="Contact Number"
            icon={Phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={fields.contact_number}
            onChange={set("contact_number")}
            error={errors.contact_number}
          />
          <FloatingField
            id="kiosk-email"
            label="Email Address"
            icon={Mail}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={fields.email}
            onChange={set("email")}
            error={errors.email}
          />
          <FloatingField
            id="kiosk-organisation"
            label="Company / Organisation"
            icon={Briefcase}
            autoComplete="organization"
            value={fields.town}
            onChange={set("town")}
            error={errors.town}
          />
          <FloatingField
            id="kiosk-reason"
            label="Purpose of Visit"
            icon={ListChecks}
            as="select"
            value={fields.reason}
            onChange={set("reason")}
            error={errors.reason}
            required
          >
            <option value="" />
            {reasonOptions.map((r) => (
              <option key={r.id ?? r.label} value={r.label}>
                {r.label}
              </option>
            ))}
          </FloatingField>

          <div className="kf-row">
            <FloatingField
              id="kiosk-date"
              label="Date"
              icon={CalendarDays}
              type="date"
              fixed
              value={fields.visit_date}
              onChange={set("visit_date")}
              error={errors.visit_date}
            />
            <FloatingField
              id="kiosk-time"
              label="Time In"
              icon={Clock}
              type="time"
              fixed
              value={fields.time_in}
              onChange={set("time_in")}
              error={errors.time_in}
            />
          </div>

          {settings.require_consent !== false ? (
            <label className="kf-consent">
              <input type="checkbox" checked={fields.consent_given} onChange={set("consent_given")} />
              <span>
                I consent to {settings.company_name} storing my details for the visitor record.{" "}
                <button type="button" onClick={() => setShowNotice(true)}>
                  Read the privacy notice
                </button>
              </span>
            </label>
          ) : null}
          {errors.consent_given ? <span className="kf-err">{errors.consent_given}</span> : null}

          <div className="kf-hp" aria-hidden="true">
            <label htmlFor="kiosk-website">Website</label>
            <input id="kiosk-website" tabIndex={-1} autoComplete="off" value={fields.website} onChange={set("website")} />
          </div>

          <p className="kf-msg" role="alert">
            {formError}
          </p>

          <button type="submit" className="kf-go" disabled={saving}>
            {saving ? "Saving your visit…" : "Submit & Sign In"}
            <ArrowRight />
          </button>
        </form>
      </div>

      <PrivacyNoticeModal
        open={showNotice}
        onClose={() => setShowNotice(false)}
        text={settings.privacy_notice_text}
        companyName={settings.company_name}
      />
    </div>
  );
}