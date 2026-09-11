"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { en } from "./en";
import { de } from "./de";

export type Locale = "en" | "de";
export type TranslationKey = keyof typeof en;

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { en, de };
const STORAGE_KEY = "locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

// A per-device preference (like CollapsibleSection's remembered open/closed
// state), not synced through the account — deliberately, so switching it
// needs no server round trip and works even on the pre-login auth pages.
// Starts at "en" so server and client agree on the first paint, then
// corrects to whatever's in localStorage right after mount (same reasoning
// as CollapsibleSection's own "restore after mount" comment) — a brief
// flash of English on first load is the tradeoff.
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "de") setLocaleState(stored);
    } catch {
      // localStorage can throw (private browsing, blocked) — default stays.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — nothing to persist to
    }
  }

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    let str: string = DICTIONARIES[locale][key];
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        str = str.replaceAll(`{${name}}`, String(value));
      }
    }
    return str;
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

// Convenience for the common case of only needing the translate function.
export function useT() {
  return useLocale().t;
}
