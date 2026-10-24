import type { Translation } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";

type BalanceCardProps = {
  totalBalance: number;
  locale?: string;
  t: Translation;
};

export function BalanceCard({
  totalBalance,
  locale = "sv",
  t,
}: BalanceCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">
        {t.totalBalance}
      </p>
      <p
        className={`mt-1 text-3xl font-bold ${
          totalBalance < 0
            ? "text-red-500"
            : "text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {formatCurrency(
          totalBalance,
          locale === "ar" ? "ar-EG" : locale === "en" ? "en-US" : "sv-SE",
        )}{" "}
        {t.currency}
      </p>
    </div>
  );
}
