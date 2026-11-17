import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { isSite, sitesFrom } from "@/lib/branches";
import { pad2, shiftDays, todayISO } from "@/lib/kioskFormat";
import { asArray, branchScope, denied, resolveStaff, staffGuard } from "@/lib/staffAccess";

const DAY = 86_400_000;

/** The company's configured sites, read fresh so a settings change applies at once. */
async function sitesList(db) {
  const rows = asArray(await db.entities.Settings.list({ sort: "-updated_date", limit: 1 }));
  return sitesFrom(rows[0]);
}

/** Who am I in the library portal? Drives the whole admin shell. */
export const getStaffContext = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await resolveStaff(db, context.user);
    return {
      isStaff: !!staff.isStaff,
      staffRole: staff.staffRole,
      isSuperAdmin: staff.staffRole === "super_admin",
      canWrite: staff.staffRole === "admin" || staff.staffRole === "super_admin",
      branch: staff.branch ?? "",
      email: context.user.email,
      full_name: context.user.full_name ?? "",
    };
  });

/** Every staff mutation and export is recorded here. */
export const recordAudit = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      action: z.enum(["create", "update", "delete", "export", "login", "settings_change"]),
      entity: z.string().max(60).optional(),
      entity_id: z.string().max(80).optional(),
      summary: z.string().min(2).max(300),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    await staffGuard(db, context.user);
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: data.action,
      entity: data.entity ?? "",
      entity_id: data.entity_id ?? "",
      summary: data.summary,
    });
    return { ok: true };
  });

/** A branch admin picks the branch they work at; it scopes everything they see. */
export const setMyBranch = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ branch: z.string().max(60) }))
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await staffGuard(db, context.user);
    const sites = await sitesList(db);
    if (!isSite(sites, data.branch)) throw denied("That is not one of your sites");
    if (!staff.mine) throw denied("We could not find your staff record");
    await db.entities.User.update(staff.mine.id, { branch: data.branch });
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: "update",
      entity: "User",
      entity_id: staff.mine.id,
      summary: `Working from the ${data.branch} site`,
    });
    return { branch: data.branch };
  });

/**
 * The branch picked on the sign-in page is claimed once the session exists.
 * The choice is re-validated here, so a tampered value can never scope anyone.
 */
export const claimMyBranch = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ branch: z.string().max(60) }))
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await staffGuard(db, context.user);
    const sites = await sitesList(db);
    if (!isSite(sites, data.branch)) throw denied("That is not one of your sites");
    if (!staff.mine) throw denied("We could not find your staff record");
    if (staff.branch === data.branch) return { branch: data.branch, changed: false };
    await db.entities.User.update(staff.mine.id, { branch: data.branch });
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: "update",
      entity: "User",
      entity_id: staff.mine.id,
      summary: `Signed in to the portal at the ${data.branch} branch`,
    });
    return { branch: data.branch, changed: true };
  });

/** Dashboard KPIs, charts and the live feed, computed once per refresh. */
export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await staffGuard(db, context.user);
    const scoped = (filter) => branchScope(staff, filter);

    const today = todayISO();
    const monthStart = shiftDays(-29);
    const weekStart = shiftDays(-6);

    const [todayCount, yesterdayCount, weekCount, prevWeekCount, allCount, earliest, latest, monthPage] =
      await Promise.all([
        db.entities.Visit.count(scoped({ visit_date: today })).catch(() => 0),
        db.entities.Visit.count(scoped({ visit_date: shiftDays(-1) })).catch(() => 0),
        db.entities.Visit.count(scoped({ visit_date: { $gte: weekStart } })).catch(() => 0),
        db.entities.Visit.count(scoped({ visit_date: { $gte: shiftDays(-13), $lte: shiftDays(-7) } })).catch(() => 0),
        db.entities.Visit.count(scoped({})).catch(() => 0),
        db.entities.Visit.filter(scoped({}), { sort: "visit_date", limit: 1 }).catch(() => []),
        db.entities.Visit.filter(scoped({}), { sort: "-created_date", limit: 10 }).catch(() => []),
        db.entities.Visit.filter(scoped({ visit_date: { $gte: monthStart } }), { limit: 2000 }).catch(() => []),
      ]);

    const visits = asArray(monthPage);
    const monthCount = visits.length;
    const first = asArray(earliest)[0];
    const spanDays = first?.visit_date
      ? Math.max(1, Math.round((new Date(`${today}T00:00:00Z`) - new Date(`${first.visit_date}T00:00:00Z`)) / DAY) + 1)
      : 1;

    // Visits per day, last 30 days.
    const perDay = new Map();
    for (let i = 29; i >= 0; i -= 1) perDay.set(shiftDays(-i), 0);
    const perReason = new Map();
    const perHourWeekday = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    const perContact = new Map();

    visits.forEach((v) => {
      if (perDay.has(v.visit_date)) perDay.set(v.visit_date, perDay.get(v.visit_date) + 1);
      perReason.set(v.reason || "Unspecified", (perReason.get(v.reason || "Unspecified") || 0) + 1);
      const [h] = String(v.time_in || "").split(":");
      const hour = Number(h);
      if (Number.isFinite(hour) && hour >= 0 && hour < 24 && v.visit_date) {
        const wd = new Date(`${v.visit_date}T00:00:00Z`).getUTCDay();
        perHourWeekday[wd][hour] += 1;
      }
      if (v.contact_number) perContact.set(v.contact_number, (perContact.get(v.contact_number) || 0) + 1);
    });

    const repeatVisitors = [...perContact.values()].filter((n) => n > 1).length;

    return {
      branch: staff.branch,
      isSuperAdmin: staff.staffRole === "super_admin",
      kpis: {
        today: todayCount,
        yesterday: yesterdayCount,
        week: weekCount,
        prevWeek: prevWeekCount,
        month: monthCount,
        allTime: allCount,
        avgPerDay: Math.round((allCount / spanDays) * 10) / 10,
      },
      perDay: [...perDay.entries()].map(([date, count]) => ({ date, count })),
      perReason: [...perReason.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      heatmap: perHourWeekday,
      visitors: { unique: perContact.size, repeat: repeatVisitors, newVisitors: perContact.size - repeatVisitors },
      latest: asArray(latest),
    };
  });

function cutoffFor(days) {
  const d = new Date(Date.now() - Number(days) * DAY);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export const previewRetention = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(z.object({ days: z.number().int().min(1).max(3650) }))
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await staffGuard(db, context.user, { write: true });
    const cutoff = cutoffFor(data.days);
    const count = await db.entities.Visit.count(branchScope(staff, { visit_date: { $lt: cutoff } })).catch(() => 0);
    return { count, cutoff };
  });

export const purgeOldVisits = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ days: z.number().int().min(1).max(3650) }))
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await staffGuard(db, context.user, { write: true });
    const cutoff = cutoffFor(data.days);
    const scope = branchScope(staff, { visit_date: { $lt: cutoff } });
    const count = await db.entities.Visit.count(scope).catch(() => 0);
    await db.entities.Visit.deleteMany(scope);
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: "delete",
      entity: "Visit",
      summary: `Deleted ${count} visits older than ${data.days} days (before ${cutoff})`,
    });
    return { deleted: count };
  });

export const removeDemoVisits = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await staffGuard(db, context.user, { write: true });
    const scope = branchScope(staff, { is_demo: true });
    const count = await db.entities.Visit.count(scope).catch(() => 0);
    await db.entities.Visit.deleteMany(scope);
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: "delete",
      entity: "Visit",
      summary: `Removed ${count} demo visit records`,
    });
    return { deleted: count };
  });

export const wipeAllVisits = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ confirm: z.string().max(20) }))
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    await staffGuard(db, context.user, { superAdmin: true });
    if (data.confirm !== "DELETE") throw denied("Type DELETE to confirm");
    const count = await db.entities.Visit.count({}).catch(() => 0);
    await db.entities.Visit.deleteMany({});
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: "delete",
      entity: "Visit",
      summary: `Wiped all visitor data (${count} records)`,
    });
    return { deleted: count };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().max(80).optional(),
      patch: z.object({
        company_name: z.string().min(2).max(120),
        site_name: z.string().max(120),
        sites: z.array(z.string().min(1).max(80)).min(1).max(50),
        logo_url: z.string().max(500),
        welcome_message: z.string().min(2).max(160),
        redirect_seconds: z.number().min(1).max(60),
        idle_reset_seconds: z.number().min(5).max(3600),
        require_consent: z.boolean(),
        privacy_notice_text: z.string().max(4000),
        retention_days: z.number().min(0).max(3650),
        contact_email: z.string().max(160),
        opening_hours: z.string().max(240),
      }),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    await staffGuard(db, context.user, { write: true });
    const saved = data.id
      ? await db.entities.Settings.update(data.id, data.patch)
      : await db.entities.Settings.create(data.patch);
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: "settings_change",
      entity: "Settings",
      entity_id: saved?.id ?? "",
      summary: "Updated company settings and kiosk behaviour",
    });
    return saved;
  });

/* ------------------------------ staff directory ------------------------------ */

export const getStaffDirectory = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await staffGuard(db, context.user, { superAdmin: true });
    const logins = asArray(await db.entities.AuditLog.filter({ action: "login" }, { sort: "-created_date", limit: 300 }));
    const lastLogin = new Map();
    logins.forEach((entry) => {
      if (entry.actor_email && !lastLogin.has(entry.actor_email)) lastLogin.set(entry.actor_email, entry.created_date);
    });
    return {
      staff: staff.users
        .filter((u) => u.role === "admin" || u.staff_role)
        .map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name ?? "",
          active: u.role === "admin",
          staff_role: u.staff_role ?? (u.role === "admin" ? "admin" : null),
          branch: u.branch ?? "",
          created_date: u.created_date,
          last_login: lastLogin.get(u.email) ?? null,
        }))
        .sort((a, b) => String(a.full_name || a.email).localeCompare(String(b.full_name || b.email))),
      me: context.user.email,
    };
  });

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      email: z.string().email().max(160),
      staff_role: z.enum(["super_admin", "admin", "viewer"]),
    }),
  )
  .handler(async ({ data, context }) => {
    const base44 = context.getBase44();
    const db = base44.asServiceRole;
    await staffGuard(db, context.user, { superAdmin: true });
    const users = asArray(await db.entities.User.list());
    const invited = users.find((u) => String(u.email || "").toLowerCase() === data.email.toLowerCase());
    // Sending the invite needs the signed-in super admin; the app users API is not on the service-role client.
    try {
      await base44.users.inviteUser(data.email, "admin");
    } catch (error) {
      // Someone who already has a portal account cannot be invited again — their record is updated below instead.
      if (!invited) {
        throw Object.assign(new Error(error?.message || "The invite could not be sent"), { status: error?.status ?? 400 });
      }
    }
    // The platform invite takes the elevated role; the library role rides on the user record.
    if (invited) await db.entities.User.update(invited.id, { staff_role: data.staff_role, role: "admin" });
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: "create",
      entity: "User",
      entity_id: invited?.id ?? "",
      summary: `Invited ${data.email} as ${data.staff_role}`,
    });
    return { ok: true, pending: !invited };
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      user_id: z.string().min(1).max(80),
      staff_role: z.enum(["super_admin", "admin", "viewer"]).optional(),
      active: z.boolean().optional(),
      branch: z.string().max(60).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    await staffGuard(db, context.user, { superAdmin: true });
    if (data.user_id === context.user.id) throw denied("You cannot change your own access");

    const patch = {};
    if (data.staff_role) patch.staff_role = data.staff_role;
    if (typeof data.active === "boolean") patch.role = data.active ? "admin" : "user";
    if (typeof data.branch === "string") {
      if (data.branch) {
        const sites = await sitesList(db);
        if (!isSite(sites, data.branch)) throw denied("That is not one of your sites");
      }
      patch.branch = data.branch;
    }
    await db.entities.User.update(data.user_id, patch);
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: "update",
      entity: "User",
      entity_id: data.user_id,
      summary: `Updated staff access (${JSON.stringify(patch)})`,
    });
    return { ok: true };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ user_id: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    await staffGuard(db, context.user, { superAdmin: true });
    if (data.user_id === context.user.id) throw denied("You cannot remove your own access");
    await db.entities.User.delete(data.user_id);
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: "delete",
      entity: "User",
      entity_id: data.user_id,
      summary: "Removed a staff member from the portal",
    });
    return { ok: true };
  });