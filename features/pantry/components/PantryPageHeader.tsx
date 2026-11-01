import { Plus, ShoppingBasket } from "lucide-react";

import type { PantryTranslation } from "@/features/pantry/i18n";

export function PantryPageHeader({
  t,
  onAddItem,
}: {
  t: PantryTranslation;
  onAddItem: () => void;
}) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
          <ShoppingBasket aria-hidden="true" className="h-3.5 w-3.5" />
          {t.inStockProducts}
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {t.title}
        </h2>
        <p className="mt-2 text-sm text-slate-400">{t.subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onAddItem}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/30"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        {t.addItem}
      </button>
    </header>
  );
}
