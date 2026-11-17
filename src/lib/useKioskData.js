import { useQuery } from "@tanstack/react-query";
import { getKioskData, signInWithCard, submitVisit } from "@/lib/kiosk-fns";
import { FALLBACK_REASONS, FALLBACK_SETTINGS, FALLBACK_SLIDES } from "@/lib/kioskData";

const DEVICE_KEY = "emf-kiosk-device";

function deviceId() {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (window.crypto?.randomUUID?.() ?? `dev-${Date.now()}`).slice(0, 64);
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/**
 * The library's live kiosk content, refreshed in the background so the visitor
 * counter stays current. Falls back to the bundled defaults until it loads.
 */
export function useKioskData() {
  const query = useQuery({
    queryKey: ["kiosk-data"],
    queryFn: () => getKioskData(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  const data = query.data;

  const submit = async (payload) => {
    const result = await submitVisit({
      data: { ...payload, website: payload.website ?? "", device_id: deviceId() },
    });
    if (result?.ok === false) {
      if (result.reason === "rate_limited") {
        throw new Error("Too many sign-ins from this device. Please ask the front desk for help.");
      }
      if (result.reason === "invalid_reason") {
        throw new Error("That reason is no longer available. Please choose another.");
      }
      throw new Error("We could not check your details. Please review the form and try again.");
    }
    query.refetch();
  };

  // A scanned card is checked and signed in on the server; only the outcome comes back.
  const scan = async (code) => {
    const result = await signInWithCard({ data: { code, device_id: deviceId() } });
    if (result?.ok) query.refetch();
    return {
      ...result,
      message:
        result?.reason === "rate_limited"
          ? "Too many sign-ins from this device right now. Please ask the front desk for help."
          : result?.reason === "unknown_card"
            ? "That card isn't registered here yet. Please sign in with the form, or ask the front desk for help."
            : "We couldn't check that card just now. Please sign in with the form instead.",
    };
  };

  return {
    slides: data?.slides?.length ? data.slides : FALLBACK_SLIDES,
    reasons: data?.reasons?.length ? data.reasons : FALLBACK_REASONS,
    settings: { ...FALLBACK_SETTINGS, ...(data?.settings ?? {}) },
    todayCount: data?.todayCount ?? 0,
    isLoading: query.isLoading,
    submitVisit: submit,
    scanCard: scan,
  };
}