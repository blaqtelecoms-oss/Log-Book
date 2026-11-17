import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStaffDirectory, inviteStaff, removeStaff, updateStaff } from "@/lib/admin-fns";
import { sitesFrom } from "@/lib/branches";
import { base44 } from "@/api/base44Client";
import { STAFF_ROLES, roleLabel } from "@/lib/staffRoles";
import { useStaffContext } from "@/hooks/useStaffContext";
import { formatDateTime } from "@/lib/kioskFormat";
import PageHeader from "@/components/admin/PageHeader";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

const field = "mt-1 h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--field)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-blue)]";

export default function StaffView() {
  const queryClient = useQueryClient();
  const { data: staff } = useStaffContext();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", staff_role: "admin" });
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff-directory"],
    queryFn: () => getStaffDirectory(),
    retry: false,
    enabled: !!staff?.isSuperAdmin,
  });

  const { data: settings } = useQuery({
    queryKey: ["library-settings"],
    queryFn: async () => {
      const page = await base44.entities.Settings.list({ sort: "-updated_date", limit: 1 });
      return page?.items?.[0] ?? null;
    },
    enabled: !!staff?.isSuperAdmin,
  });
  const sites = sitesFrom(settings);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["staff-directory"] });
  }

  if (staff && !staff.isSuperAdmin) {
    return (
      <>
        <PageHeader eyebrow="Access" title="Admins" />
        <div className="emf-card p-8 text-center">
          <p className="text-sm text-[var(--muted)]">Only a super admin can manage staff accounts.</p>
        </div>
      </>
    );
  }

  async function sendInvite() {
    setBusy(true);
    try {
      const result = await inviteStaff({ data: { email: invite.email.trim(), staff_role: invite.staff_role } });
      toast.success(
        result.pending
          ? "Invite sent — set their role once they sign in for the first time."
          : `Invited ${invite.email} as ${roleLabel(invite.staff_role)}.`,
      );
      setInviteOpen(false);
      setInvite({ email: "", staff_role: "admin" });
      refresh();
    } catch (error) {
      toast.error(error?.message || "Could not send that invite. Check the email address.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Access"
        title="Admins"
        subtitle="Invite staff and control what each of them can do."
      >
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex h-11 items-center rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-4 text-[13.5px] font-semibold text-white"
        >
          + Invite staff
        </button>
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {Object.entries(STAFF_ROLES).map(([key, role]) => (
          <div key={key} className="emf-card p-4">
            <p className="text-[13.5px] font-semibold text-[var(--ink)]">{role.label}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{role.hint}</p>
          </div>
        ))}
      </div>

      <div className="emf-card overflow-auto emf-scrollbar">
        <table className="w-full min-w-[720px] text-[13.5px]">
          <thead>
            <tr>
              {["Name", "Email", "Role", "Branch", "Status", "Last login", ""].map((h) => (
                <th key={h} className="border-b border-[var(--line)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Loading staff…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Staff list is available to super admins only.
                </td>
              </tr>
            ) : (data?.staff ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                  No staff accounts yet — invite the front desk team.
                </td>
              </tr>
            ) : (
              (data?.staff ?? []).map((member) => (
                <tr key={member.id} className="hover:bg-[var(--field)]">
                  <td className="border-b border-[var(--line)] px-4 py-3 font-medium text-[var(--ink)]">
                    {member.full_name || "—"}
                    {member.email === data.me ? <span className="ml-2 text-[11px] text-[var(--brand-blue)]">(you)</span> : null}
                  </td>
                  <td className="border-b border-[var(--line)] px-4 py-3 text-[var(--ink)]">{member.email}</td>
                  <td className="border-b border-[var(--line)] px-4 py-3">
                    <select
                      value={member.staff_role ?? "admin"}
                      disabled={member.email === data.me}
                      onChange={async (e) => {
                        try {
                          await updateStaff({ data: { user_id: member.id, staff_role: e.target.value } });
                          toast.success("Role updated.");
                          refresh();
                        } catch {
                          toast.error("Could not change that role.");
                        }
                      }}
                      className="h-10 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-[13px] text-[var(--ink)]"
                    >
                      {Object.entries(STAFF_ROLES).map(([key, role]) => (
                        <option key={key} value={key}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-[var(--line)] px-4 py-3">
                    {member.staff_role === "super_admin" ? (
                      <span className="text-[12.5px] text-[var(--muted)]">All sites</span>
                    ) : (
                      <select
                        value={member.branch ?? ""}
                        onChange={async (e) => {
                          try {
                            await updateStaff({ data: { user_id: member.id, branch: e.target.value } });
                            toast.success("Site updated.");
                            refresh();
                          } catch {
                            toast.error("Could not change that site.");
                          }
                        }}
                        className="h-10 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-[13px] text-[var(--ink)]"
                      >
                        <option value="" />
                        {sites.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="border-b border-[var(--line)] px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${member.active ? "bg-[rgba(15,154,62,.14)] text-[var(--brand-green)]" : "bg-[var(--field)] text-[var(--muted)]"}`}>
                      {member.active ? "active" : "deactivated"}
                    </span>
                  </td>
                  <td className="border-b border-[var(--line)] px-4 py-3 text-[var(--muted)]">
                    {member.last_login ? formatDateTime(member.last_login) : "Never"}
                  </td>
                  <td className="border-b border-[var(--line)] px-4 py-3">
                    {member.email === data.me ? null : (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await updateStaff({ data: { user_id: member.id, active: !member.active } });
                              toast.success(member.active ? "Access deactivated." : "Access restored.");
                              refresh();
                            } catch {
                              toast.error("Could not update that account.");
                            }
                          }}
                          className="text-[12.5px] font-semibold text-[var(--brand-blue)]"
                        >
                          {member.active ? "Deactivate" : "Reactivate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingRemove(member)}
                          className="text-[12.5px] font-semibold text-[var(--brand-red)]"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite staff" width="max-w-md">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Email address
          <input
            type="email"
            className={field}
            value={invite.email}
            onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))}
            placeholder="frontdesk@emfuleni.gov.za"
          />
        </label>
        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Role
          <select
            className={field}
            value={invite.staff_role}
            onChange={(e) => setInvite((i) => ({ ...i, staff_role: e.target.value }))}
          >
            {Object.entries(STAFF_ROLES).map(([key, role]) => (
              <option key={key} value={key}>
                {role.label} — {role.hint}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setInviteOpen(false)} className="h-11 rounded-xl border border-[var(--line)] px-5 text-sm font-semibold text-[var(--ink)]">
            Cancel
          </button>
          <button
            type="button"
            onClick={sendInvite}
            disabled={busy || !invite.email.includes("@")}
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send invite"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        title="Remove this staff member?"
        body={`${pendingRemove?.email ?? ""} will lose all access to the visitor portal.`}
        confirmLabel="Remove access"
        onConfirm={async () => {
          try {
            await removeStaff({ data: { user_id: pendingRemove.id } });
            toast.success("Staff access removed.");
          } catch {
            toast.error("Could not remove that account.");
          } finally {
            setPendingRemove(null);
            refresh();
          }
        }}
      />
    </>
  );
}