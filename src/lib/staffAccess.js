/**
 * The access rules every staff-facing server function shares: who the caller is
 * in the library, which branch scopes them, and the guards that refuse everyone
 * else. Kept in one place so the portal, the member register and the reports can
 * never drift apart.
 */

export function asArray(result) {
  return Array.isArray(result) ? result : (result?.items ?? []);
}

export function denied(message = "Access denied") {
  return Object.assign(new Error(message), { status: 403, code: "FORBIDDEN" });
}

/** Accounts that always hold full, all-branch access. */
const SUPER_ADMIN_EMAILS = ["xolani@blaqmedia.co.za", "blaqtelecoms@gmail.com"];

/**
 * Resolves the caller's library role and branch. Staff hold the platform role
 * `admin`; the granular library role and branch live on their user record. The
 * very first staff member to sign in becomes the super admin.
 */
export async function resolveStaff(db, user, { write = false, superAdmin = false } = {}) {
  const users = asArray(await db.entities.User.list());
  const mine = users.find((u) => u.id === user.id) || users.find((u) => u.email === user.email);
  const email = String(mine?.email ?? user.email ?? "").toLowerCase();
  const platformRole = mine?.role ?? user?.role;
  if (platformRole !== "admin") return { isStaff: false, staffRole: null, branch: null, users, mine };

  let staffRole = mine?.staff_role ?? null;
  if (!staffRole) {
    const anyStaff = users.some((u) => u.staff_role);
    staffRole = SUPER_ADMIN_EMAILS.includes(email) || !anyStaff ? "super_admin" : "admin";
    if (mine) await db.entities.User.update(mine.id, { staff_role: staffRole });
  }

  const branch = mine?.branch ?? null;
  if (superAdmin && staffRole !== "super_admin") throw denied("Only a super admin can do that");
  if (write && staffRole === "viewer") throw denied("Viewers have read-only access");
  return { isStaff: true, staffRole, branch, users, mine };
}

/**
 * Visitor data is scoped to the branch a staff member works at: super admins
 * see every branch, everyone else sees their own branch and nothing else.
 */
export function branchScope(staff, filter = {}) {
  if (staff.staffRole === "super_admin") return filter;
  if (!staff.branch) throw denied("Choose your site before opening the portal");
  return { ...filter, branch: staff.branch };
}

export async function staffGuard(db, user, options) {
  const staff = await resolveStaff(db, user, options);
  if (!staff.isStaff) throw denied();
  return staff;
}