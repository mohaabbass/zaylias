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
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-teal-500",
];

export function StatisticsCategoryChart({
  transactions,
  locale,
  t,
}: StatisticsCategoryChartProps) {
  const data = useMemo(() => {
    const totals = new Map<string, number>();

    for (const transaction of transactions) {
      if (transaction.type !== "expense") continue;

      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount)) continue;

      const category = normalizeCategoryValue(transaction.category);
      totals.set(category, (totals.get(category) ?? 0) + amount);
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

    return categories.map((category, index) => ({
      key: category.value,
      label: category.label,
      value: totals.get(category.value) ?? 0,
      color: categoryColors[index % categoryColors.length],
    }));
  }, [locale, t.expenseCategories, transactions]);

  const maxValue = Math.max(...data.map((entry) => entry.value), 1);
  const currencyLocale =
    locale === "ar" ? "ar-EG" : locale === "en" ? "en-US" : "sv-SE";

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-base font-semibold text-foreground">
        {t.expensesByCategory}
      </h3>

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
