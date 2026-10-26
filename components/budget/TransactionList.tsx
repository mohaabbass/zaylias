import { useEffect, useRef, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";

import { Button } from "@/components/ui/button";
import {
  getCategoryLabel,
  normalizeCategoryValue,
  type Locale,
  type Translation,
} from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import type { Account, Transaction } from "@/types/finance";

import {
  TransactionListFilter,
  type TransactionFilter,
} from "./TransactionListFilter";

const TRANSACTION_PAGE_SIZE = 10;

type TransactionListProps = {
  transactions: Transaction[];
  accounts: Account[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  locale?: Locale;
  t: Translation;
};

export function TransactionList({
  transactions,
  accounts,
  onDelete,
  onEdit,
  locale = "sv",
  t,
}: TransactionListProps) {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(TRANSACTION_PAGE_SIZE);
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const longPressTimer = useRef<number | null>(null);

  const categoryOptions = Array.from(
    new Set(
      transactions.map((transaction) =>
        normalizeCategoryValue(transaction.category),
      ),
    ),
  )
    .sort((a, b) =>
      getCategoryLabel(locale, a).localeCompare(getCategoryLabel(locale, b)),
    )
    .map((value) => ({ value, label: getCategoryLabel(locale, value) }));

  const getDateFilterValue = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesType = filter === "all" || transaction.type === filter;
    const transactionDate = getDateFilterValue(transaction.created_at);
    const matchesDate =
      (!dateFromFilter && !dateToFilter) ||
      (Boolean(transactionDate) &&
        (!dateFromFilter || transactionDate >= dateFromFilter) &&
        (!dateToFilter || transactionDate <= dateToFilter));
    const matchesCategory =
      categoryFilter === "all" ||
      normalizeCategoryValue(transaction.category) === categoryFilter;
    const matchesAccount =
      accountFilter === "all" ||
      (accountFilter === ""
        ? !transaction.account_id
        : transaction.account_id === accountFilter);
    const matchesSearch = transaction.title
      .toLocaleLowerCase(locale)
      .includes(searchFilter.trim().toLocaleLowerCase(locale));

    return (
      matchesType &&
      matchesDate &&
      matchesCategory &&
      matchesAccount &&
      matchesSearch
    );
  });
  const visibleTransactions = filteredTransactions.slice(0, visibleCount);

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
    setVisibleCount(TRANSACTION_PAGE_SIZE);
    closeActions();
  };

  const clearFilters = () => {
    setFilter("all");
    setDateFromFilter("");
    setDateToFilter("");
    setCategoryFilter("all");
    setAccountFilter("all");
    setSearchFilter("");
    setVisibleCount(TRANSACTION_PAGE_SIZE);
    closeActions();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{t.history}</h2>
        <TransactionListFilter
          value={filter}
          dateFrom={dateFromFilter}
          dateTo={dateToFilter}
          search={searchFilter}
          category={categoryFilter}
          categories={categoryOptions}
          account={accountFilter}
          accounts={accounts}
          resultCount={filteredTransactions.length}
          locale={locale}
          t={t}
          onChange={handleFilterChange}
          onDateFromChange={(value) => {
            setDateFromFilter(value);
            setVisibleCount(TRANSACTION_PAGE_SIZE);
            closeActions();
          }}
          onDateToChange={(value) => {
            setDateToFilter(value);
            setVisibleCount(TRANSACTION_PAGE_SIZE);
            closeActions();
          }}
          onCategoryChange={(value) => {
            setCategoryFilter(value);
            setVisibleCount(TRANSACTION_PAGE_SIZE);
            closeActions();
          }}
          onAccountChange={(value) => {
            setAccountFilter(value);
            setVisibleCount(TRANSACTION_PAGE_SIZE);
            closeActions();
          }}
          onSearchChange={(value) => {
            setSearchFilter(value);
            setVisibleCount(TRANSACTION_PAGE_SIZE);
          }}
          onClear={clearFilters}
          hasActiveFilters={
            filter !== "all" ||
            dateFromFilter !== "" ||
            dateToFilter !== "" ||
            categoryFilter !== "all" ||
            accountFilter !== "all" ||
            searchFilter.trim() !== ""
          }
        />
      </div>
      {filteredTransactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.emptyHistory}</p>
      ) : (
        <>
          <ul className="space-y-2">
            {visibleTransactions.map((transaction, index) => {
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
                      {transaction.account_id ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {/* {t.account}:{" "} */}
                          {accounts.find(
                            (account) => account.id === transaction.account_id,
                          )?.name ?? t.accountUnavailable}
                        </p>
                      ) : null}
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
                                  "housing"
                              ? "text-amber-500 dark:text-amber-400"
                              : normalizeCategoryValue(transaction.category) ===
                                  "subscriptions"
                                ? "text-violet-500 dark:text-violet-400"
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
                          setPendingDeleteId(transaction.id);
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
          {visibleCount < filteredTransactions.length ? (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((count) => count + TRANSACTION_PAGE_SIZE)
              }
              className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              {t.loadMoreTransactions}
            </button>
          ) : null}
        </>
      )}
      <AlertDialog.Root
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <AlertDialog.Popup className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none transition-[opacity,transform] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <AlertDialog.Title className="text-lg font-semibold">
                {t.deleteTitle}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {t.confirmTransactionDelete}
              </AlertDialog.Description>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingDeleteId(null)}
                >
                  {t.cancel}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (pendingDeleteId) {
                      onDelete(pendingDeleteId);
                      setPendingDeleteId(null);
                    }
                  }}
                >
                  {t.remove}
                </Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
