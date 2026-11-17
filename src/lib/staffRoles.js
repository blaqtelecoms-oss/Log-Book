export const STAFF_ROLES = {
  super_admin: { label: "Super admin", hint: "Everything, including managing staff" },
  admin: { label: "Admin", hint: "Full control of visits, content and settings" },
  viewer: { label: "Viewer", hint: "Read-only dashboards and exports" },
};

export function isSuperAdmin(role) {
  return role === "super_admin";
}

export function canWrite(role) {
  return role === "super_admin" || role === "admin";
}

export function roleLabel(role) {
  return STAFF_ROLES[role]?.label ?? "No access";
}