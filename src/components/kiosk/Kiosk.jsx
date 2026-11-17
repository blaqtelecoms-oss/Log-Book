import { useCallback, useEffect, useState } from "react";
import { preloadCardScanner } from "@/components/kiosk/CardScanner";
import HeroSlideshow from "@/components/kiosk/HeroSlideshow";
import KioskForm from "@/components/kiosk/KioskForm";
import ScanScreen from "@/components/kiosk/ScanScreen";
import WelcomeScreen from "@/components/kiosk/WelcomeScreen";
import { useKioskData } from "@/lib/useKioskData";

/**
 * The public kiosk: four states in one route — slideshow sign-in, the card
 * scanner, the log form, welcome — with the scanner and the form reset on
 * every return.
 */
export default function Kiosk() {
  const { slides, reasons, settings, todayCount, submitVisit, scanCard } = useKioskData();
  const [screen, setScreen] = useState("slideshow");
  const [guest, setGuest] = useState("");
  const [sliderKey, setSliderKey] = useState(0);

  // The card decoder is fetched while the visitor is still on the banner, so the camera scans at once.
  useEffect(() => {
    preloadCardScanner().catch(() => {});
  }, []);

  const backToStart = useCallback(() => {
    setGuest("");
    setSliderKey((k) => k + 1);
    setScreen("slideshow");
  }, []);

  const handleSubmit = useCallback(
    async (payload) => {
      await submitVisit(payload);
      setGuest(payload.full_name);
      setScreen("welcome");
    },
    [submitVisit],
  );

  // A scanned card signs the member in with the details already on their record.
  const handleCard = useCallback(
    async (cardNumber) => {
      const result = await scanCard(cardNumber);
      if (result?.ok) {
        setGuest(result.full_name);
        setScreen("welcome");
      }
      return result;
    },
    [scanCard],
  );

  return (
    <div className="kiosk">
      {screen === "slideshow" ? (
        <HeroSlideshow
          slides={slides}
          count={todayCount}
          settings={settings}
          sliderKey={sliderKey}
          onSignIn={() => setScreen("form")}
          onScan={() => setScreen("scan")}
        />
      ) : null}
      {screen === "scan" ? (
        <ScanScreen
          settings={settings}
          onCard={handleCard}
          onStart={backToStart}
          onManual={() => setScreen("form")}
        />
      ) : null}
      {screen === "form" ? (
        <KioskForm reasons={reasons} settings={settings} onSubmit={handleSubmit} onBack={backToStart} />
      ) : null}
      {screen === "welcome" ? <WelcomeScreen name={guest} settings={settings} onDone={backToStart} /> : null}
    </div>
  );
}