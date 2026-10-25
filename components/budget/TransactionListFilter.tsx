import { SlidersHorizontal, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useState } from "react";

import type { Translation } from "@/lib/i18n";
import type { Account } from "@/types/finance";

export type TransactionFilter = "all" | "income" | "expense";

type TransactionListFilterProps = {
  value: TransactionFilter;
  onChange: (value: TransactionFilter) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  categories: Array<{ value: string; label: string }>;
  onCategoryChange: (value: string) => void;
  account: string;
  accounts: Account[];
  onAccountChange: (value: string) => void;
  resultCount: number;
  onClear: () => void;
  hasActiveFilters: boolean;
  locale?: string;
  t: Translation;
};

export function TransactionListFilter({
  value,
  onChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  search,
  onSearchChange,
  category,
  categories,
  onCategoryChange,
  account,
  accounts,
  onAccountChange,
  resultCount,
  onClear,
  hasActiveFilters,
  locale = "sv",
  t,
}: TransactionListFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const options: Array<{ value: TransactionFilter; label: string }> = [
    { value: "all", label: t.all },
    { value: "expense", label: t.expense },
    { value: "income", label: t.income },
  ];
  const activeFilterCount =
    Number(value !== "all") +
    Number(Boolean(dateFrom || dateTo)) +
    Number(category !== "all") +
    Number(account !== "all") +
    Number(Boolean(search.trim()));

  const renderFilterFields = (idPrefix: string) => (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-muted-foreground">
          {t.filters}
        </legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {options.map((option) => {
            const isActive = value === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange(option.value)}
                className={`rounded-md px-2 py-2 text-xs font-medium transition ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
            htmlFor={`${idPrefix}-date-from`}
          >
            {t.dateFromLabel}
          </label>
          <input
            id={`${idPrefix}-date-from`}
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
            htmlFor={`${idPrefix}-date-to`}
          >
            {t.dateToLabel}
          </label>
          <input
            id={`${idPrefix}-date-to`}
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => onDateToChange(event.target.value)}
            className="w-full min-w-0 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
          />
        </div>
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
          htmlFor={`${idPrefix}-title-search`}
        >
          {t.searchTitle}
        </label>
        <input
          id={`${idPrefix}-title-search`}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t.titlePlaceholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
          htmlFor={`${idPrefix}-category`}
        >
          {t.categoryLabel}
        </label>
        <select
          id={`${idPrefix}-category`}
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="all">{t.all}</option>
          {categories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
          htmlFor={`${idPrefix}-account`}
        >
          {t.account}
        </label>
        <select
          id={`${idPrefix}-account`}
          value={account}
          onChange={(event) => onAccountChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="all">{t.all}</option>
          <option value="">{t.noAccount}</option>
          {accounts.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <p
        aria-live="polite"
        className="rounded-lg bg-muted px-3 py-2 text-center text-sm font-medium text-foreground"
      >
        {t.foundItems(resultCount)}
      </p>

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={() => {
            onClear();
            setIsOpen(false);
          }}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {t.clearFilters}
        </button>
      ) : null}
    </div>
  );

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-transaction-filter-panel transaction-filter-panel"
        onClick={() => setIsOpen((open) => !open)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
          hasActiveFilters
            ? "border-foreground/20 bg-muted text-foreground"
            : "border-border bg-background text-muted-foreground hover:text-foreground"
        }`}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        <span>{t.filters}</span>
        {activeFilterCount > 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              dir={locale === "ar" ? "rtl" : "ltr"}
              className="fixed inset-0 z-[60] bg-black/40 sm:hidden"
              onClick={() => setIsOpen(false)}
            >
              <section
                id="mobile-transaction-filter-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-transaction-filter-title"
                className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-2xl border border-border bg-popover pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <h2
                      id="mobile-transaction-filter-title"
                      className="text-base font-semibold text-foreground"
                    >
                      {t.filters}
                    </h2>
                  </div>
                  <button
                    type="button"
                    aria-label={t.close}
                    onClick={() => setIsOpen(false)}
                    className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>
                <div className="overflow-y-auto px-5 py-4">
                  {renderFilterFields("mobile-transaction-filter")}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}

      {isOpen ? (
        <div
          id="transaction-filter-panel"
          className={`absolute top-full z-20 mt-2 hidden max-h-[calc(100dvh-2rem)] w-72 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-xl border border-border bg-popover p-4 shadow-lg sm:block ${
            locale === "ar" ? "left-0" : "right-0"
          }`}
        >
          {renderFilterFields("desktop-transaction-filter")}
        </div>
      ) : null}
    </div>
  );
}
