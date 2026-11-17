import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 0.82;

/**
 * The glass track a visitor drags to open the log form. Works with touch, mouse
 * and pointer events, and with Enter / Space / ArrowRight on the focused knob.
 * Releasing before 82% of the travel springs the knob back.
 */
export default function SlideToSignIn({ onComplete, resetKey = 0, label = "Slide to sign in" }) {
  const trackRef = useRef(null);
  const knobRef = useRef(null);
  const startX = useRef(0);
  const finishedRef = useRef(false);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const [snap, setSnap] = useState(false);

  const maxTravel = useCallback(
    () => Math.max(0, (trackRef.current?.clientWidth ?? 0) - (knobRef.current?.offsetWidth ?? 56) - 12),
    [],
  );

  const reset = useCallback(() => {
    finishedRef.current = false;
    setDone(false);
    setDragging(false);
    setSnap(false);
    setX(0);
  }, []);

  useEffect(() => {
    reset();
  }, [resetKey, reset]);

  useEffect(() => {
    const onResize = () => {
      if (!finishedRef.current) setX(0);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const complete = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSnap(true);
    setDone(true);
    setX(maxTravel());
    setTimeout(() => onComplete?.(), 320);
  };

  const onPointerDown = (e) => {
    if (finishedRef.current) return;
    setSnap(false);
    setDragging(true);
    startX.current = e.clientX - x;
    try {
      knobRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      // Capture is a nicety — the drag still works without it.
    }
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const limit = maxTravel();
    setX(Math.min(Math.max(0, e.clientX - startX.current), limit));
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (x >= maxTravel() * THRESHOLD) complete();
    else {
      setSnap(true);
      setX(0);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
      e.preventDefault();
      complete();
    }
  };

  return (
    <div ref={trackRef} className={cn("sl emf-glass", snap && "snap", done && "done")}>
      <div className="sl-fill" style={{ width: x + 56 }} />
      <div className="sl-lbl">{label}</div>
      <div className="sl-chev" aria-hidden="true">
        ›››
      </div>
      <button
        ref={knobRef}
        type="button"
        className="sl-knob"
        aria-label={`${label}. Press Enter to sign in.`}
        style={{ transform: `translateX(${x}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <ChevronRight strokeWidth={2.6} />
      </button>
    </div>
  );
}