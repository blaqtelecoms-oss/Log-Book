/** POPIA privacy notice, opened from the consent line on the log form. */
export default function PrivacyNoticeModal({ open, onClose, text, companyName }) {
  if (!open) return null;
  return (
    <div className="kf-scrim" role="dialog" aria-modal="true" aria-label="Privacy notice" onClick={onClose}>
      <div className="kf-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Privacy notice</h3>
        <p>{text}</p>
        <p style={{ fontSize: 12.5 }}>
          {companyName} · Enquiries about your visitor record can be raised at reception.
        </p>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}