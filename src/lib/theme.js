/** Light / dark / system theme, persisted per device. */

const KEY = "emf-theme";

export function readTheme() {
  if (typeof window === "undefined") return "system";
  return window.localStorage.getItem(KEY) || "system";
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  if (theme === "dark") root.classList.add("dark");
  if (theme === "light") root.classList.add("light");
}

export function storeTheme(theme) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, theme);
  applyTheme(theme);
}