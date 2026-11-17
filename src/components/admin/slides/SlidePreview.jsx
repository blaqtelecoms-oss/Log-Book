import { useEffect } from "react";
import { useSlideshow } from "@/hooks/useSlideshow";
import Emphasised from "@/components/brand/Emphasised";

/** A live miniature of the kiosk slideshow, so changes are visible before saving. */
export default function SlidePreview({ slides }) {
  const active = slides.filter((s) => s.is_active && s.image_url);
  const { index, cycle } = useSlideshow(active);
  const slide = active[index];

  useEffect(() => {
    if (active.length > 1) active.forEach((s) => { const img = new Image(); img.src = s.image_url; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  return (
    <section className="emf-card overflow-hidden">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <h3 className="text-[15px] font-semibold text-[var(--ink)]">Live preview</h3>
        <p className="text-xs text-[var(--muted)]">
          Exactly what visitors see · {active.length} active slide{active.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="relative aspect-[16/10] overflow-hidden bg-[linear-gradient(160deg,#06182f,#0b5ea8)]">
        {active.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-white/70">Add at least one active slide.</div>
        ) : (
          <>
            {active.map((s, i) => (
              <div
                key={s.id ?? i}
                className={`absolute inset-0 transition-opacity ${i === index ? "opacity-100" : "opacity-0"}`}
                style={{ transitionDuration: "1200ms" }}
              >
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${s.image_url}")` }} />
              </div>
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,24,47,.6)_0%,rgba(6,24,47,.15)_28%,rgba(6,24,47,.85)_62%,#06182f_96%)]" />
            <div className="absolute inset-x-0 bottom-5 px-5 text-center">
              <div key={`${cycle}-${index}`}>
                <span className="emf-eyebrow text-[9px]">{slide?.eyebrow}</span>
                <p className="emf-serif mt-2 text-[22px] leading-tight text-white">
                  <Emphasised text={slide?.title} />
                </p>
                <p className="mx-auto mt-1 max-w-[320px] text-[11.5px] text-white/75">{slide?.subtitle}</p>
              </div>
            </div>
            <div className="absolute inset-x-0 top-4 flex justify-center gap-1.5 px-5" key={cycle}>
              {active.map((s, i) => (
                <i key={s.id ?? i} className={`h-[3px] flex-1 rounded-full ${i <= index ? "bg-[var(--brand-gold)]" : "bg-white/25"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-4 text-xs text-[var(--muted)]">
        <span>Crossfade 1.2s</span>
        <span>Ken Burns zoom 7.5s</span>
        <span>{slide?.duration_seconds || 6}s per slide</span>
        <span>{active.length > 0 ? "Endless loop" : "Paused"}</span>
      </div>
    </section>
  );
}