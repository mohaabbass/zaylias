import { useEffect, useRef, useState } from "react";

import {
  getCategoryLabel,
  normalizeCategoryValue,
  type Locale,
  type Translation,
} from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

import {
  TransactionListFilter,
  type TransactionFilter,
} from "./TransactionListFilter";

type TransactionListProps = {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  locale?: Locale;
  t: Translation;
};

export function TransactionList({
  transactions,
  onDelete,
  onEdit,
  locale = "sv",
  t,
}: TransactionListProps) {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const longPressTimer = useRef<number | null>(null);

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter === "all") {
      return true;
    }

    return transaction.type === filter;
  });

  useEffect(() => {
    if (!pressedId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        setPressedId(null);
        return;
      }

      if (
        !target.closest("[data-transaction-action]") &&
        !target.closest("[data-transaction-row]")
      ) {
        setPressedId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [pressedId]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const startLongPress = (id: string) => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = window.setTimeout(() => {
      setPressedId(id);
    }, 500);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const closeActions = () => setPressedId(null);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const localeMap: Record<string, string> = {
      sv: "sv-SE",
      en: "en-US",
      ar: "ar-EG",
    };

    return new Intl.DateTimeFormat(localeMap[locale] ?? "sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const handleFilterChange = (nextFilter: TransactionFilter) => {
    setFilter(nextFilter);
    closeActions();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4 justify-center">
        <h2 className="text-lg font-semibold text-foreground">{t.history}</h2>
        <TransactionListFilter
          value={filter}
          locale={locale}
          t={t}
          onChange={handleFilterChange}
        />
      </div>
      {filteredTransactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.emptyHistory}</p>
      ) : (
        <ul className="space-y-2">
          {filteredTransactions.map((transaction, index) => {
            const isPressed = pressedId === transaction.id;

            return (
              <li
                key={transaction.id}
                className="relative select-none animate-row-in"
                style={{ animationDelay: `${index * 40}ms` }}
                data-transaction-row
                onMouseDown={() => startLongPress(transaction.id)}
                onMouseUp={clearLongPress}
                onMouseLeave={clearLongPress}
                onTouchStart={(event) => {
                  event.preventDefault();
                  startLongPress(transaction.id);
                }}
                onTouchMove={clearLongPress}
                onTouchEnd={clearLongPress}
                onContextMenu={(event) => event.preventDefault()}
              >
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/60 p-3 transition-all duration-200 ease-out hover:border-emerald-500/40">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {transaction.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex flex-row gap-2 items-center">
                      <span className="text-muted-foreground/80">
                        {formatDate(transaction.created_at)}
                      </span>
                      {"-"}
                      <span className="font-medium">
                        {getCategoryLabel(locale, transaction.category)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        transaction.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : normalizeCategoryValue(transaction.category) ===
                                "bills" ||
                              normalizeCategoryValue(transaction.category) ===
                                "gifts" ||
                              normalizeCategoryValue(transaction.category) ===
                                "subscriptions"
                            ? "text-amber-500 dark:text-amber-400"
                            : "text-red-500"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(
                        transaction.amount,
                        locale === "ar"
                          ? "ar-EG"
                          : locale === "en"
                            ? "en-US"
                            : "sv-SE",
                      )}{" "}
                      {t.currency}
                    </span>
                  </div>
                </div>

                {isPressed ? (
                  <div
                    data-transaction-action
                    className="animate-action-in absolute inset-x-2 top-1 z-10 flex gap-2 rounded-xl border border-border bg-popover p-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(transaction);
                        setPressedId(null);
                      }}
                      className="flex-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-500/15 dark:text-emerald-300"
                    >
                      {t.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(transaction.id);
                        setPressedId(null);
                      }}
                      className="flex-1 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/15 dark:text-red-300"
                    >
                      {t.remove}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPressedId(null)}
                      className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      {t.cancel}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
