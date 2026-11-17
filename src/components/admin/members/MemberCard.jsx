import BrandMark from "@/components/brand/BrandMark";
import QrCode from "@/components/QrCode";
import { formatDate } from "@/lib/kioskFormat";
import { cardPayload } from "@/lib/memberFormat";
import "@/components/admin/members/members.css";

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** The visitor's digital access card, shown wherever their record is opened. */
export default function MemberCard({ member, logoUrl, companyName = "Visitor Log Book" }) {
  const name = member?.full_name || "New visitor";
  const issued = member?.member_since || member?.created_date;
  const payload = cardPayload(member);

  return (
    <div className="mcard">
      <span className="mcard-stripe" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>

      <div className="mcard-top">
        <BrandMark logoUrl={logoUrl} className="mcard-mark" />
        <div className="mcard-org">
          <p>{companyName}</p>
          <p className="mcard-kind">Visitor access card</p>
        </div>
      </div>

      <div className="mcard-body">
        <span className="mcard-avatar" aria-hidden="true">
          {initials(name)}
        </span>
        <div className="mcard-who">
          <p className="mcard-name">{name}</p>
          <p className="mcard-meta">
            {member?.town || "Organisation not set"} · Issued {issued ? formatDate(issued) : "—"}
          </p>
          <span className={member?.active === false ? "mcard-pill mcard-pill--off" : "mcard-pill"}>
            {member?.active === false ? "Inactive" : "Registered visitor"}
          </span>
        </div>
      </div>

      <div className="mcard-foot">
        <QrCode value={payload} className="mcard-qr" label={`Visitor access card QR code for ${name}`} />
        <p className="mcard-hint">Scan this code at the entrance</p>
      </div>
    </div>
  );
}