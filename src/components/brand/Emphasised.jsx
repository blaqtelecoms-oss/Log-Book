import { splitEmphasis } from "@/lib/kioskFormat";

/** Renders text where *asterisks* mark the italicised, gold-gradient key words. */
export default function Emphasised({ text = "" }) {
  return (
    <>
      {splitEmphasis(text).map((part, i) =>
        part.em ? <em key={i}>{part.text}</em> : <span key={i}>{part.text}</span>,
      )}
    </>
  );
}