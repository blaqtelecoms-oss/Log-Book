import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_SITE, isSite, sitesFrom } from "@/lib/branches";
import { FALLBACK_REASONS, FALLBACK_SETTINGS, FALLBACK_SLIDES } from "@/lib/kioskData";
import { clean, isValidEmail, isValidSaPhone, nowHHMM, todayISO } from "@/lib/kioskFormat";
import { CARD_REASON, parseCardScan } from "@/lib/memberFormat";

/** Only these Settings values are ever handed to the public kiosk. */
const PUBLIC_SETTING_KEYS = [
  "company_name",
  "site_name",
  "sites",
  "logo_url",
  "welcome_message",
  "redirect_seconds",
  "idle_reset_seconds",
  "require_consent",
  "privacy_notice_text",
];

function asArray(result) {
  if (Array.isArray(result)) return result;
  return result?.items ?? [];
}

function publicSettings(record) {
  const merged = { ...FALLBACK_SETTINGS };
  PUBLIC_SETTING_KEYS.forEach((key) => {
    if (record?.[key] !== undefined && record[key] !== null && record[key] !== "") merged[key] = record[key];
  });
  return merged;
}

/** Everything the kiosk needs: active slides, active reasons, public settings, today's count. */
export const getKioskData = createServerFn({ method: "GET" }).handler(async ({ context }) => {
  const db = context.getBase44().asServiceRole;
  const [slides, reasons, settingsRows, todayCount] = await Promise.all([
    db.entities.SlideshowSlide.filter({ is_active: true }, { sort: "sort_order" }),
    db.entities.VisitReason.filter({ is_active: true }, { sort: "sort_order" }),
    db.entities.Settings.list({ sort: "-updated_date", limit: 1 }),
    db.entities.Visit.count({ visit_date: todayISO() }).catch(() => 0),
  ]);

  const slideItems = asArray(slides);
  const reasonItems = asArray(reasons);

  return {
    slides: slideItems.length > 0 ? slideItems : FALLBACK_SLIDES,
    reasons: reasonItems.length > 0 ? reasonItems : FALLBACK_REASONS,
    settings: publicSettings(asArray(settingsRows)[0]),
    todayCount,
  };
});

/* Best-effort kiosk rate limiting: a device may sign in ten times a minute. */
const submissions = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

function tooMany(deviceId) {
  const now = Date.now();
  const recent = (submissions.get(deviceId) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  submissions.set(deviceId, recent);
  if (submissions.size > 500) submissions.delete(submissions.keys().next().value);
  return recent.length > MAX_PER_WINDOW;
}

/** A visitor signs the log book. Anonymous by design — the payload is bounded and rate limited. */
export const submitVisit = createServerFn({ method: "POST" })
  .validator(
    z.object({
      full_name: z.string().min(2).max(120),
      address: z.string().min(2).max(240),
      contact_number: z.string().min(6).max(30),
      email: z.string().min(5).max(160),
      town: z.string().min(2).max(60),
      reason: z.string().min(1).max(80),
      visit_date: z.string().min(8).max(10),
      time_in: z.string().min(4).max(5),
      consent_given: z.boolean(),
      branch: z.string().max(80).optional(),
      website: z.string().max(200).optional(),
      device_id: z.string().max(64).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    // Honeypot filled by a bot: accept silently, store nothing.
    if (data.website) return { ok: true, stored: false };

    if (tooMany(data.device_id || "unknown-device")) {
      return { ok: false, reason: "rate_limited", todayCount: 0 };
    }

    const db = context.getBase44().asServiceRole;
    if (!clean(data.full_name) || !isValidSaPhone(data.contact_number) || !isValidEmail(data.email) || !clean(data.town)) {
      return { ok: false, reason: "invalid", todayCount: 0 };
    }

    const reasons = asArray(await db.entities.VisitReason.filter({ is_active: true }, { sort: "sort_order" }));
    const validLabels = (reasons.length > 0 ? reasons : FALLBACK_REASONS).map((r) => r.label);
    if (!validLabels.includes(clean(data.reason))) {
      return { ok: false, reason: "invalid_reason", todayCount: 0 };
    }

    const settings = publicSettings(asArray(await db.entities.Settings.list({ sort: "-updated_date", limit: 1 }))[0]);
    // The kiosk's site decides which staff may see this record, so it is
    // resolved from the company's settings, never trusted from the kiosk.
    const sites = sitesFrom(settings);
    const branch = isSite(sites, settings.site_name) ? clean(settings.site_name) : sites[0] || DEFAULT_SITE;

    await db.entities.Visit.create({
      full_name: clean(data.full_name),
      address: clean(data.address),
      contact_number: clean(data.contact_number),
      email: clean(data.email).toLowerCase(),
      town: clean(data.town),
      reason: clean(data.reason),
      visit_date: data.visit_date,
      time_in: data.time_in,
      branch,
      consent_given: !!data.consent_given,
      status: "active",
      is_demo: false,
    });

    const todayCount = await db.entities.Visit.count({ visit_date: todayISO() }).catch(() => 0);
    return { ok: true, stored: true, todayCount };
  });

/**
 * A member scans the barcode on their library card and is signed in with the
 * details already on their record. Anonymous by design — the same bounded,
 * rate-limited shape as the written log book, and it never returns the
 * library's member list, only whether this one card checked in.
 */
export const signInWithCard = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: z.string().min(2).max(200),
      device_id: z.string().max(64).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    if (tooMany(data.device_id || "unknown-device")) {
      return { ok: false, reason: "rate_limited", todayCount: 0 };
    }

    const db = context.getBase44().asServiceRole;
    const { card, memberId } = parseCardScan(data.code);
    if (!card) return { ok: false, reason: "invalid", todayCount: 0 };

    const member = asArray(await db.entities.Member.filter({ card_number: card }, { limit: 1 }))[0];
    // A card's QR carries the record id as well, so every identifier on the card
    // has to point at the same active member before anyone is signed in.
    if (!member || member.active === false || (memberId && member.id !== memberId)) {
      return { ok: false, reason: "unknown_card", todayCount: 0 };
    }

    const settings = publicSettings(asArray(await db.entities.Settings.list({ sort: "-updated_date", limit: 1 }))[0]);
    // The kiosk's site decides which staff may see this record, so it is
    // resolved from the company's settings, never trusted from the kiosk.
    const sites = sitesFrom(settings);
    const branch = isSite(sites, settings.site_name) ? clean(settings.site_name) : sites[0] || DEFAULT_SITE;

    await db.entities.Visit.create({
      full_name: member.full_name,
      address: member.address || "",
      contact_number: member.contact_number || "",
      email: String(member.email || "").toLowerCase(),
      town: clean(member.town) || branch,
      reason: CARD_REASON,
      visit_date: todayISO(),
      time_in: nowHHMM(),
      branch,
      consent_given: true,
      status: "active",
      is_demo: false,
    });

    const todayCount = await db.entities.Visit.count({ visit_date: todayISO() }).catch(() => 0);
    return { ok: true, stored: true, full_name: member.full_name, todayCount };
  });

/** The configured sites, for the site chooser on the staff sign-in page. */
export const getPublicSites = createServerFn({ method: "GET" }).handler(async ({ context }) => {
  const db = context.getBase44().asServiceRole;
  const rows = asArray(await db.entities.Settings.list({ sort: "-updated_date", limit: 1 }));
  return sitesFrom(rows[0]);
});