import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  IdCard,
  Images,
  LayoutDashboard,
  ListChecks,
  MapPin,
  ScrollText,
  Settings as SettingsIcon,
  UserCog,
  X,
} from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import BrandStripe from "@/components/brand/BrandStripe";
import { roleLabel } from "@/lib/staffRoles";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/visits", label: "Visits", icon: ClipboardList },
  { to: "/admin/members", label: "Registered visitors", icon: IdCard },
  { to: "/admin/reasons", label: "Visit purposes", icon: ListChecks },
  { to: "/admin/slideshow", label: "Slideshow", icon: Images },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
  { to: "/admin/admins", label: "Admins", icon: UserCog, superOnly: true },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export default function Sidebar({
  staffRole,
  email,
  fullName,
  branch,
  isSuperAdmin,
  logoUrl,
  companyName,
  open,
  onChangeBranch,
  onClose,
}) {
  const items = NAV.filter((item) => !item.superOnly || staffRole === "super_admin");

  return (
    <>
      {open ? <div className="fixed inset-0 z-30 bg-[rgba(6,24,47,.5)] lg:hidden" onClick={onClose} /> : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(280px,85vw)] flex-col bg-[linear-gradient(180deg,#06182f,#0a2a52)] p-4 text-[#cfd9e8] transition-transform lg:w-[260px] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-none items-center gap-3 border-b border-white/10 px-2 pb-5">
          <BrandMark logoUrl={logoUrl} className="h-11 w-11 rounded-xl bg-white p-1.5" />
          <div className="min-w-0">
            <p className="emf-serif truncate text-[17px] text-white">{companyName}</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--brand-gold)]">Admin</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto rounded-full p-2 text-white/70 lg:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="emf-scrollbar mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              activeOptions={{ exact: item.to === "/admin" }}
              activeProps={{
                className:
                  "bg-[linear-gradient(90deg,rgba(232,195,106,.22),rgba(232,195,106,.05))] text-white shadow-[inset_3px_0_0_var(--brand-gold)]",
              }}
              inactiveProps={{ className: "text-[#cfd9e8] hover:bg-white/[.07]" }}
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition"
            >
              <item.icon className="h-[19px] w-[19px]" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-3 flex-none">
          <div className="rounded-2xl bg-white/[.07] p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[linear-gradient(145deg,#fff2c4,var(--brand-gold))] font-bold text-[#06182f]">
                {(fullName || email || "?").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">{fullName || email}</p>
                <p className="truncate text-[11px] text-[#8fa6c4]">{roleLabel(staffRole)}</p>
              </div>
            </div>
            {isSuperAdmin ? (
              <p className="mt-2 border-t border-white/10 pt-2 text-[11px] uppercase tracking-[0.12em] text-[#8fa6c4]">
                All sites
              </p>
            ) : (
              <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
                <MapPin className="h-3.5 w-3.5 flex-none text-[var(--brand-gold)]" />
                <span className="truncate text-[11.5px] text-[#cfd9e8]">{branch || "No site yet"}</span>
                <button
                  type="button"
                  onClick={onChangeBranch}
                  className="ml-auto text-[11.5px] font-semibold text-[var(--brand-gold)]"
                >
                  Change
                </button>
              </div>
            )}
          </div>
          <BrandStripe className="mt-4" width="100%" />
        </div>
      </aside>
    </>
  );
}