import { Archive, BookOpen, CircleAlert, Percent } from "lucide-react";

import type { PantryTranslation } from "@/features/pantry/i18n";

type PantryStatsProps = {
  t: PantryTranslation;
  totalItems: number;
  expiring: number;
  belowHalf: number;
  recipeCount: number | null;
  isLoading: boolean;
  isRecipeCountLoading: boolean;
  onSelect: (
    filter: "in-stock" | "expiring" | "below-half" | "favorites" | "recipes",
  ) => void;
};

type PantryStatFilter =
  | "in-stock"
  | "expiring"
  | "below-half"
  | "recipes";

export function PantryStats({
  t,
  totalItems,
  expiring,
  belowHalf,
  recipeCount,
  isLoading,
  isRecipeCountLoading,
  onSelect,
}: PantryStatsProps) {
  const stats: {
    label: string;
    value: number | null;
    isLoading: boolean;
    icon: typeof Archive;
    color: string;
    filter: PantryStatFilter;
  }[] = [
    {
      label: t.totalItems,
      value: totalItems,
      isLoading,
      icon: Archive,
      color: "text-emerald-300",
      filter: "in-stock",
    },
    {
      label: t.expiring,
      value: expiring,
      isLoading,
      icon: CircleAlert,
      color: "text-amber-300",
      filter: "expiring",
    },
    {
      label: t.belowHalf,
      value: belowHalf,
      isLoading,
      icon: Percent,
      color: "text-sky-300",
      filter: "below-half",
    },
    {
      label: t.recipes,
      value: recipeCount,
      isLoading: isRecipeCountLoading,
      icon: BookOpen,
      color: "text-violet-300",
      filter: "recipes",
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
            disabled={stat.isLoading}
            aria-busy={stat.isLoading}
            className="rounded-2xl border border-border bg-muted p-4 text-left transition hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-wait sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                {stat.label}
              </span>
              <Icon
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 ${stat.color}`}
              />
            </div>
            <p className="mt-3 h-8 text-2xl font-semibold text-foreground">
              {stat.isLoading ? (
                <span
                  aria-hidden="true"
                  className="mt-1 block h-6 w-10 animate-pulse rounded-md bg-muted"
                />
              ) : (
                stat.value ?? "—"
              )}
            </p>
          </button>
        );
      })}
    </section>
  );
}
