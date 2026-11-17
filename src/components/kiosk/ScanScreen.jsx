import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Camera, RefreshCw, ScanBarcode } from "lucide-react";
import CardScanner from "@/components/kiosk/CardScanner";
import BrandMark from "@/components/brand/BrandMark";

const COPY = {
  starting: "Starting the camera…",
  scanning: "Hold the QR code on your access card inside the frame.",
  checking: "Checking your card…",
  refused: "",
};

/**
 * The card entrance: the camera reads the QR code and the member is signed in
 * with the details already on their card. Any failure falls back to the form.
 */
export default function ScanScreen({ settings, onCard, onStart, onManual }) {
  const [phase, setPhase] = useState("starting");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  // Idle reset: an abandoned kiosk closes the camera and returns to the banner.
  useEffect(() => {
    const seconds = Number(settings.idle_reset_seconds) || 0;
    if (!seconds) return undefined;
    const id = setTimeout(() => onStart(), seconds * 1000);
    return () => clearTimeout(id);
  }, [phase, attempt, settings.idle_reset_seconds, onStart]);

  const handleDetected = useCallback(
    async (code) => {
      setPhase("checking");
      let result;
      try {
        result = await onCard(code);
      } catch {
        result = { ok: false };
      }
      if (result?.ok) return; // the kiosk moves on to the welcome screen
      setPhase("refused");
      setMessage(
        result?.message ||
          "That card isn't registered yet. Please sign in with the form, or ask the front desk for help.",
      );
    },
    [onCard],
  );

  const handleCameraError = useCallback((error) => {
    const blocked = error?.name === "NotAllowedError" || error?.name === "SecurityError";
    setPhase("refused");
    setMessage(
      blocked
        ? "Camera access is blocked on this device. Allow the camera or sign in with the form instead."
        : "We couldn't start the camera on this device. Please sign in with the form instead.",
    );
  }, []);

  const retry = () => {
    setMessage("");
    setAttempt((n) => n + 1);
    setPhase("starting");
  };

  const ready = useCallback(() => setPhase((current) => (current === "starting" ? "scanning" : current)), []);

  return (
    <div className="scan">
      <div className="scan-head">
        <button type="button" className="scan-back" onClick={onStart} aria-label="Back to the welcome screen">
          <ArrowLeft />
        </button>
        <BrandMark logoUrl={settings.logo_url} className="scan-logo" />
      </div>

      <h2 className="scan-title">
        Scan your <em>access card</em>
      </h2>
      <p className="scan-sub">Your visit is signed in straight away — no form to fill in.</p>

      <div className="scan-stage">
        {phase === "refused" ? (
          <div className="scan-frame scan-frame--idle">
            <Camera />
            <span>Camera off</span>
          </div>
        ) : (
          <CardScanner key={attempt} onDetected={handleDetected} onReady={ready} onError={handleCameraError} />
        )}
        <p className={phase === "refused" ? "scan-msg scan-msg--bad" : "scan-msg"} role="status">
          {message || COPY[phase]}
        </p>
      </div>

      <div className="scan-actions">
        {phase === "refused" ? (
          <button type="button" className="scan-btn scan-btn--gold" onClick={retry}>
            <RefreshCw /> Try the camera again
          </button>
        ) : null}
        <button type="button" className="scan-btn scan-btn--ghost" onClick={onManual}>
          <ScanBarcode /> Sign in with the form instead
        </button>
      </div>

      <p className="scan-note">
        Scanning your card records your visit at {settings.company_name} and confirms the consent given when your card
        was issued.
      </p>
    </div>
  );
}