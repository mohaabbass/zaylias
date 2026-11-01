import { Plus, ShoppingBasket } from "lucide-react";

import type { PantryTranslation } from "@/features/pantry/i18n";

type PantryEmptyStateProps = {
  t: PantryTranslation;
  hasProducts: boolean;
  onAddItem: () => void;
  onClearFilters: () => void;
};

export function PantryEmptyState({
  t,
  hasProducts,
  onAddItem,
  onClearFilters,
}: PantryEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
        <ShoppingBasket aria-hidden="true" className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-white">
        {hasProducts ? t.noResults : t.noItems}
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        {hasProducts ? t.noResultsDescription : t.noItemsDescription}
      </p>
      {hasProducts ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 text-sm font-medium text-emerald-200 underline underline-offset-4"
        >
          {t.clearSearch}
        </button>
      ) : (
        <button
          type="button"
          onClick={onAddItem}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t.addItem}
        </button>
      )}
    </div>
  );
}
