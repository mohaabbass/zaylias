import { useMemo } from "react";

import type { Translation, Locale } from "@/lib/i18n";
import { getCategoryLabel, normalizeCategoryValue } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

type StatisticsChartProps = {
  transactions: Transaction[];
  locale: Locale;
  t: Translation;
};

export function StatisticsChart({
  transactions,
  locale,
  t,
}: StatisticsChartProps) {
  const data = useMemo(() => {
    const totals = {
      income: 0,
      expense: 0,
      bills: 0,
      subscriptions: 0,
    };

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount)) continue;

      if (transaction.type === "income") {
        totals.income += amount;
        continue;
      }

      if (transaction.type !== "expense") continue;

      totals.expense += amount;
      const category = normalizeCategoryValue(transaction.category);
      if (category === "bills" || category === "subscriptions") {
        totals[category] += amount;
      }
    }

    return [
      {
        key: "income",
        label: t.income,
        value: totals.income,
        color: "bg-emerald-500",
      },
      {
        key: "expense",
        label: t.expense,
        value: totals.expense,
        color: "bg-red-500",
      },
      {
        key: "bills",
        label: getCategoryLabel(locale, "bills"),
        value: totals.bills,
        color: "bg-amber-500",
      },
      {
        key: "subscriptions",
        label: getCategoryLabel(locale, "subscriptions"),
        value: totals.subscriptions,
        color: "bg-sky-500",
      },
    ];
  }, [locale, t, transactions]);

  const maxValue = Math.max(...data.map((entry) => entry.value), 1);
  const currencyLocale =
    locale === "ar" ? "ar-EG" : locale === "en" ? "en-US" : "sv-SE";

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-base font-semibold text-foreground">
        {t.statisticsChartTitle}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t.statisticsChartDescription}
      </p>

      <div className="mt-5 space-y-4">
        {data.map((entry) => {
          const percentage = (entry.value / maxValue) * 100;

          return (
            <div key={entry.key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">
                  {entry.label}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {formatCurrency(entry.value, currencyLocale)} {t.currency}
                </span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-label={entry.label}
                aria-valuemin={0}
                aria-valuemax={maxValue}
                aria-valuenow={entry.value}
              >
                <div
                  className={`h-full rounded-full ${entry.color}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
