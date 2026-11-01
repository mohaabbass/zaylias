import { Archive, CircleAlert, Heart, Percent } from "lucide-react";

import type { PantryTranslation } from "@/features/pantry/i18n";

type PantryStatsProps = {
  t: PantryTranslation;
  totalItems: number;
  expiring: number;
  belowHalf: number;
  favorites: number;
  onSelect: (
    filter: "in-stock" | "expiring" | "below-half" | "favorites",
  ) => void;
};

type PantryStatFilter = "in-stock" | "expiring" | "below-half" | "favorites";

export function PantryStats({
  t,
  totalItems,
  expiring,
  belowHalf,
  favorites,
  onSelect,
}: PantryStatsProps) {
  const stats: {
    label: string;
    value: number;
    icon: typeof Archive;
    color: string;
    filter: PantryStatFilter;
  }[] = [
    {
      label: t.totalItems,
      value: totalItems,
      icon: Archive,
      color: "text-emerald-300",
      filter: "in-stock",
    },
    {
      label: t.expiring,
      value: expiring,
      icon: CircleAlert,
      color: "text-amber-300",
      filter: "expiring",
    },
    {
      label: t.belowHalf,
      value: belowHalf,
      icon: Percent,
      color: "text-sky-300",
      filter: "below-half",
    },
    {
      label: t.favorites,
      value: favorites,
      icon: Heart,
      color: "text-rose-300",
      filter: "favorites",
    },
  ];

  return (
    <section
      aria-label={t.title}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <button
            key={stat.label}
            type="button"
            onClick={() => onSelect(stat.filter)}
            className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400 sm:text-sm">
                {stat.label}
              </span>
              <Icon
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 ${stat.color}`}
              />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">
              {stat.value}
            </p>
          </button>
        );
      })}
    </section>
  );
}
