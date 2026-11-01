import { Archive, CircleAlert, Clock3, Heart } from "lucide-react";

import type { PantryTranslation } from "@/features/pantry/i18n";

type PantryStatsProps = {
  t: PantryTranslation;
  totalItems: number;
  expiring: number;
  opened: number;
  favorites: number;
};

export function PantryStats({
  t,
  totalItems,
  expiring,
  opened,
  favorites,
}: PantryStatsProps) {
  const stats = [
    { label: t.totalItems, value: totalItems, icon: Archive, color: "text-emerald-300" },
    { label: t.expiring, value: expiring, icon: CircleAlert, color: "text-amber-300" },
    { label: t.opened, value: opened, icon: Clock3, color: "text-sky-300" },
    { label: t.favorites, value: favorites, icon: Heart, color: "text-rose-300" },
  ];

  return (
    <section
      aria-label={t.title}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 sm:p-5"
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
          </div>
        );
      })}
    </section>
  );
}
