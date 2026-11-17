import { useMemo } from "react";
import { qrMatrix } from "@/lib/qr";

/**
 * A QR code drawn as an SVG: it stays razor sharp at any size and needs no
 * image request. The white quiet zone is part of the drawing, which is what
 * lets a phone camera lock on to the code.
 */
export default function QrCode({ value, className, label }) {
  const modules = useMemo(() => {
    try {
      return qrMatrix(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!modules) return null;

  const size = modules.length;
  const quiet = 2;
  const box = size + quiet * 2;
  const path = modules
    .map((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : "")).join(""))
    .join("");

  return (
    <svg
      className={className}
      viewBox={`${-quiet} ${-quiet} ${box} ${box}`}
      role="img"
      aria-label={label || "Visitor access card QR code"}
      shapeRendering="crispEdges"
    >
      <rect x={-quiet} y={-quiet} width={box} height={box} fill="#ffffff" />
      <path d={path} fill="#0d1b2e" />
    </svg>
  );
}