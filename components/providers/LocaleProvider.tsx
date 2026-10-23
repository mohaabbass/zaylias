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
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.locale = locale;
    document.documentElement.style.setProperty(
      "--font-sans",
      locale === "ar" ? "var(--font-cairo)" : "var(--font-inter)",
    );
    document.documentElement.style.setProperty(
      "--font-heading",
      locale === "ar" ? "var(--font-cairo)" : "var(--font-inter)",
    );
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
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}
