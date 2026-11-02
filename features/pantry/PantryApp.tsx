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
};

export function PantryApp({
  userId,
  paymentsRefreshToken,
  onLogout,
  onSwitchApps,
  onOpenEconomyPayments,
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
      <PantryView userId={userId} onOpenApps={onSwitchApps} />
    </>
  );
}
