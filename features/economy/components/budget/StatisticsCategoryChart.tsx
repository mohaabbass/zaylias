import { useState } from "react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Locale } from "@/lib/i18n";
import type { EconomyTranslation } from "@/features/economy/i18n";
import {
  getCategoryLabel,
  normalizeCategoryValue,
} from "@/features/economy/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/features/economy/types/finance";
import {
  getPreviousBudgetPeriod,
  type BudgetPeriod,
  type StoredBudgetPeriod,
} from "@/features/economy/utils/budgetPeriod";

type StatisticsCategoryChartProps = {
  transactions: Transaction[];
  locale: Locale;
  t: EconomyTranslation;
  budgetPeriod: BudgetPeriod;
  budgetPeriods: StoredBudgetPeriod[];
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

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function StatisticsCategoryChart({
  transactions,
  locale,
  t,
  budgetPeriod,
  budgetPeriods,
}: StatisticsCategoryChartProps) {
  const [isComparing, setIsComparing] = useState(false);
  const [comparePeriodOffset, setComparePeriodOffset] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const currentPeriod = budgetPeriod;
  const comparisonPeriods = (() => {
    const periods = [];
    let previousPeriod = currentPeriod;

    for (let offset = 1; offset <= 12; offset += 1) {
      const period = getPreviousBudgetPeriod(previousPeriod, budgetPeriods);
      periods.push({ offset, ...period });
      previousPeriod = period;
    }

    return periods;
  })();
  const comparisonPeriod =
    comparisonPeriods.find(({ offset }) => offset === comparePeriodOffset) ??
    comparisonPeriods[0];
  const localeCode = locale === "en" ? "en-US" : "sv-SE";
  const monthFormatter = new Intl.DateTimeFormat(localeCode, {
    month: "long",
    year: "numeric",
  });
  const currencyLocale = localeCode;
  const currentStartKey = getDateKey(currentPeriod.start);
  const currentEndKey = getDateKey(currentPeriod.endExclusive);
  const compareStartKey = getDateKey(comparisonPeriod.start);
  const compareEndKey = getDateKey(comparisonPeriod.endExclusive);

  const data = (() => {
    const currentTotals = new Map<string, { amount: number; count: number }>();
    const comparisonTotals = new Map<string, number>();

    for (const transaction of transactions) {
      if (transaction.type !== "expense") continue;

      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount)) continue;

      const category = normalizeCategoryValue(transaction.category);
      const transactionDate = transaction.transaction_date;
      if (!transactionDate) continue;

      if (transactionDate >= currentStartKey && transactionDate < currentEndKey) {
        const current = currentTotals.get(category) ?? { amount: 0, count: 0 };
        currentTotals.set(category, {
          amount: current.amount + amount,
          count: current.count + 1,
        });
      } else if (
        transactionDate >= compareStartKey &&
        transactionDate < compareEndKey
      ) {
        comparisonTotals.set(
          category,
          (comparisonTotals.get(category) ?? 0) + amount,
        );
      }
    }

    const categories = [...t.expenseCategories];
    for (const category of [
      ...currentTotals.keys(),
      ...comparisonTotals.keys(),
    ]) {
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
        count: currentTotals.get(category.value)?.count ?? 0,
        currentAmount: currentTotals.get(category.value)?.amount ?? 0,
        comparisonAmount: comparisonTotals.get(category.value) ?? 0,
        color: categoryColors[index % categoryColors.length],
      }))
      .filter((entry) =>
        isComparing
          ? entry.currentAmount > 0 || entry.comparisonAmount > 0
          : entry.currentAmount > 0,
      )
      .sort((a, b) => b.currentAmount - a.currentAmount);
  })();

  const currentPeriodTotal = data.reduce(
    (sum, entry) => sum + entry.currentAmount,
    0,
  );
  const maxPeriodAmount = Math.max(
    0,
    ...data.flatMap((entry) => [entry.currentAmount, entry.comparisonAmount]),
  );
  const selectedEntry = data.find((entry) => entry.key === selectedCategory);
  const selectedExpenses = selectedCategory
    ? transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" &&
            normalizeCategoryValue(transaction.category) === selectedCategory &&
            transaction.transaction_date >= currentStartKey &&
            transaction.transaction_date < currentEndKey &&
            Number.isFinite(Number(transaction.amount)),
        )
        .sort(
          (a, b) =>
            b.transaction_date.localeCompare(a.transaction_date) ||
            b.created_at.localeCompare(a.created_at),
        )
    : [];
  const selectedExpenseTotal = selectedExpenses.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );

  return (
    <Drawer
      open={selectedCategory !== null}
      onOpenChange={(open) => {
        if (!open) setSelectedCategory(null);
      }}
    >
      <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t.expensesByCategory}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {t.expensesByCategoryDescription}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={isComparing}
          onClick={() => setIsComparing((current) => !current)}
          className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            isComparing
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-border bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {isComparing ? t.hideMonthComparison : t.compareMonths}
        </button>
      </div>

      {isComparing ? (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {t.currentBudgetPeriod}:
              </span>{" "}
              {currentPeriod.name || monthFormatter.format(currentPeriod.start)}
            </p>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t.compareWith}</span>
              <select
                aria-label={t.compareWith}
                className="min-h-10 max-w-48 rounded-lg border border-border bg-muted px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                value={comparePeriodOffset}
                onChange={(event) =>
                  setComparePeriodOffset(Number(event.target.value))
                }
              >
                {comparisonPeriods.map((period) => (
                  <option key={period.offset} value={period.offset}>
                    {period.name || monthFormatter.format(period.start)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>{t.currentBudgetPeriod}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
              <span>
                {t.comparisonBudgetPeriod}:{" "}
                {comparisonPeriod.name ||
                  monthFormatter.format(comparisonPeriod.start)}
              </span>
            </div>
          </div>

          {data.length > 0 ? (
            <div className="mt-6 space-y-5">
              {data.map((entry) => (
                <div key={entry.key} className="space-y-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.label}
                  </p>
                  {(
                    [
                      [
                        t.currentBudgetPeriod,
                        entry.currentAmount,
                        "bg-emerald-500",
                      ],
                      [
                        t.comparisonBudgetPeriod,
                        entry.comparisonAmount,
                        "bg-muted-foreground/50",
                      ],
                    ] as const
                  ).map(([label, amount, color]) => (
                    <div
                      key={label}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                    >
                      <div
                        className="h-2.5 overflow-hidden rounded-full bg-muted"
                        role="meter"
                        aria-label={`${entry.label} — ${label}`}
                        aria-valuemin={0}
                        aria-valuemax={maxPeriodAmount}
                        aria-valuenow={amount}
                      >
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{
                            width: `${
                              maxPeriodAmount > 0
                                ? (amount / maxPeriodAmount) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="min-w-20 text-end text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(amount, currencyLocale)} {t.currency}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">{t.noSpendData}</p>
          )}
        </>
      ) : data.length > 0 ? (
        <>
          <div
            className="mt-6 flex h-3 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={t.expensesByCategory}
          >
            {data.map((entry) => {
              const percentage =
                (entry.currentAmount / currentPeriodTotal) * 100;

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
              const percentage =
                (entry.currentAmount / currentPeriodTotal) * 100;

              return (
                <button
                  key={entry.key}
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={selectedCategory === entry.key}
                  onClick={() => setSelectedCategory(entry.key)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 rounded-full ${entry.color}`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium text-foreground">
                        {entry.label}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {t.expenseCount(entry.count)} ·{" "}
                        {formatCurrency(entry.currentAmount, currencyLocale)}{" "}
                        {t.currency}
                      </span>
                    </span>
                  </span>

                  <span className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-16 overflow-hidden rounded-full bg-muted sm:w-20"
                      role="meter"
                      aria-label={entry.label}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                    >
                      <span
                        className="block h-full rounded-full bg-foreground/80"
                        style={{ width: `${percentage}%` }}
                      />
                    </span>
                    <span className="w-9 text-end text-sm text-muted-foreground">
                      {percentage.toFixed(0)}%
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{t.noSpendData}</p>
      )}
      </section>
      <DrawerContent className="mx-auto max-h-[85dvh] max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl">
        <DrawerHeader className="border-b border-border px-5 pb-4 pt-5">
          <DrawerTitle className="text-lg font-semibold text-foreground">
            {selectedEntry?.label ?? t.expensesByCategory}
          </DrawerTitle>
          <DrawerDescription className="mt-1">
            {t.expenseCount(selectedExpenses.length)} ·{" "}
            {formatCurrency(selectedExpenseTotal, currencyLocale)} {t.currency}
          </DrawerDescription>
          <DrawerClose className="mt-3 self-end rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
            {t.close}
          </DrawerClose>
        </DrawerHeader>
        <ul className="max-h-[65dvh] space-y-2 overflow-y-auto px-5 py-4">
          {selectedExpenses.map((transaction) => {
            const transactionDate = new Date(
              `${transaction.transaction_date}T00:00:00Z`,
            );
            const formattedDate = Number.isNaN(transactionDate.getTime())
              ? transaction.transaction_date
              : new Intl.DateTimeFormat(localeCode, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(transactionDate);

            return (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/60 p-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {transaction.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formattedDate}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-red-500">
                  −{formatCurrency(Number(transaction.amount), currencyLocale)}{" "}
                  {t.currency}
                </span>
              </li>
            );
          })}
        </ul>
      </DrawerContent>
    </Drawer>
  );
}
