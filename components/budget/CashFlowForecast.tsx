"use client";

import { useMemo } from "react";

import type { Locale, Translation } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

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
  t: Translation;
};

const localeMap: Record<Locale, string> = {
  sv: "sv-SE",
  en: "en-US",
  ar: "ar-EG",
};

export function CashFlowForecast({
  transactions,
  payments,
  totalBalance,
  loading,
  error,
  locale,
  t,
}: CashFlowForecastProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthLabel = new Intl.DateTimeFormat(localeMap[locale], {
    month: "long",
    year: "numeric",
  }).format(now);

  const monthlyTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;

    for (const transaction of transactions) {
      const date = new Date(transaction.created_at);
      const amount = Number(transaction.amount);
      if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== currentYear ||
        date.getMonth() !== currentMonth ||
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
  }, [currentMonth, currentYear, transactions]);

  const scheduledTotal = payments.reduce((sum, payment) => {
    const amount = Number(payment.amount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
  const projectedCashFlow =
    monthlyTotals.income - monthlyTotals.expenses - scheduledTotal;
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
            {monthLabel}
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
            {formatAmount(monthlyTotals.income)}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-sm">
          <dt className="min-w-0 text-muted-foreground">{t.expense}</dt>
          <dd className="whitespace-nowrap text-end font-medium tabular-nums text-red-500">
            {formatAmount(monthlyTotals.expenses)}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-sm">
          <dt className="min-w-0 text-muted-foreground">
            {t.unpaidPaymentsThisMonth}
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
            {t.projectedCashFlowThisMonth}
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
