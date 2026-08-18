import { useCallback, useEffect, useState } from 'react';

/**
 * Light-first theme system. The app defaults to the warm "paper" light theme;
 * a toggle flips to the hand-drawn dark palette. The choice is persisted and
 * applied as a `.dark` class on <html> (the Tailwind `dark:` variant + our
 * token blocks in index.css key off it).
 */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'gensite-theme';
const THEME_EVENT = 'gensite:themechange';

export function getStoredTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  }
  return 'light';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

/** Run once, synchronously, before React renders — avoids a flash of the wrong theme. */
export function initTheme() {
  apply(getStoredTheme());
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage may be unavailable (private mode); the class still applies for this session.
  }
  apply(theme);
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

/** Reactive theme state + a toggle. Every consumer stays in sync via the shared event. */
export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const onChange = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail);
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme]);

  return { theme, toggle, setTheme };
}
