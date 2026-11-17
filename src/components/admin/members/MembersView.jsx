import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMembers } from "@/hooks/useMembers";
import { useStaffContext } from "@/hooks/useStaffContext";
import { removeMember, saveMember } from "@/lib/member-fns";
import { todayISO } from "@/lib/kioskFormat";
import { normaliseCard } from "@/lib/memberFormat";
import { sitesFrom } from "@/lib/branches";
import PageHeader from "@/components/admin/PageHeader";
import Modal from "@/components/admin/Modal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import MemberCard from "@/components/admin/members/MemberCard";
import CardDownloadButton from "@/components/admin/members/CardDownloadButton";
import MemberForm, { EMPTY_MEMBER, validateMember } from "@/components/admin/members/MemberForm";
import MembersTable from "@/components/admin/members/MembersTable";

const searchField =
  "h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] pl-10 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-blue)]";

export default function MembersView() {
  const { data: staff } = useStaffContext();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { rows, total, branch, isSuperAdmin, isPending, isError, hasMore, loadingMore, loadMore, refresh } =
    useMembers(query);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(EMPTY_MEMBER);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["library-settings"],
    queryFn: async () => {
      const page = await base44.entities.Settings.list({ sort: "-updated_date", limit: 1 });
      return page?.items?.[0] ?? null;
    },
  });

  // Typing searches the register without a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const sites = sitesFrom(settings);
  const canChooseSite = !!staff?.isSuperAdmin;

  function openNew() {
    setEditing(null);
    setErrors({});
    setDraft({ ...EMPTY_MEMBER, branch: canChooseSite ? "" : staff?.branch || "", member_since: todayISO() });
    setFormOpen(true);
  }

  function openEdit(member) {
    setEditing(member);
    setErrors({});
    setDraft({ ...EMPTY_MEMBER, ...member });
    setFormOpen(true);
  }

  function onField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function save() {
    const found = validateMember(draft, sites);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await saveMember({
        data: {
          ...draft,
          id: editing?.id,
          card_number: normaliseCard(draft.card_number),
          member_since: draft.member_since || todayISO(),
          notes: draft.notes ?? "",
        },
      });
      toast.success(editing ? "Visitor updated." : `${draft.full_name} added to the register.`);
      setFormOpen(false);
      refresh();
    } catch (error) {
      const message = error?.message || "Could not save this member. Please try again.";
      if (/already registered/i.test(message)) setErrors({ card_number: message });
      else toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      await removeMember({ data: { id: pendingRemove.id } });
      toast.success("Visitor removed.");
      setPendingRemove(null);
      refresh();
    } catch (error) {
      toast.error(error?.message || "Could not remove that member.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Access cards"
        title="Registered visitors"
        subtitle="Give a repeat visitor a card so the entrance camera can sign them in."
      >
        <button
          type="button"
          onClick={openNew}
          className="inline-flex h-11 items-center rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-4 text-[13.5px] font-semibold text-white"
        >
          + Add visitor
        </button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
          <input
            className={searchField}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, card number, email or phone"
            aria-label="Search visitors"
          />
        </div>
        <p className="text-[13px] text-[var(--muted)]">
          {isPending ? "Loading cards…" : `${total} ${total === 1 ? "card" : "cards"}`}
          {isSuperAdmin ? " across all sites" : branch ? ` at ${branch}` : ""}
        </p>
      </div>

      {isError ? (
        <p className="mb-3 text-[13px] text-[var(--brand-red)]">
          We couldn't load the visitor register just now. Please refresh the page.
        </p>
      ) : null}

      <MembersTable
        members={rows}
        isLoading={isPending}
        showBranch={isSuperAdmin}
        onEdit={openEdit}
        onRemove={setPendingRemove}
        logoUrl={settings?.logo_url}
        companyName={settings?.company_name || "Visitor Log Book"}
      />

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => loadMore()}
            disabled={loadingMore}
            className="h-11 rounded-xl border border-[var(--line)] bg-[var(--card)] px-5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--field)] disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load more visitors"}
          </button>
        </div>
      ) : null}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit visitor" : "Add visitor"}
        width="max-w-4xl"
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <MemberForm value={draft} onField={onField} errors={errors} sites={sites} canChooseSite={canChooseSite} />

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Card preview</p>
              {editing?.id ? (
                <CardDownloadButton
                  member={draft}
                  logoUrl={settings?.logo_url}
                  companyName={settings?.company_name || "Visitor Log Book"}
                  label="Download card"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 text-[12.5px] font-semibold text-[var(--brand-blue)] transition hover:bg-[var(--field)] disabled:opacity-60"
                />
              ) : null}
            </div>
            <MemberCard
              member={draft}
              logoUrl={settings?.logo_url}
              companyName={settings?.company_name || "Visitor Log Book"}
            />
            <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--muted)]">
              Enter the visitor's card number. The QR code printed on the card carries that number and the visitor's
              record, and the entrance camera reads only the QR code — so the number must match exactly.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setFormOpen(false)}
            className="h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--field)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-11 rounded-xl bg-[linear-gradient(135deg,#0b5ea8,#06335f)] px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add visitor"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        onConfirm={remove}
        busy={removing}
        title="Remove this visitor?"
        body={
          pendingRemove
            ? `${pendingRemove.full_name}'s card ${pendingRemove.card_number} will no longer sign them in at the entrance. Their past visits stay in the log book.`
            : ""
        }
        confirmLabel="Remove visitor"
      />
    </>
  );
}