import { normaliseCard } from "@/lib/memberFormat";

/** A tidy file name for a saved card, e.g. "Thandi-Mokoena-EMF-985657-card.png". */
export function cardFileName(member) {
  const card = normaliseCard(member?.card_number) || "card";
  const name = String(member?.full_name || "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name ? `${name}-${card}-card.png` : `${card}-card.png`;
}

/**
 * Draws a library card and hands the image to the browser to download.
 * html2canvas is loaded on demand so it never reaches the server render.
 */
export async function saveCardImage(node, member) {
  if (!node) throw new Error("There is no card to save.");

  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(node, { scale: 3, backgroundColor: null, useCORS: true, logging: false });

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Could not draw the card."))), "image/png");
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = cardFileName(member);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);

  return { width: canvas.width, height: canvas.height };
}