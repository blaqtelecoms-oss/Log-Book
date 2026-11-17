import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, X } from "lucide-react";
import { setMyBranch } from "@/lib/admin-fns";
import { DEFAULT_SITES } from "@/lib/branches";
import BrandMark from "@/components/brand/BrandMark";
import BrandStripe from "@/components/brand/BrandStripe";

/**
 * Site chooser, shown straight after sign-in — a site admin cannot reach the
 * dashboard, visits or reports until they have picked one, and they can reopen
 * it from the sidebar to switch.
 */
export default function BranchGate({ companyName, sites, logoUrl, branch, onDone, onCancel }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const options = Array.isArray(sites) && sites.length > 0 ? sites : DEFAULT_SITES;

  async function choose(next) {
    setSaving(next);
    setError("");
    try {
      await setMyBranch({ data: { branch: next } });
      queryClient.invalidateQueries({ queryKey: ["staff-context"] });
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone?.(next);
    } catch {
      setError("We couldn't save that site. Please try again.");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="emf-page flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-lg">
        <div className="emf-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--line)] px-6 py-5">
            <BrandMark logoUrl={logoUrl} className="h-11 w-11 rounded-xl border border-[var(--line)] p-1.5" />
            <div className="min-w-0">
              <p className="emf-serif truncate text-[17px] text-[var(--ink)]">{companyName || "Visitor Log Book"}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--brand-gold)]">Staff access</p>
            </div>
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="ml-auto rounded-full p-2 text-[var(--muted)] hover:bg-[var(--field)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="px-6 py-6">
            <span className="emf-eyebrow emf-eyebrow--dark">Your site</span>
            <h1 className="emf-serif mt-1 text-2xl text-[var(--ink)]">Which site are you working at?</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">
              You will see the visitor records, dashboards and reports for that site only. You can switch site again
              from the sidebar whenever you need to.
            </p>

            <div className="mt-5 space-y-2">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => choose(option)}
                  disabled={!!saving}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition disabled:opacity-60 ${
                    branch === option ? "border-[var(--brand-blue)] bg-[rgba(11,94,168,.07)]" : "border-[var(--line)] hover:bg-[var(--field)]"
                  }`}
                >
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[var(--field)] text-[var(--brand-blue)]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold text-[var(--ink)]">{option}</span>
                    <span className="block text-[12px] text-[var(--muted)]">
                      {saving === option ? "Saving…" : "Visitor records and reports for this site"}
                    </span>
                  </span>
                  {branch === option ? <Check className="h-4 w-4 flex-none text-[var(--brand-blue)]" /> : null}
                </button>
              ))}
            </div>

            {error ? <p className="mt-3 text-[13px] font-semibold text-[var(--brand-red)]">{error}</p> : null}
          </div>

          <BrandStripe width="100%" />
        </div>
      </div>
    </div>
  );
}