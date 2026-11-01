import { CalendarClock, Heart, Percent, Search } from "lucide-react";

import type { PantryTranslation } from "@/features/pantry/i18n";
import type { StatusFilter } from "@/features/pantry/types";

type PantryFiltersProps = {
  t: PantryTranslation;
  search: string;
  statusFilter: StatusFilter;
  favoritesOnly: boolean;
  belowHalfOnly: boolean;
  expiringOnly: boolean;
  inStockCount: number;
  belowHalfCount: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onFavoritesChange: () => void;
  onBelowHalfChange: () => void;
  onExpiringChange: () => void;
};

export function PantryFilters({
  t,
  search,
  statusFilter,
  favoritesOnly,
  belowHalfOnly,
  expiringOnly,
  inStockCount,
  belowHalfCount,
  onSearchChange,
  onStatusChange,
  onFavoritesChange,
  onBelowHalfChange,
  onExpiringChange,
}: PantryFiltersProps) {
  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: "i_lager", label: t.inStock },
    { value: "all", label: t.all },
    { value: "konsumerad", label: t.consumed },
    { value: "kastad", label: t.discarded },
  ];

  return (
    <div className="space-y-3">
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

      <div className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1">
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
          onClick={onExpiringChange}
          aria-pressed={expiringOnly}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition ${
            expiringOnly
              ? "bg-amber-300/15 text-amber-200"
              : "bg-white/[0.06] text-slate-300 hover:bg-white/10"
          }`}
        >
          <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
          {t.expiring}
        </button>
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
        <button
          type="button"
          onClick={onBelowHalfChange}
          aria-pressed={belowHalfOnly}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition ${
            belowHalfOnly
              ? "bg-sky-300/15 text-sky-200"
              : "bg-white/[0.06] text-slate-300 hover:bg-white/10"
          }`}
        >
          <Percent aria-hidden="true" className="h-3.5 w-3.5" />
          {t.belowHalf}
          <span className="opacity-70">{belowHalfCount}</span>
        </button>
      </div>

    </div>
  );
}
