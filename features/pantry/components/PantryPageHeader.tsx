import { ShoppingBasket } from "lucide-react";

import type { PantryTranslation } from "@/features/pantry/i18n";

export function PantryPageHeader({ t }: { t: PantryTranslation }) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
          <ShoppingBasket aria-hidden="true" className="h-3.5 w-3.5" />
          {t.inStockProducts}
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t.title}
        </h2>
        {/* <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p> */}
      </div>
    </header>
  );
}
