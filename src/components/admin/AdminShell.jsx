import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { claimMyBranch, recordAudit } from "@/lib/admin-fns";
import { sitesFrom } from "@/lib/branches";
import { clearPendingBranch, readPendingBranch } from "@/lib/staffBranch";
import { useStaffContext } from "@/hooks/useStaffContext";
import { useTheme } from "@/hooks/useTheme";
import BranchGate from "@/components/admin/BranchGate";
import Sidebar from "@/components/admin/Sidebar";
import TopBar from "@/components/admin/TopBar";
import AccessDenied from "@/components/admin/AccessDenied";

const LOGIN_FLAG = "emf-portal-session";

/** Navy sidebar, top bar and content area — the frame around every admin page. */
export default function AdminShell({ children }) {
  const { data: staff, isLoading, error } = useStaffContext();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingBranch, setChangingBranch] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["library-settings"],
    queryFn: async () => {
      const page = await base44.entities.Settings.list({ sort: "-updated_date", limit: 1 });
      return page?.items?.[0] ?? null;
    },
    enabled: !!staff?.isStaff,
  });

  useEffect(() => {
    if (!staff?.isStaff) return;
    if (sessionStorage.getItem(LOGIN_FLAG)) return;
    sessionStorage.setItem(LOGIN_FLAG, "1");
    recordAudit({ data: { action: "login", entity: "Staff", summary: "Signed in to the admin portal" } }).catch(
      () => {},
    );
  }, [staff?.isStaff]);

  // The branch picked on the sign-in page is applied to the staff record before the portal opens.
  useEffect(() => {
    if (!staff?.isStaff) return;
    const pending = readPendingBranch();
    if (!pending || pending === staff.branch) return;
    setClaiming(true);
    claimMyBranch({ data: { branch: pending } })
      .then(() => {
        clearPendingBranch();
        queryClient.invalidateQueries({ queryKey: ["staff-context"] });
      })
      .catch(() => {})
      .finally(() => setClaiming(false));
  }, [staff?.isStaff, staff?.branch, queryClient]);

  if (isLoading) {
    return (
      <div className="emf-page min-h-screen p-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="emf-skel h-10 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="emf-skel h-28" />
            ))}
          </div>
          <div className="emf-skel h-72" />
        </div>
      </div>
    );
  }

  if (error) {
    return <AccessDenied email={null} />;
  }

  if (!staff?.isStaff) {
    return <AccessDenied email={staff?.email} />;
  }

  // A branch admin chooses the branch they work at before the portal opens.
  if (!staff.isSuperAdmin && (claiming || !staff.branch || changingBranch)) {
    return (
      <BranchGate
        companyName={settings?.company_name}
        sites={sitesFrom(settings)}
        logoUrl={settings?.logo_url}
        branch={staff.branch}
        onDone={() => setChangingBranch(false)}
        onCancel={staff.branch ? () => setChangingBranch(false) : undefined}
      />
    );
  }

  return (
    <div className="emf-page min-h-screen">
      <Sidebar
        staffRole={staff.staffRole}
        email={staff.email}
        fullName={staff.full_name}
        logoUrl={settings?.logo_url}
        companyName={settings?.company_name || "Visitor Log Book"}
        open={menuOpen}
        branch={staff.branch}
        isSuperAdmin={staff.isSuperAdmin}
        onChangeBranch={() => setChangingBranch(true)}
        onClose={() => setMenuOpen(false)}
      />
      <div className="min-w-0 lg:pl-[260px]">
        <TopBar onMenu={() => setMenuOpen(true)} theme={theme} setTheme={setTheme} />
        <main className="min-w-0 px-3 py-5 sm:px-8 sm:py-7">{children}</main>
      </div>
    </div>
  );
}