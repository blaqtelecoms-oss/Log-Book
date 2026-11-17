import { Link } from "@tanstack/react-router";
import { ScanBarcode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSlideshow } from "@/hooks/useSlideshow";
import BrandMark from "@/components/brand/BrandMark";
import BrandStripe from "@/components/brand/BrandStripe";
import Emphasised from "@/components/brand/Emphasised";
import SlideToSignIn from "@/components/kiosk/SlideToSignIn";

function Wordmark({ name }) {
  const parts = String(name || "Visitor Log Book").trim().split(" ");
  const last = parts.pop();
  return (
    <>
      {parts.length > 0 && `${parts.join(" ")} `}
      <b>{last}</b>
    </>
  );
}

/** Full-screen cinematic sign-in banner: looping slides plus the slide-to-sign-in dock. */
export default function HeroSlideshow({ slides, count, settings, onSignIn, onScan, sliderKey }) {
  const { index, cycle } = useSlideshow(slides);
  const slide = slides[index] || {};

  return (
    <div className="hero">
      <div className="hero-media">
        {slides.map((s, i) => (
          <div key={s.id ?? i} className={cn("hero-slide", i === index && "on")}>
            <div className="kb" style={{ backgroundImage: `url("${s.image_url}")` }} role="img" aria-label={s.image_alt || ""} />
          </div>
        ))}
        <div className="hero-scrim" />
      </div>

      <div className="hero-body">
        <div className="hero-top">
          <span className="hero-pill">
            <BrandMark logoUrl={settings.logo_url} />
            <Wordmark name={settings.company_name} />
          </span>
          <span className="hero-pill">
            <b>{count}</b> {count === 1 ? "visitor" : "visitors"} today
          </span>
        </div>

        <div className="hero-progress" key={cycle}>
          {slides.map((s, i) => (
            <i
              key={s.id ?? i}
              className={cn(i < index && "done", i === index && "run")}
              style={{ "--d": `${s.duration_seconds || 6}s` }}
            />
          ))}
        </div>
      </div>

      <div className="hero-caption" key={`${cycle}-${index}`}>
        <span className="emf-eyebrow">{slide.eyebrow}</span>
        <h1>
          <Emphasised text={slide.title} />
        </h1>
        <p>{slide.subtitle}</p>
      </div>

      <div className="hero-dock">
        <button type="button" className="hero-scan" onClick={onScan}>
          <ScanBarcode /> Scan your access card
        </button>
        <SlideToSignIn resetKey={sliderKey} onComplete={onSignIn} />
        <BrandStripe />
        <p className="hero-login">
          <Link to="/admin/login">Staff login</Link>
        </p>
      </div>
    </div>
  );
}