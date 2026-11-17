import { DEFAULT_SITES } from "@/lib/branches";
import { clean, isValidEmail, isValidSaPhone, todayISO } from "@/lib/kioskFormat";
import { normaliseCard } from "@/lib/memberFormat";

const field =
  "mt-1 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-blue)]";
const label = "block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]";

export const EMPTY_MEMBER = {
  full_name: "",
  card_number: "",
  address: "",
  contact_number: "",
  email: "",
  town: "",
  branch: "",
  member_since: "",
  active: true,
  notes: "",
};

export function validateMember(fields, sites = DEFAULT_SITES) {
  const errors = {};
  if (!clean(fields.full_name)) errors.full_name = "Enter the visitor's name and surname.";
  if (!normaliseCard(fields.card_number)) errors.card_number = "Enter the number printed under the barcode.";
  if (!clean(fields.address)) errors.address = "Enter the visitor's address.";
  if (!isValidSaPhone(fields.contact_number)) errors.contact_number = "Enter a valid contact number, e.g. 082 123 4567.";
  if (!isValidEmail(fields.email)) errors.email = "Enter a valid email, e.g. name@example.com.";
  if (!clean(fields.town)) errors.town = "Enter the visitor's company or organisation.";
  if (!sites.includes(String(fields.branch ?? "").trim())) errors.branch = "Choose the site that issued the card.";
  if (!fields.member_since) errors.member_since = "Choose the date the card was issued.";
  return errors;
}

/** Add / edit a registered visitor. The card number is what the entrance camera reads. */
export default function MemberForm({ value, onField, errors = {}, sites = DEFAULT_SITES, canChooseSite }) {
  const set = (key) => (e) => {
    const next = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    onField(key, next);
  };
  const err = (key) => (errors[key] ? <span className="mt-1 block text-xs text-[var(--brand-red)]">{errors[key]}</span> : null);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>
        Name &amp; surname
        <input className={field} value={value.full_name} onChange={set("full_name")} placeholder="Thandi Mokoena" />
        {err("full_name")}
      </label>

      <label className={label}>
        Card number
        <input
          className={`${field} font-mono`}
          value={value.card_number}
          onChange={set("card_number")}
          placeholder="VIS-985657"
        />
        {err("card_number")}
      </label>

      <label className={label}>
        Card issued
        <input type="date" className={field} value={value.member_since || todayISO()} onChange={set("member_since")} />
        {err("member_since")}
      </label>

      <label className={`${label} sm:col-span-2`}>
        Address
        <input className={field} value={value.address} onChange={set("address")} placeholder="12 Church Street, Johannesburg" />
        {err("address")}
      </label>

      <label className={label}>
        Contact number
        <input className={field} value={value.contact_number} onChange={set("contact_number")} placeholder="082 123 4567" />
        {err("contact_number")}
      </label>

      <label className={label}>
        Email
        <input type="email" className={field} value={value.email} onChange={set("email")} placeholder="name@example.com" />
        {err("email")}
      </label>

      <label className={label}>
        Company / organisation
        <input className={field} value={value.town} onChange={set("town")} placeholder="Acme Holdings" />
        {err("town")}
      </label>

      <label className={label}>
        Issuing site
        <select className={field} value={value.branch} onChange={set("branch")} disabled={!canChooseSite}>
          <option value="" />
          {sites.map((site) => (
            <option key={site} value={site}>
              {site}
            </option>
          ))}
        </select>
        {err("branch")}
      </label>

      <label className={`${label} sm:col-span-2`}>
        Staff notes
        <textarea
          className={`${field} h-20 py-2`}
          value={value.notes}
          onChange={set("notes")}
          placeholder="Optional — e.g. replacement card issued"
        />
      </label>

      <label className="flex items-center gap-2.5 sm:col-span-2">
        <input type="checkbox" className="h-4 w-4 accent-[var(--brand-blue)]" checked={value.active !== false} onChange={set("active")} />
        <span className="text-[13.5px] text-[var(--ink)]">Card is active and can sign the visitor in at the entrance</span>
      </label>
    </div>
  );
}