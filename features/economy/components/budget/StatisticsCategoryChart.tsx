import { useState } from "react";
import { ChartNoAxesColumn, ChartPie, ListFilter, X } from "lucide-react";

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
  toBudgetPeriod,
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

type CategorySortOption = "amount" | "count" | "name";

function isCategorySortOption(value: string): value is CategorySortOption {
  return value === "amount" || value === "count" || value === "name";
}

const categoryColors = [
  { className: "bg-blue-600", chartColor: "#2563eb" },
  { className: "bg-emerald-500", chartColor: "#10b981" },
  { className: "bg-amber-500", chartColor: "#f59e0b" },
  { className: "bg-purple-500", chartColor: "#a855f7" },
  { className: "bg-pink-500", chartColor: "#ec4899" },
  { className: "bg-cyan-500", chartColor: "#06b6d4" },
  { className: "bg-indigo-500", chartColor: "#6366f1" },
  { className: "bg-teal-500", chartColor: "#14b8a6" },
  { className: "bg-orange-500", chartColor: "#f97316" },
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
  const [isCircularChart, setIsCircularChart] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<string[] | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [sortBy, setSortBy] = useState<CategorySortOption>("amount");
  const [comparePeriodOffset, setComparePeriodOffset] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const currentPeriod = budgetPeriod;
  const currentStartKey = getDateKey(currentPeriod.start);
  const comparisonPeriods = budgetPeriods
    .filter((period) => period.endDate < currentStartKey)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((period, index) => ({ offset: index + 1, ...toBudgetPeriod(period) }));
  const comparisonPeriod =
    comparisonPeriods.find(({ offset }) => offset === comparePeriodOffset) ??
    comparisonPeriods[0] ??
    currentPeriod;
  const localeCode = locale === "en" ? "en-US" : "sv-SE";
  const monthFormatter = new Intl.DateTimeFormat(localeCode, {
    month: "long",
    year: "numeric",
  });
  const currencyLocale = localeCode;
  const percentageFormatter = new Intl.NumberFormat(localeCode, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "always",
  });
  const currentEndKey = getDateKey(currentPeriod.endExclusive);
  const compareStartKey = getDateKey(comparisonPeriod.start);
  const compareEndKey = getDateKey(comparisonPeriod.endExclusive);

  const allData = (() => {
    const currentTotals = new Map<string, { amount: number; count: number }>();
    const comparisonTotals = new Map<string, number>();

    for (const transaction of transactions) {
      if (transaction.type !== "expense") continue;

      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount)) continue;

      const category = normalizeCategoryValue(transaction.category);
      const transactionDate = transaction.transaction_date;
      if (!transactionDate) continue;

      if (
        transactionDate >= currentStartKey &&
        transactionDate < currentEndKey
      ) {
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
      .map((category, index) => {
        const color = categoryColors[index % categoryColors.length];

        return {
          key: category.value,
          label: category.label,
          count: currentTotals.get(category.value)?.count ?? 0,
          currentAmount: currentTotals.get(category.value)?.amount ?? 0,
          comparisonAmount: comparisonTotals.get(category.value) ?? 0,
          colorClass: color.className,
          chartColor: color.chartColor,
        };
      })
      .filter((entry) =>
        isComparing
          ? entry.currentAmount > 0 || entry.comparisonAmount > 0
          : entry.currentAmount > 0,
      );
  })();

  const data = allData
    .filter(
      (entry) => categoryFilters === null || categoryFilters.includes(entry.key),
    )
    .sort((a, b) => {
      if (sortBy === "count") {
        return b.count - a.count || b.currentAmount - a.currentAmount;
      }
      if (sortBy === "name") {
        return a.label.localeCompare(b.label, localeCode);
      }
      return b.currentAmount - a.currentAmount || b.count - a.count;
    });
  const currentPeriodTotal = data.reduce(
    (sum, entry) => sum + entry.currentAmount,
    0,
  );
  const activeCategoryFilterCount =
    categoryFilters === null ? 0 : allData.length - data.length;
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
  const searchableCategories = allData.filter((entry) =>
    entry.label
      .toLocaleLowerCase(localeCode)
      .includes(categorySearch.trim().toLocaleLowerCase(localeCode)),
  );

  return (
    <Drawer
      open={selectedCategory !== null || isFilterOpen}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedCategory(null);
          setIsFilterOpen(false);
        }
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
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              aria-pressed={isComparing}
              disabled={comparisonPeriods.length === 0}
              onClick={() => setIsComparing((current) => !current)}
              className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                comparisonPeriods.length === 0
                  ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-50"
                  : isComparing
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {isComparing ? t.hideMonthComparison : t.compareMonths}
            </button>
            <button
              type="button"
              aria-label={
                isCircularChart
                  ? t.showCategoryBarChart
                  : t.showCategoryDonutChart
              }
              aria-pressed={isCircularChart}
              title={
                isCircularChart
                  ? t.showCategoryBarChart
                  : t.showCategoryDonutChart
              }
              disabled={isComparing || data.length === 0}
              onClick={() => setIsCircularChart((current) => !current)}
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-0"
            >
              {isCircularChart ? (
                <ChartNoAxesColumn aria-hidden="true" className="h-5 w-5" />
              ) : (
                <ChartPie aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              aria-label={t.filters}
              aria-pressed={categoryFilters !== null}
              title={t.filters}
              onClick={() => {
                setCategorySearch("");
                setIsFilterOpen(true);
              }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                categoryFilters !== null
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListFilter aria-hidden="true" className="h-5 w-5" />
              {activeCategoryFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
                  {activeCategoryFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {isComparing ? (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t.currentBudgetPeriod}:
                </span>{" "}
                {currentPeriod.name ||
                  monthFormatter.format(currentPeriod.start)}
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
                {data.map((entry) => {
                  const change =
                    entry.comparisonAmount > 0
                      ? (entry.currentAmount - entry.comparisonAmount) /
                        entry.comparisonAmount
                      : null;
                  const changeLabel =
                    change === null
                      ? t.newSpending
                      : percentageFormatter.format(change);
                  const changeColor =
                    change === null || change > 0
                      ? "text-red-600 dark:text-red-400"
                      : change < 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-muted-foreground";

                  return (
                    <div key={entry.key} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-foreground">
                          {entry.label}
                        </p>
                        <span
                          aria-label={`${t.spendingChangeFromComparison}: ${changeLabel}`}
                          className={`shrink-0 text-xs font-semibold tabular-nums ${changeColor}`}
                        >
                          {changeLabel}
                        </span>
                      </div>
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
                  );
                })}
              </div>
            ) : allData.length > 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                {t.noMatchingCategories}
              </p>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                {t.noSpendData}
              </p>
            )}
          </>
        ) : data.length > 0 ? (
          <>
            {isCircularChart ? (
              <div className="mt-6 flex justify-center">
                <div className="relative h-44 w-44">
                  <svg
                    className="h-full w-full"
                    viewBox="0 0 100 100"
                    role="img"
                    aria-label={`${t.expensesByCategory}: ${data
                      .map(
                        (entry) =>
                          `${entry.label} ${(
                            (entry.currentAmount / currentPeriodTotal) *
                            100
                          ).toFixed(0)}%`,
                      )
                      .join(", ")}`}
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      className="stroke-muted"
                      strokeWidth="16"
                    />
                    {data.map((entry, index) => {
                      const circumference = 2 * Math.PI * 40;
                      const segmentLength =
                        (entry.currentAmount / currentPeriodTotal) *
                        circumference;
                      const offset = data
                        .slice(0, index)
                        .reduce(
                          (sum, previous) =>
                            sum +
                            (previous.currentAmount / currentPeriodTotal) *
                              circumference,
                          0,
                        );

                      return (
                        <circle
                          key={entry.key}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={entry.chartColor}
                          strokeWidth="16"
                          strokeDasharray={`${segmentLength} ${
                            circumference - segmentLength
                          }`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 50 50)"
                        />
                      );
                    })}
                  </svg>
                  <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(currentPeriodTotal, currencyLocale)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.currency}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
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
                      className={`h-full ${entry.colorClass}`}
                      style={{ width: `${percentage}%` }}
                      title={`${entry.label}: ${percentage.toFixed(0)}%`}
                    />
                  );
                })}
              </div>
            )}

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
                        className={`h-4 w-4 shrink-0 rounded-full ${entry.colorClass}`}
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
        ) : allData.length > 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {t.noMatchingCategories}
          </p>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">{t.noSpendData}</p>
        )}
      </section>
      {isFilterOpen ? (
        <DrawerContent className="mx-auto max-h-[85dvh] max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl">
          <DrawerHeader className="border-b border-border px-5 pb-4 pt-5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DrawerTitle className="text-lg font-semibold text-foreground">
                  {t.filterCategories}
                </DrawerTitle>
                <DrawerDescription className="mt-1">
                  {t.filterCategoriesDescription}
                </DrawerDescription>
              </div>
              <DrawerClose
                type="button"
                aria-label={t.close}
                className="rounded-full border border-border bg-muted p-2 text-muted-foreground transition hover:border-ring hover:text-foreground"
              >
                <X aria-hidden="true" className="size-4" />
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="border-b border-border px-5 py-3">
            <label className="flex min-h-10 items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>{t.sortCategories}</span>
              <select
                aria-label={t.sortCategories}
                className="min-h-10 rounded-lg border border-border bg-muted px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                value={sortBy}
                onChange={(event) => {
                  if (isCategorySortOption(event.target.value)) {
                    setSortBy(event.target.value);
                  }
                }}
              >
                <option value="amount">{t.sortCategoriesAmount}</option>
                <option value="count">{t.sortCategoriesCount}</option>
                <option value="name">{t.sortCategoriesName}</option>
              </select>
            </label>
          </div>
          <div className="border-b border-border px-5 py-3">
            <label className="sr-only" htmlFor="category-filter-search">
              {t.searchCategories}
            </label>
            <input
              id="category-filter-search"
              type="search"
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder={t.searchCategories}
              className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="max-h-[50dvh] space-y-1 overflow-y-auto px-5 py-3">
            {searchableCategories.map((entry) => {
                const isIncluded =
                  categoryFilters === null ||
                  categoryFilters.includes(entry.key);

                return (
                  <label
                    key={entry.key}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
                  >
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={() =>
                        setCategoryFilters((current) => {
                          const included =
                            current ?? allData.map((item) => item.key);
                          return isIncluded
                            ? included.filter((key) => key !== entry.key)
                            : [...included, entry.key];
                        })
                      }
                      className="size-4 accent-emerald-600"
                    />
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 shrink-0 rounded-full ${entry.colorClass}`}
                    />
                    <span>{entry.label}</span>
                  </label>
                );
              })}
            {allData.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                {t.noSpendData}
              </p>
            ) : searchableCategories.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                {t.noMatchingCategories}
              </p>
            ) : null}
          </div>
          <div className="flex gap-3 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={() => setCategoryFilters(null)}
              disabled={categoryFilters === null}
              className="min-h-10 flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.clearCategoryFilters}
            </button>
            <DrawerClose className="min-h-10 flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
              {t.close}
            </DrawerClose>
          </div>
        </DrawerContent>
      ) : (
        <DrawerContent className="mx-auto max-h-[85dvh] max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl">
        <DrawerHeader className="border-b border-border px-5 pb-4 pt-5">
          <DrawerTitle className="text-lg font-semibold text-foreground">
            {selectedEntry?.label ?? t.expensesByCategory}
          </DrawerTitle>
          <DrawerDescription className="mt-1">
            {t.expenseCount(selectedExpenses.length)} ·{" "}
            {formatCurrency(selectedExpenseTotal, currencyLocale)} {t.currency}
          </DrawerDescription>
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
      )}
    </Drawer>
  );
}
