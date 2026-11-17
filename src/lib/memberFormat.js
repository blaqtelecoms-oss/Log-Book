/**
 * Library card helpers shared by the members screen, the kiosk scanner and the
 * server functions. A card number is the value printed under the barcode on the
 * card — compared case-insensitively and without spaces so "emf 985657" and
 * "EMF-985657" are the same card.
 */
export function normaliseCard(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/** Visits created by scanning a card are recorded under this reason. */
export const CARD_REASON = "Access card check-in";

/** Every payload this app writes into a card's QR code starts with this prefix. */
export const CARD_PREFIX = "EMFLIB";

/**
 * The QR code on a member's card carries both identifiers: the card number and
 * the member's record id. A member that has not been saved yet has no id, so
 * their preview code carries the card number alone.
 */
export function cardPayload(member) {
  const card = normaliseCard(member?.card_number);
  if (!card) return "";
  const id = String(member?.id ?? "").trim();
  return id ? `${CARD_PREFIX}:${card}:${id}` : card;
}

/**
 * Reads what the camera picked up: our own QR payload, or a plain printed
 * barcode, which yields the card number on its own.
 */
export function parseCardScan(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return { card: "", memberId: "" };
  const parts = raw.split(":");
  if (parts.length >= 2 && parts[0].toUpperCase() === CARD_PREFIX) {
    return { card: normaliseCard(parts[1]), memberId: parts[2] ? parts[2].trim() : "" };
  }
  return { card: normaliseCard(raw), memberId: "" };
}