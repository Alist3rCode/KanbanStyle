import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Theme = "system" | "light" | "dark";

const THEME_KEY = "theme";

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const isDark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    applyTheme("system");
    api
      .get<{ value: Theme | null }>(`/settings/${THEME_KEY}`)
      .then(({ value }) => {
        const initial = value ?? "system";
        setThemeState(initial);
        applyTheme(initial);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    void api.put(`/settings/${THEME_KEY}`, { value: next });
  }, []);

  return { theme, setTheme };
}
