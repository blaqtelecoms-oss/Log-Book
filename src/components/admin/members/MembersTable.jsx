import { Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/kioskFormat";
import CardDownloadButton from "@/components/admin/members/CardDownloadButton";

const HEAD = ["Visitor", "Card number", "Contact", "Organisation", "Site", "Status", "Issued", ""];

const actionClass = "inline-flex items-center gap-1.5 text-[12.5px] font-semibold";

/** The searchable list of registered visitor access cards. */
export default function MembersTable({
  members,
  isLoading,
  showBranch,
  onEdit,
  onRemove,
  logoUrl,
  companyName,
}) {
  return (
    <div className="emf-card emf-scrollbar overflow-auto">
      <table className="w-full min-w-[860px] text-[13.5px]">
        <thead>
          <tr>
            {HEAD.map((heading) => (
              <th
                key={heading}
                className="border-b border-[var(--line)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={HEAD.length} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                Loading visitors…
              </td>
            </tr>
          ) : members.length === 0 ? (
            <tr>
              <td colSpan={HEAD.length} className="px-4 py-12 text-center text-sm text-[var(--muted)]">
                No access cards here yet — add the first registered visitor to get started.
              </td>
            </tr>
          ) : (
            members.map((member) => (
              <tr key={member.id} className="hover:bg-[var(--field)]">
                <td className="border-b border-[var(--line)] px-4 py-3 font-medium text-[var(--ink)]">
                  {member.full_name}
                </td>
                <td className="border-b border-[var(--line)] px-4 py-3 font-mono text-[12.5px] text-[var(--ink)]">
                  {member.card_number}
                </td>
                <td className="border-b border-[var(--line)] px-4 py-3 text-[var(--muted)]">
                  {member.contact_number}
                  <br />
                  <span className="text-[12px]">{member.email}</span>
                </td>
                <td className="border-b border-[var(--line)] px-4 py-3 text-[var(--ink)]">{member.town}</td>
                {showBranch ? (
                  <td className="border-b border-[var(--line)] px-4 py-3 text-[var(--ink)]">{member.branch}</td>
                ) : null}
                <td className="border-b border-[var(--line)] px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                      member.active === false
                        ? "bg-[var(--field)] text-[var(--muted)]"
                        : "bg-[rgba(15,154,62,.14)] text-[var(--brand-green)]"
                    }`}
                  >
                    {member.active === false ? "inactive" : "active"}
                  </span>
                </td>
                <td className="border-b border-[var(--line)] px-4 py-3 text-[var(--muted)]">
                  {formatDate(member.member_since)}
                </td>
                <td className="border-b border-[var(--line)] px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <CardDownloadButton
                      member={member}
                      logoUrl={logoUrl}
                      companyName={companyName}
                      className={`${actionClass} text-[var(--brand-blue)]`}
                    />
                    <button
                      type="button"
                      onClick={() => onEdit(member)}
                      className={`${actionClass} text-[var(--brand-blue)]`}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(member)}
                      className={`${actionClass} text-[var(--brand-red)]`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}