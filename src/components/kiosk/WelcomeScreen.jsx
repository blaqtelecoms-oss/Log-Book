import { useEffect, useState } from "react";
import { applyWelcomeMessage } from "@/lib/kioskFormat";

/** Success screen: green tick in a gold countdown ring, then back to the banner. */
export default function WelcomeScreen({ name, settings, onDone }) {
  const seconds = Number(settings.redirect_seconds) || 5;
  const [left, setLeft] = useState(seconds);
  const [run, setRun] = useState(false);

  useEffect(() => {
    setRun(true);
    const tick = setInterval(() => setLeft((n) => (n > 0 ? n - 1 : 0)), 1000);
    const go = setTimeout(() => onDone(), seconds * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(go);
    };
  }, [seconds, onDone]);

  const message = applyWelcomeMessage(settings.welcome_message, name);

  return (
    <div className={run ? "ok run" : "ok"} style={{ "--ok-d": `${seconds}s` }}>
      <div className="ok-ring">
        <svg viewBox="0 0 150 150">
          <circle className="bgc" cx="75" cy="75" r="70" fill="none" strokeWidth="5" />
          <circle className="prc" cx="75" cy="75" r="70" fill="none" strokeWidth="5" />
        </svg>
        <div className="ok-tick">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
      </div>

      <span className="emf-eyebrow">Signed in</span>
      <h2>
        {message.before}
        <b>{message.name}</b>
        {message.after}
      </h2>
      <p>Your visit has been recorded. Have a good day!</p>
      <p className="small">Returning to the start in {left}…</p>
    </div>
  );
}