import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import type { Translation } from "@/lib/i18n";

export type TransactionFilter = "all" | "income" | "expense";

type TransactionListFilterProps = {
  value: TransactionFilter;
  onChange: (value: TransactionFilter) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  category: string;
  categories: Array<{ value: string; label: string }>;
  onCategoryChange: (value: string) => void;
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
  category,
  categories,
  onCategoryChange,
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
    Number(category !== "all");

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="relative"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="transaction-filter-panel"
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

      {isOpen ? (
        <div
          id="transaction-filter-panel"
          className={`absolute top-full z-20 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-border bg-popover p-4 shadow-lg ${
            locale === "ar" ? "left-0" : "right-0"
          }`}
        >
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
                  htmlFor="transaction-date-from"
                >
                  {t.dateFromLabel}
                </label>
                <input
                  id="transaction-date-from"
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
                  htmlFor="transaction-date-to"
                >
                  {t.dateToLabel}
                </label>
                <input
                  id="transaction-date-to"
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
                htmlFor="transaction-category-filter"
              >
                {t.categoryLabel}
              </label>
              <select
                id="transaction-category-filter"
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

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onClear}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {t.clearFilters}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
