import { Heart, Search } from "lucide-react";

import type { PantryTranslation } from "@/features/pantry/i18n";
import type { StatusFilter } from "@/features/pantry/types";
import { getCategoryLabel } from "@/features/pantry/constants";
import type { Locale } from "@/lib/i18n";

type PantryFiltersProps = {
  t: PantryTranslation;
  locale: Locale;
  search: string;
  statusFilter: StatusFilter;
  categoryFilter: string;
  favoritesOnly: boolean;
  categories: string[];
  inStockCount: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onCategoryChange: (value: string) => void;
  onFavoritesChange: () => void;
};

export function PantryFilters({
  t,
  locale,
  search,
  statusFilter,
  categoryFilter,
  favoritesOnly,
  categories,
  inStockCount,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onFavoritesChange,
}: PantryFiltersProps) {
  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: "i_lager", label: t.inStock },
    { value: "all", label: t.all },
    { value: "konsumerad", label: t.consumed },
    { value: "kastad", label: t.discarded },
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
      <label className="relative block min-w-0">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t.search}
          aria-label={t.search}
          className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onStatusChange(tab.value)}
            aria-pressed={statusFilter === tab.value}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition ${
              statusFilter === tab.value
                ? "bg-emerald-400 text-slate-950"
                : "bg-white/[0.06] text-slate-300 hover:bg-white/10"
            }`}
          >
            {tab.label}
            {tab.value === "i_lager" ? (
              <span className="ml-1.5 opacity-70">{inStockCount}</span>
            ) : null}
          </button>
        ))}
        <button
          type="button"
          onClick={onFavoritesChange}
          aria-pressed={favoritesOnly}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition ${
            favoritesOnly
              ? "bg-rose-300/15 text-rose-200"
              : "bg-white/[0.06] text-slate-300 hover:bg-white/10"
          }`}
        >
          <Heart
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${favoritesOnly ? "fill-current" : ""}`}
          />
          {t.favorites}
        </button>
      </div>

      {categories.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-white/[0.07] pt-3">
          <button
            type="button"
            onClick={() => onCategoryChange("all")}
            aria-pressed={categoryFilter === "all"}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
              categoryFilter === "all"
                ? "bg-white/15 text-white"
                : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {t.all}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              aria-pressed={categoryFilter === category}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
                categoryFilter === category
                  ? "bg-white/15 text-white"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {getCategoryLabel(category, locale)}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
