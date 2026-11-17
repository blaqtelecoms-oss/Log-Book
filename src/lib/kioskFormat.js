/** Text, date and phone helpers shared by the kiosk and the admin portal. */

export const SAST = "Africa/Johannesburg";

export function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** YYYY-MM-DD for today in South African time. */
export function todayISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
}

/** HH:mm right now in South African time. */
export function nowHHMM(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SAST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** "26 Oct 2026" from a YYYY-MM-DD string, without timezone drift. */
export function formatDate(value) {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(value);
  return `${pad2(d)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${y}`;
}

/** "26 Oct 2026, 09:12" for a timestamp. */
export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: SAST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${formatDate(todayISO(d))}, ${time}`;
}

export function shiftDays(days, from = new Date()) {
  const d = new Date(from.getTime() + days * 86400000);
  return todayISO(d);
}

/** Trim, collapse whitespace and drop angle brackets. */
export function clean(value) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 10 digits starting 0, or +27 followed by 9 digits; spaces, dashes and brackets allowed. */
export function isValidSaPhone(value) {
  const digits = String(value ?? "").replace(/[\s\-()]/g, "");
  return /^0\d{9}$/.test(digits) || /^\+27\d{9}$/.test(digits);
}

/** A practical email check: something@something.tld. */
export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(value ?? "").trim());
}

/** Splits "*emphasis*" markers into plain/emphasised chunks for rendering. */
export function splitEmphasis(text) {
  const parts = [];
  String(text ?? "")
    .split(/(\*[^*]+\*)/g)
    .forEach((chunk) => {
      if (!chunk) return;
      if (chunk.startsWith("*") && chunk.endsWith("*") && chunk.length > 2) {
        parts.push({ text: chunk.slice(1, -1), em: true });
      } else {
        parts.push({ text: chunk, em: false });
      }
    });
  return parts;
}

export function validateVisit(fields, { requireConsent = true } = {}) {
  const errors = {};
  if (!clean(fields.full_name)) errors.full_name = "Please enter your name and surname.";
  if (!clean(fields.address)) errors.address = "Please enter your address.";
  if (!String(fields.contact_number ?? "").trim()) errors.contact_number = "Please enter your contact number.";
  else if (!isValidSaPhone(fields.contact_number)) {
    errors.contact_number = "Enter a valid SA number, e.g. 082 123 4567.";
  }
  if (!String(fields.email ?? "").trim()) errors.email = "Please enter your email address.";
  else if (!isValidEmail(fields.email)) errors.email = "Enter a valid email, e.g. name@example.com.";
  if (!fields.town) errors.town = "Please enter your company or organisation.";
  if (!fields.reason) errors.reason = "Please choose a reason for your visit.";
  if (!fields.visit_date) errors.visit_date = "Please choose a date.";
  if (!fields.time_in) errors.time_in = "Please choose a time.";
  if (requireConsent && !fields.consent_given) errors.consent_given = "Please tick the consent box to continue.";
  return errors;
}

export function applyWelcomeMessage(template, name) {
  const tpl = template || "Welcome, {name}";
  const [before, after = ""] = tpl.replace("{name}", "\u0000").split("\u0000");
  return { before, name, after };
}