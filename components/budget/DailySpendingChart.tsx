import { useMemo } from "react";

import type { Translation } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

type DailySpendingChartProps = {
  transactions: Transaction[];
  locale: "sv" | "en" | "ar";
  t: Translation;
};

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function DailySpendingChart({
  transactions,
  locale,
  t,
}: DailySpendingChartProps) {
  const data = useMemo(() => {
    const today = new Date();
    const entries = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (6 - index));

      return {
        key: getLocalDateKey(date),
        label: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
          date,
        ),
        value: 0,
      };
    });

    for (const transaction of transactions) {
      if (transaction.type !== "expense") continue;
      if (!transaction.created_at) continue;

      const transactionDate = new Date(transaction.created_at);
      if (Number.isNaN(transactionDate.getTime())) continue;

      const key = getLocalDateKey(transactionDate);
      const match = entries.find((entry) => entry.key === key);

      if (!match) continue;

      match.value += Number(transaction.amount || 0);
    }

    return entries;
  }, [locale, transactions]);

  const maxValue = Math.max(...data.map((entry) => entry.value), 1);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {t.dailySpending}
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {t.lastSevenDays}
          </h3>
        </div>
        <div className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500 dark:text-red-300">
          {formatCurrency(
            data.reduce((sum, entry) => sum + entry.value, 0),
            locale === "ar" ? "ar-EG" : locale === "en" ? "en-US" : "sv-SE",
          )}{" "}
          {t.currency}
        </div>
      </div>

      {data.every((entry) => entry.value === 0) ? (
        <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
          {t.noSpendData}
        </div>
      ) : (
        <div className="flex h-36 items-end gap-2">
          {data.map((entry) => {
            const height = Math.max((entry.value / maxValue) * 100, 14);

            return (
              <div
                key={entry.key}
                className="flex flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[10px] font-medium text-muted-foreground">
                  {entry.value > 0
                    ? formatCurrency(
                        entry.value,
                        locale === "ar"
                          ? "ar-EG"
                          : locale === "en"
                            ? "en-US"
                            : "sv-SE",
                      )
                    : "0"}
                </span>
                <div className="flex h-28 w-full items-end justify-center">
                  <div
                    className="w-full rounded-t-md bg-linear-to-t from-sky-700 to-sky-700 dark:from-sky-700 dark:to-sky-700"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {entry.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
