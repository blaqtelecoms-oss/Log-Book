import { useCallback, useEffect, useState } from "react";
import { applyTheme, readTheme, storeTheme } from "@/lib/theme";

/** Light / dark / system, applied to the document root and remembered per device. */
export function useTheme() {
  const [theme, setThemeState] = useState("system");

  useEffect(() => {
    const stored = readTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    storeTheme(next);
  }, []);

  return { theme, setTheme };
}