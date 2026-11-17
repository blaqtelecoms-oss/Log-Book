import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import Modal from "@/components/admin/Modal";
import { formatDate } from "@/lib/kioskFormat";

/** Every visit recorded against one contact number. */
export default function VisitorHistory({ contact, onClose }) {
  const { data } = useQuery({
    queryKey: ["visitor-history", contact],
    enabled: !!contact,
    queryFn: () => base44.entities.Visit.filter({ contact_number: contact }, { sort: "-visit_date", limit: 100 }),
  });

  const visits = data?.items ?? [];
  const name = visits[0]?.full_name ?? "";

  return (
    <Modal open={!!contact} onClose={onClose} title="Visitor history" width="max-w-2xl">
      <p className="text-sm text-[var(--muted)]">
        <span className="font-semibold text-[var(--ink)]">{contact}</span>
        {name ? ` · ${name}` : ""} · {visits.length} visit{visits.length === 1 ? "" : "s"} recorded
      </p>

      <div className="mt-4 max-h-[50vh] overflow-y-auto emf-scrollbar">
        {visits.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">No visits found for this number.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                {["Date", "Time in", "Time out", "Reason", "Status"].map((h) => (
                  <th key={h} className="border-b border-[var(--line)] px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td className="border-b border-[var(--line)] px-3 py-2 text-[var(--ink)]">{formatDate(v.visit_date)}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2 text-[var(--ink)]">{v.time_in}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2 text-[var(--ink)]">{v.time_out || "—"}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2 text-[var(--ink)]">{v.reason}</td>
                  <td className="border-b border-[var(--line)] px-3 py-2 text-[var(--muted)]">{v.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}