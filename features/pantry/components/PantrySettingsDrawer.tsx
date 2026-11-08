"use client";

import { MoonStar, SunMedium, X } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type PantrySettingsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onLogout: () => void;
};

export function PantrySettingsDrawer({
  open,
  onOpenChange,
  theme,
  onThemeChange,
  onLogout,
}: PantrySettingsDrawerProps) {
  const { t, locale, setLocale, locales, localeLabels } = useLocale();

  return (
    <Drawer open={open} modal={true} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto h-[calc(100dvh-env(safe-area-inset-top))] max-h-none max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-6rem)]">
        <DrawerHeader className="border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle className="text-lg font-semibold text-foreground">
              {t.menu}
            </DrawerTitle>
            <DrawerClose
              type="button"
              aria-label={t.close}
              className="rounded-full border border-border bg-muted p-2 text-muted-foreground transition hover:border-ring hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-sm text-foreground">
          <section className="rounded-xl border border-border bg-muted/50 p-3">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t.language}
            </p>
            <div className="space-y-2">
              {locales.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setLocale(option);
                    onOpenChange(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all duration-200 ${
                    locale === option
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      : "border-border bg-background text-foreground hover:border-ring"
                  }`}
                >
                  <span>{localeLabels[option]}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {option}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-muted/50 p-3">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t.appearance}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onThemeChange("light")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 ${
                  theme === "light"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : "border-border bg-background text-foreground hover:border-ring"
                }`}
              >
                <SunMedium className="h-4 w-4" />
                <span>{t.light}</span>
              </button>
              <button
                type="button"
                onClick={() => onThemeChange("dark")}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 ${
                  theme === "dark"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : "border-border bg-background text-foreground hover:border-ring"
                }`}
              >
                <MoonStar className="h-4 w-4" />
                <span>{t.dark}</span>
              </button>
            </div>
          </section>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-500 transition-all duration-200 hover:bg-red-500/15 dark:text-red-300"
          >
            <span>{t.logout}</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
