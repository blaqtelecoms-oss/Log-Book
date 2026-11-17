import { useEffect, useState } from "react";

/**
 * Endless slideshow index. Advances on each slide's own duration, preloads the
 * next image to avoid flicker, and bumps `cycle` when the loop restarts so the
 * progress bars can replay their animation.
 */
export function useSlideshow(slides = []) {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const count = slides.length;
  const duration = (slides[index]?.duration_seconds || 6) * 1000;

  useEffect(() => {
    if (count < 2) return undefined;
    const id = setTimeout(() => {
      setIndex((i) => {
        const next = (i + 1) % count;
        if (next === 0) setCycle((c) => c + 1);
        return next;
      });
    }, duration);
    return () => clearTimeout(id);
  }, [index, duration, count]);

  useEffect(() => {
    if (count === 0) return;
    const next = slides[(index + 1) % count];
    if (next?.image_url) {
      const img = new Image();
      img.src = next.image_url;
    }
  }, [index, count, slides]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  return { index, cycle, duration };
}