import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { isSite, sitesFrom } from "@/lib/branches";
import { clean, isValidEmail, isValidSaPhone, todayISO } from "@/lib/kioskFormat";
import { normaliseCard } from "@/lib/memberFormat";
import { asArray, branchScope, denied, staffGuard } from "@/lib/staffAccess";

const PAGE_SIZE = 25;

function searchFilter(staff, search) {
  const filter = branchScope(staff);
  const needle = clean(search ?? "");
  if (!needle) return filter;
  const rx = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const like = { $regex: rx, $options: "i" };
  return {
    ...filter,
    $or: [{ full_name: like }, { card_number: like }, { email: like }, { contact_number: like }, { town: like }],
  };
}

/** The library's members — super admins see every branch, everyone else their own. */
export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .validator(
    z.object({
      search: z.string().max(120).optional(),
      cursor: z.string().max(300).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await staffGuard(db, context.user);
    const filter = searchFilter(staff, data.search);

    const page = await db.entities.Member.filter(filter, {
      sort: "full_name",
      limit: PAGE_SIZE,
      ...(data.cursor ? { cursor: data.cursor } : {}),
    });
    const total = await db.entities.Member.count(filter).catch(() => 0);

    return {
      items: asArray(page),
      total,
      next_cursor: page?.next_cursor ?? null,
      has_more: !!page?.has_more,
      branch: staff.branch ?? "",
      isSuperAdmin: staff.staffRole === "super_admin",
    };
  });

/** Adds or updates one member card. The card number is unique across the library. */
export const saveMember = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().max(80).optional(),
      full_name: z.string().min(2).max(120),
      card_number: z.string().min(2).max(40),
      address: z.string().min(2).max(240),
      contact_number: z.string().min(6).max(30),
      email: z.string().min(5).max(160),
      town: z.string().min(2).max(60),
      branch: z.string().max(60),
      member_since: z.string().max(10).optional(),
      active: z.boolean().optional(),
      notes: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await staffGuard(db, context.user, { write: true });

    const card = normaliseCard(data.card_number);
    if (!card) throw denied("Enter the number printed under the barcode on the card");
    if (!clean(data.town)) throw denied("Enter the visitor's company or organisation");
    if (!isValidSaPhone(data.contact_number)) throw denied("Enter a valid SA contact number");
    if (!isValidEmail(data.email)) throw denied("Enter a valid email address");

    // A site admin can only keep cards issued at their own site.
    const branch = staff.staffRole === "super_admin" ? data.branch : staff.branch;
    const sites = sitesFrom(asArray(await db.entities.Settings.list({ sort: "-updated_date", limit: 1 }))[0]);
    if (!isSite(sites, branch)) throw denied("Choose the site that issued the card");

    if (data.id) {
      const existing = await db.entities.Member.get(data.id).catch(() => null);
      if (!existing) throw Object.assign(new Error("That member no longer exists"), { status: 404 });
      if (staff.staffRole !== "super_admin" && existing.branch !== staff.branch) {
        throw denied("That member belongs to another branch");
      }
    }

    const clash = asArray(await db.entities.Member.filter({ card_number: card }, { limit: 2 })).find(
      (member) => member.id !== data.id,
    );
    if (clash) {
      throw Object.assign(new Error(`Card ${card} is already registered to ${clash.full_name}.`), { status: 409 });
    }

    const record = {
      full_name: clean(data.full_name),
      card_number: card,
      address: clean(data.address),
      contact_number: clean(data.contact_number),
      email: clean(data.email).toLowerCase(),
      town: data.town,
      branch,
      member_since: data.member_since || todayISO(),
      active: data.active !== false,
      notes: clean(data.notes ?? ""),
    };

    const saved = data.id
      ? await db.entities.Member.update(data.id, record)
      : await db.entities.Member.create(record);

    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: data.id ? "update" : "create",
      entity: "Member",
      entity_id: saved?.id ?? data.id ?? "",
      summary: `${data.id ? "Updated" : "Added"} member ${record.full_name} (card ${card})`,
    });

    return { member: saved ?? record };
  });

/** Removes a card. Past visits stay in the log book. */
export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const db = context.getBase44().asServiceRole;
    const staff = await staffGuard(db, context.user, { write: true });

    const existing = await db.entities.Member.get(data.id).catch(() => null);
    if (!existing) throw Object.assign(new Error("That member no longer exists"), { status: 404 });
    if (staff.staffRole !== "super_admin" && existing.branch !== staff.branch) {
      throw denied("That member belongs to another branch");
    }

    await db.entities.Member.delete(data.id);
    await db.entities.AuditLog.create({
      actor_email: context.user.email,
      action: "delete",
      entity: "Member",
      entity_id: data.id,
      summary: `Removed member ${existing.full_name} (card ${existing.card_number})`,
    });
    return { ok: true };
  });