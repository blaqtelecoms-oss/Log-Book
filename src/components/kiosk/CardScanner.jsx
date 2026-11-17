import { useEffect, useRef } from "react";
import "@/components/kiosk/scan.css";

/**
 * Fetches the QR decoder ahead of time, so the camera can start scanning the
 * moment the visitor asks for it instead of waiting on a download.
 */
export function preloadCardScanner() {
  return Promise.all([import("@zxing/browser"), import("@zxing/library")]);
}

/**
 * Reads the QR code on a library card with the device camera. Only QR codes are
 * looked for: one format per frame keeps the decoding cheap, which is what makes
 * recognition quick when a card is held up to the kiosk.
 */
export default function CardScanner({ onDetected, onReady, onError }) {
  const videoRef = useRef(null);
  const seenRef = useRef(false);

  useEffect(() => {
    let stopped = false;
    let controls = null;

    (async () => {
      try {
        const [browser, library] = await preloadCardScanner();
        if (stopped) return;

        const hints = new Map();
        hints.set(library.DecodeHintType.POSSIBLE_FORMATS, [library.BarcodeFormat.QR_CODE]);

        const reader = new browser.BrowserQRCodeReader(hints, {
          // Short gaps between attempts: a card held up is recognised in a fraction of a second.
          delayBetweenScanAttempts: 60,
          delayBetweenScanSuccess: 1200,
        });

        controls = await reader.decodeFromConstraints(
          // The visitor holds the card up to the kiosk, so the front camera is the one asked for.
          { video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current,
          (result) => {
            if (stopped || seenRef.current) return;
            const text = String(result?.getText?.() ?? "").trim();
            if (!text) return;
            seenRef.current = true;
            onDetected(text);
          },
        );

        if (stopped) controls?.stop?.();
        else onReady?.();
      } catch (error) {
        if (!stopped) onError?.(error);
      }
    })();

    return () => {
      stopped = true;
      try {
        controls?.stop?.();
      } catch {
        // The camera stream is already closed.
      }
    };
  }, [onDetected, onReady, onError]);

  return (
    <div className="scan-frame">
      <video ref={videoRef} className="scan-video" playsInline autoPlay muted />
      <span className="scan-corner scan-corner--tl" aria-hidden="true" />
      <span className="scan-corner scan-corner--tr" aria-hidden="true" />
      <span className="scan-corner scan-corner--bl" aria-hidden="true" />
      <span className="scan-corner scan-corner--br" aria-hidden="true" />
      <span className="scan-laser" aria-hidden="true" />
    </div>
  );
}