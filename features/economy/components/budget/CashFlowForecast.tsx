"use client";

import { useMemo } from "react";

import type { Locale } from "@/lib/i18n";
import type { EconomyTranslation } from "@/features/economy/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/features/economy/types/finance";
import { getBudgetPeriod } from "@/features/economy/utils/budgetPeriod";

export type ScheduledForecastPayment = {
  amount: number | string;
  due_date: string;
};

type CashFlowForecastProps = {
  transactions: Transaction[];
  payments: ScheduledForecastPayment[];
  totalBalance: number;
  loading: boolean;
  error: string;
  locale: Locale;
  t: EconomyTranslation;
  budgetStartDay: number;
};

const localeMap: Record<Locale, string> = {
  sv: "sv-SE",
  en: "en-US",
};

export function CashFlowForecast({
  transactions,
  payments,
  totalBalance,
  loading,
  error,
  locale,
  t,
  budgetStartDay,
}: CashFlowForecastProps) {
  const now = new Date();
  const budgetPeriod = getBudgetPeriod(budgetStartDay, now);
  const dateFormatter = new Intl.DateTimeFormat(localeMap[locale], {
    dateStyle: "medium",
  });
  const periodEnd = new Date(budgetPeriod.endExclusive);
  periodEnd.setDate(periodEnd.getDate() - 1);
  const periodLabel = `${dateFormatter.format(budgetPeriod.start)} – ${dateFormatter.format(periodEnd)}`;
  const periodStartKey = `${budgetPeriod.start.getFullYear()}-${String(budgetPeriod.start.getMonth() + 1).padStart(2, "0")}-${String(budgetPeriod.start.getDate()).padStart(2, "0")}`;
  const periodEndKey = `${budgetPeriod.endExclusive.getFullYear()}-${String(budgetPeriod.endExclusive.getMonth() + 1).padStart(2, "0")}-${String(budgetPeriod.endExclusive.getDate()).padStart(2, "0")}`;

  const periodTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      if (
        !transaction.transaction_date ||
        transaction.transaction_date < periodStartKey ||
        transaction.transaction_date >= periodEndKey ||
        !Number.isFinite(amount)
      ) {
        continue;
      }

      if (transaction.type === "income") {
        income += amount;
      } else if (transaction.type === "expense") {
        expenses += amount;
      }
    }

    return { income, expenses };
  }, [periodEndKey, periodStartKey, transactions]);

  const scheduledTotal = payments.reduce((sum, payment) => {
    const amount = Number(payment.amount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
  const projectedCashFlow =
    periodTotals.income - periodTotals.expenses - scheduledTotal;
  const projectedBalance = totalBalance - scheduledTotal;
  const currencyLocale = localeMap[locale];
  const formatAmount = (amount: number) =>
    `${formatCurrency(amount, currencyLocale)} ${t.currency}`;
  const projectedAmountsAvailable = !loading && !error;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t.monthlyCashFlowForecast}
          </h2>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {t.budgetPeriod}: {periodLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground">
          {t.projectedEndOfMonthBalance}
        </p>
        <p
          className={`mt-1 text-2xl font-bold tabular-nums ${
            projectedAmountsAvailable && projectedBalance < 0
              ? "text-red-500"
              : "text-foreground"
          }`}
        >
          {projectedAmountsAvailable ? formatAmount(projectedBalance) : "—"}
        </p>
      </div>

      <dl className="mt-4 space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-sm">
          <dt className="min-w-0 text-muted-foreground">{t.income}</dt>
          <dd className="whitespace-nowrap text-end font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatAmount(periodTotals.income)}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-sm">
          <dt className="min-w-0 text-muted-foreground">{t.expense}</dt>
          <dd className="whitespace-nowrap text-end font-medium tabular-nums text-red-500">
            {formatAmount(periodTotals.expenses)}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-sm">
          <dt className="min-w-0 text-muted-foreground">
            {t.unpaidPaymentsInPeriod}
          </dt>
          <dd className="whitespace-nowrap text-end font-medium tabular-nums text-foreground">
            {loading
              ? t.loading
              : error
                ? "—"
                : formatAmount(scheduledTotal)}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-t border-border pt-3 text-sm">
          <dt className="min-w-0 font-medium leading-snug text-foreground">
            {t.projectedCashFlowInPeriod}
          </dt>
          <dd
            className={`whitespace-nowrap text-end font-semibold tabular-nums ${
              projectedAmountsAvailable && projectedCashFlow < 0
                ? "text-red-500"
                : "text-foreground"
            }`}
          >
            {projectedAmountsAvailable
              ? formatAmount(projectedCashFlow)
              : "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {t.cashFlowForecastDescription}
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-3 text-xs text-red-600 dark:text-red-300"
        >
          {t.cashFlowForecastLoadError} {error}
        </p>
      ) : null}
    </section>
  );
}
