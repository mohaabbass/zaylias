import { useMemo } from "react";

import type { Translation, Locale } from "@/lib/i18n";
import { getCategoryLabel, normalizeCategoryValue } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

type StatisticsCategoryChartProps = {
  transactions: Transaction[];
  locale: Locale;
  t: Translation;
};

const categoryColors = [
  "bg-blue-600",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];

export function StatisticsCategoryChart({
  transactions,
  locale,
  t,
}: StatisticsCategoryChartProps) {
  const data = useMemo(() => {
    const totals = new Map<string, { amount: number; count: number }>();

    for (const transaction of transactions) {
      if (transaction.type !== "expense") continue;

      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount)) continue;

      const category = normalizeCategoryValue(transaction.category);
      const current = totals.get(category) ?? { amount: 0, count: 0 };
      totals.set(category, {
        amount: current.amount + amount,
        count: current.count + 1,
      });
    }

    const categories = [...t.expenseCategories];
    for (const category of totals.keys()) {
      if (!categories.some((option) => option.value === category)) {
        categories.push({
          value: category,
          label: getCategoryLabel(locale, category),
        });
      }
    }

    return categories
      .map((category, index) => ({
        key: category.value,
        label: category.label,
        value: totals.get(category.value)?.amount ?? 0,
        count: totals.get(category.value)?.count ?? 0,
        color: categoryColors[index % categoryColors.length],
      }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [locale, t.expenseCategories, transactions]);

  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const currencyLocale =
    locale === "ar" ? "ar-EG" : locale === "en" ? "en-US" : "sv-SE";

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-lg font-semibold text-foreground">
        {t.expensesByCategory}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {t.expensesByCategoryDescription}
      </p>

      {data.length > 0 ? (
        <>
          <div
            className="mt-6 flex h-3 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={t.expensesByCategory}
          >
            {data.map((entry) => {
              const percentage = (entry.value / total) * 100;

              return (
                <div
                  key={entry.key}
                  className={`h-full ${entry.color}`}
                  style={{ width: `${percentage}%` }}
                  title={`${entry.label}: ${percentage.toFixed(0)}%`}
                />
              );
            })}
          </div>

          <div className="mt-7 space-y-5">
            {data.map((entry) => {
              const percentage = (entry.value / total) * 100;

              return (
                <div
                  key={entry.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 rounded-full ${entry.color}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-foreground">
                        {entry.label}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {t.expenseCount(entry.count)} ·{" "}
                        {formatCurrency(entry.value, currencyLocale)}{" "}
                        {t.currency}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-2.5 w-16 overflow-hidden rounded-full bg-muted sm:w-20"
                      role="meter"
                      aria-label={entry.label}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                    >
                      <div
                        className="h-full rounded-full bg-foreground/80"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-9 text-end text-sm text-muted-foreground">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{t.noSpendData}</p>
      )}
    </section>
  );
}
