import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import type { Translation } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

type BalanceCardProps = {
  totalBalance: number;
  transactions: Transaction[];
  locale?: string;
  t: Translation;
};

export function BalanceCard({
  totalBalance,
  transactions,
  locale = "sv",
  t,
}: BalanceCardProps) {
  const totals = transactions.reduce(
    (result, transaction) => {
      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount)) return result;

      if (transaction.type === "income") {
        result.income += amount;
      } else if (transaction.type === "expense") {
        result.expense += amount;
      }

      return result;
    },
    { income: 0, expense: 0 },
  );
  const isNegative = totalBalance < 0;
  const status =
    transactions.length === 0
      ? t.balanceNoActivity
      : isNegative
        ? t.balanceExpensesAhead
        : totalBalance > 0
          ? t.balanceIncomeAhead
          : t.balanceEven;
  const activityTotal = totals.income + totals.expense;
  const incomeShare =
    activityTotal > 0 ? (totals.income / activityTotal) * 100 : 0;
  const currencyLocale =
    locale === "ar" ? "ar-EG" : locale === "en" ? "en-US" : "sv-SE";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-emerald-500/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {t.totalBalance}
          </p>
          <p
            className={`mt-1 text-3xl font-bold tabular-nums tracking-tight ${
              isNegative
                ? "text-red-500"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatCurrency(totalBalance, currencyLocale)} {t.currency}
          </p>
          <p
            className={`mt-2 flex items-center gap-1.5 text-sm ${
              isNegative ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {totalBalance > 0 ? (
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            ) : isNegative ? (
              <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
            ) : null}
            {status}
          </p>
        </div>
        {/* <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {t.allTime}
        </span> */}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t.income}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totals.income, currencyLocale)} {t.currency}
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs text-muted-foreground">{t.expense}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-red-500">
              {formatCurrency(totals.expense, currencyLocale)} {t.currency}
            </p>
          </div>
        </div>
        <div
          aria-label={t.statisticsChartTitle}
          className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted"
          role="img"
        >
          {activityTotal > 0 && (
            <>
              <span
                className="h-full bg-emerald-500 transition-[width] duration-500"
                style={{ width: `${incomeShare}%` }}
              />
              <span
                className="h-full bg-red-500 transition-[width] duration-500"
                style={{ width: `${100 - incomeShare}%` }}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
