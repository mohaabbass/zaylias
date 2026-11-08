"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { useLocale } from "@/components/providers/LocaleProvider";
import { PantryView } from "@/features/pantry/components/PantryView";

type PantryAppProps = {
  userId: string;
  paymentsRefreshToken: number;
  onLogout: () => void;
  onSwitchApps: () => void;
  onOpenEconomyPayments: () => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
};

export function PantryApp({
  userId,
  paymentsRefreshToken,
  onLogout,
  onSwitchApps,
  onOpenEconomyPayments,
  theme,
  onThemeChange,
}: PantryAppProps) {
  const { t } = useLocale();

  return (
    <>
      <AppHeader
        title={t.appTitle}
        userId={userId}
        paymentsRefreshToken={paymentsRefreshToken}
        onLogout={onLogout}
        onSwitchApps={onSwitchApps}
        onOpenPayments={onOpenEconomyPayments}
      />
      <PantryView
        userId={userId}
        onLogout={onLogout}
        theme={theme}
        onThemeChange={onThemeChange}
      />
    </>
  );
}
