import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { DEFAULT_SITES } from "@/lib/branches";
import { getPublicSites } from "@/lib/kiosk-fns";

/** The required site chooser on the sign-in page. */
export default function BranchPicker({ value, onChange, disabled }) {
  const { data } = useQuery({
    queryKey: ["public-sites"],
    queryFn: () => getPublicSites(),
    staleTime: 60_000,
  });
  const sites = Array.isArray(data) && data.length > 0 ? data : DEFAULT_SITES;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium leading-none">Your site</span>
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Required</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sites.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              disabled={disabled}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:opacity-60 ${
                active
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-input text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <MapPin className="h-4 w-4 flex-none" />
              <span className="truncate">{option}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        The visitors, dashboards and reports in the portal are limited to this site. Super admins keep access to every
        site.
      </p>
    </div>
  );
}