/**
 * The built-in mark: a doorway with an arriving arrow — a visitor checking in.
 * A company's own logo, uploaded in Settings, replaces it everywhere.
 */
export default function BrandMark({ logoUrl, className = "h-9 w-9", alt = "Visitor Log Book" }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={alt} className={className} style={{ objectFit: "contain" }} />;
  }

  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={alt}>
      <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="var(--brand-navy-2)" />
      <path
        d="M19 13h10a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H19"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M9.5 24h12M17 19.5 21.5 24 17 28.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28.5" cy="24" r="2.1" fill="var(--brand-gold)" />
    </svg>
  );
}