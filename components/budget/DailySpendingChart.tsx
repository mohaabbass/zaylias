import { useMemo, useState } from "react";

import type { Translation } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

type DailySpendingChartProps = {
  transactions: Transaction[];
  locale: "sv" | "en" | "ar";
  t: Translation;
};

type SpendingRange = "day" | "week" | "month" | "year";

function isSpendingRange(value: string): value is SpendingRange {
  return (
    value === "day" || value === "week" || value === "month" || value === "year"
  );
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalMonthKey(date: Date) {
  return getLocalDateKey(date).slice(0, 7);
}

export function DailySpendingChart({
  transactions,
  locale,
  t,
}: DailySpendingChartProps) {
  const [range, setRange] = useState<SpendingRange>("week");
  const data = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entries =
      range === "day"
        ? Array.from({ length: 24 }, (_, hour) => {
            const date = new Date(today);
            date.setHours(hour);

            return {
              key: `${getLocalDateKey(date)}-${hour}`,
              label: new Intl.DateTimeFormat(locale, {
                hour: "numeric",
              }).format(date),
              value: 0,
            };
          })
        : range === "year"
          ? Array.from({ length: 12 }, (_, index) => {
              const date = new Date(
                today.getFullYear(),
                today.getMonth() - 11 + index,
                1,
              );

              return {
                key: getLocalMonthKey(date),
                label: new Intl.DateTimeFormat(locale, {
                  month: "short",
                }).format(date),
                value: 0,
              };
            })
          : Array.from({ length: range === "week" ? 7 : 30 }, (_, index) => {
              const date = new Date(today);
              date.setDate(
                today.getDate() - (range === "week" ? 6 : 29) + index,
              );

              return {
                key: getLocalDateKey(date),
                label:
                  range === "week"
                    ? new Intl.DateTimeFormat(locale, {
                        weekday: "short",
                      }).format(date)
                    : new Intl.DateTimeFormat(locale, {
                        day: "numeric",
                      }).format(date),
                value: 0,
              };
            });

    for (const transaction of transactions) {
      if (transaction.type !== "expense") continue;
      if (!transaction.created_at) continue;

      const transactionDate = new Date(transaction.created_at);
      if (Number.isNaN(transactionDate.getTime())) continue;

      const key =
        range === "day"
          ? `${getLocalDateKey(transactionDate)}-${transactionDate.getHours()}`
          : range === "year"
            ? getLocalMonthKey(transactionDate)
            : getLocalDateKey(transactionDate);
      const match = entries.find((entry) => entry.key === key);

      if (!match) continue;

      match.value += Number(transaction.amount || 0);
    }

    return entries;
  }, [locale, range, transactions]);

  const maxValue = Math.max(...data.map((entry) => entry.value), 1);
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const currencyLocale =
    locale === "ar" ? "ar-EG" : locale === "en" ? "en-US" : "sv-SE";

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-5">
      <p className="text-xs ml-1 mb-4 font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t.dailySpending}
      </p>
      <div className="mb-5 flex w-full items-center justify-between gap-3">
        <select
          aria-label={t.spendingRange}
          value={range}
          onChange={(event) => {
            if (isSpendingRange(event.target.value)) {
              setRange(event.target.value);
            }
          }}
          className="h-9 cursor-pointer rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="day">{t.spendingRangeOneDay}</option>
          <option value="week">{t.spendingRangeOneWeek}</option>
          <option value="month">{t.spendingRangeOneMonth}</option>
          <option value="year">{t.spendingRangeOneYear}</option>
        </select>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-sm font-semibold tabular-nums text-sky-700 dark:text-sky-300">
          {formatCurrency(total, currencyLocale)} {t.currency}
        </div>
      </div>

      {data.every((entry) => entry.value === 0) ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
          {t.noSpendData}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-muted/20 px-3 pt-4">
          <div
            className={`relative flex h-36 items-end ${
              range === "year" ? "gap-1" : "gap-2"
            }`}
            style={{
              minWidth:
                range === "day" ? 960 : range === "month" ? 900 : undefined,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between"
            >
              <span className="border-t border-dashed border-border/70" />
              <span className="border-t border-dashed border-border/70" />
              <span className="border-t border-border/80" />
            </div>
            {data.map((entry) => {
              const height =
                entry.value > 0
                  ? Math.max((entry.value / maxValue) * 100, 5)
                  : 0;

              return (
                <div
                  key={entry.key}
                  className="relative z-10 flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="relative flex h-28 w-full items-end justify-center px-0.5">
                    {entry.value > 0 && range !== "year" && (
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 z-20 max-w-full -translate-x-1/2 truncate whitespace-nowrap text-[8px] font-medium leading-none text-muted-foreground"
                        style={{ bottom: `calc(${height}% + 4px)` }}
                      >
                        {formatCurrency(entry.value, currencyLocale)}
                      </span>
                    )}
                    <div
                      aria-label={`${entry.label}: ${formatCurrency(entry.value, currencyLocale)} ${t.currency}`}
                      role="img"
                      title={`${entry.label}: ${formatCurrency(entry.value, currencyLocale)} ${t.currency}`}
                      className={`w-full rounded-t-lg transition-[height,filter] duration-300 ${
                        entry.value > 0
                          ? "bg-linear-to-t from-sky-600 to-sky-400 hover:brightness-110"
                          : "bg-transparent"
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span
                    className={`font-medium text-muted-foreground ${
                  range === "year"
                    ? "whitespace-nowrap text-[9px] leading-tight"
                    : "max-w-full truncate text-[10px]"
                    }`}
                  >
                    {entry.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
