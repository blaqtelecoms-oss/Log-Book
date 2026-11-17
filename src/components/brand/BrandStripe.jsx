import { cn } from "@/lib/utils";

/** The recurring four-segment brand stripe: navy to gold. */
export default function BrandStripe({ className, width }) {
  return (
    <div className={cn("emf-stripe", className)} style={width ? { "--stripe-w": width } : undefined} aria-hidden="true">
      <i style={{ background: "var(--brand-blue)" }} />
      <i style={{ background: "var(--brand-navy-2)" }} />
      <i style={{ background: "var(--brand-gold)" }} />
      <i style={{ background: "var(--brand-gold-deep)" }} />
    </div>
  );
}