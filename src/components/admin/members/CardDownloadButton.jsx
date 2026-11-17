import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import MemberCard from "@/components/admin/members/MemberCard";
import { saveCardImage } from "@/lib/cardImage";

/**
 * Saves a member's card as a PNG image. The card is drawn off screen for the
 * moment it takes to capture it, so the register itself stays untouched.
 */
export default function CardDownloadButton({ member, logoUrl, companyName, className, label = "Download" }) {
  const holder = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!busy) return undefined;
    let active = true;
    saveCardImage(holder.current, member)
      .catch(() => {
        if (active) toast.error("Could not save that card. Please try again.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [busy, member]);

  return (
    <>
      <button type="button" onClick={() => setBusy(true)} disabled={busy} className={className}>
        <Download className="h-3.5 w-3.5" />
        {busy ? "Preparing…" : label}
      </button>

      {busy ? (
        <div className="mcard-export" aria-hidden="true">
          <div ref={holder}>
            <MemberCard member={member} logoUrl={logoUrl} companyName={companyName} />
          </div>
        </div>
      ) : null}
    </>
  );
}