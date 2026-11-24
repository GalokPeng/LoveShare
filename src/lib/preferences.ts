import type { Theme } from "./model";

export function readPreference(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Browsing and filtering still work when storage is unavailable.
  }
}

export const themeKey = "loveshare-theme";
const themes = ["system", "light", "dark"];

export function readTheme(): Theme | null {
  const theme = readPreference(themeKey);
  return theme && themes.includes(theme) ? (theme as Theme) : null;
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}
