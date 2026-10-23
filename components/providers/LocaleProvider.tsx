"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { localeLabels, locales, translations, type Locale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (value: Locale) => void;
  t: (typeof translations)[Locale];
  localeLabels: typeof localeLabels;
  locales: typeof locales;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "sv";
  }

  const savedLocale = window.localStorage.getItem(
    "zaylias-locale",
  ) as Locale | null;
  if (savedLocale && locales.includes(savedLocale)) {
    return savedLocale;
  }

  return "sv";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    window.localStorage.setItem("zaylias-locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: translations[locale],
      localeLabels,
      locales,
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>
      <div className="fixed top-3 right-3 z-10 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-lg">
        <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">
          {translations[locale].language}
        </label>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white outline-none"
        >
          {locales.map((option) => (
            <option key={option} value={option}>
              {localeLabels[option]}
            </option>
          ))}
        </select>
      </div>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}
