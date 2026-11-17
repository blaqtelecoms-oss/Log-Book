import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, LogOut, Menu, Monitor, Moon, Search, Sun } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const THEMES = [
  { key: "light", icon: Sun, label: "Light" },
  { key: "dark", icon: Moon, label: "Dark" },
  { key: "system", icon: Monitor, label: "System" },
];

export default function TopBar({ onMenu, theme, setTheme }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-[var(--line)] bg-[var(--card)] px-3 py-2.5 sm:gap-3 sm:px-8 sm:py-3">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-xl border border-[var(--line)] p-2.5 text-[var(--ink)] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <form
        className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-[var(--field)] px-3 sm:max-w-[340px]"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/admin/visits", search: q ? { q } : {} });
        }}
      >
        <Search className="h-4 w-4 flex-none text-[var(--muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search visitors, contacts…"
          aria-label="Search visitors"
          className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
        />
      </form>

      <div className="hidden items-center gap-1 rounded-xl bg-[var(--field)] p-1 md:flex">
        {THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTheme(t.key)}
            aria-label={`${t.label} theme`}
            className={`rounded-lg p-2 transition ${
              theme === t.key ? "bg-[var(--card)] text-[var(--brand-blue)] shadow-sm" : "text-[var(--muted)]"
            }`}
          >
            <t.icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <a
        href="/"
        className="hidden h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-[13.5px] font-semibold text-[var(--ink)] transition hover:bg-[var(--field)] sm:inline-flex"
      >
        Open kiosk <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <button
        type="button"
        onClick={() => logout()}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-[13.5px] font-semibold text-[var(--ink)] transition hover:bg-[var(--field)]"
      >
        <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
      </button>
    </header>
  );
}