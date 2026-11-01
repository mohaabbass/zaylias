import {
  Apple,
  Croissant,
  Fish,
  LayoutGrid,
  Milk,
  Package,
  Snowflake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { PantryTranslation } from "@/features/pantry/i18n";
import { getCategoryLabel } from "@/features/pantry/constants";
import type { Locale } from "@/lib/i18n";

type PantryCategoriesProps = {
  categories: { value: string; count: number }[];
  categoryFilter: string;
  locale: Locale;
  t: PantryTranslation;
  totalCount: number;
  onCategoryChange: (value: string) => void;
};

function getCategoryIcon(category: string | null): LucideIcon {
  const value = category?.toLowerCase() ?? "";

  if (value.includes("dairy") || value.includes("mejeri")) return Milk;
  if (
    value.includes("produce") ||
    value.includes("frukt") ||
    value.includes("grönt")
  ) {
    return Apple;
  }
  if (
    value.includes("meat") ||
    value.includes("seafood") ||
    value.includes("kött") ||
    value.includes("fisk")
  ) {
    return Fish;
  }
  if (value.includes("freezer") || value.includes("frys")) return Snowflake;
  if (value.includes("bakery") || value.includes("bageri")) return Croissant;

  return Package;
}

export function PantryCategories({
  categories,
  categoryFilter,
  locale,
  t,
  totalCount,
  onCategoryChange,
}: PantryCategoriesProps) {
  return (
    <section aria-labelledby="pantry-categories-heading" className="space-y-3">
      <h2
        id="pantry-categories-heading"
        className="text-sm font-semibold text-slate-200"
      >
        {t.browseCategories}
      </h2>
      <div className="scrollbar-hidden -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => onCategoryChange("all")}
          aria-pressed={categoryFilter === "all"}
          className={`flex min-w-[6.5rem] flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
            categoryFilter === "all"
              ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
              : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]"
          }`}
        >
          <LayoutGrid aria-hidden="true" className="h-5 w-5" />
          <span className="text-xs font-medium">{t.all}</span>
          <span className="text-[11px] text-slate-400">{totalCount}</span>
        </button>
        {categories.map(({ value, count }) => {
          const Icon = getCategoryIcon(value);
          const isSelected = categoryFilter === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => onCategoryChange(value)}
              aria-pressed={isSelected}
              className={`flex min-w-[6.5rem] flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                isSelected
                  ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span className="max-w-28 truncate text-xs font-medium">
                {getCategoryLabel(value, locale)}
              </span>
              <span className="text-[11px] text-slate-400">{count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
