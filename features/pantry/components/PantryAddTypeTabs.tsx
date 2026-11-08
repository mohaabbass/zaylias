import type { PantryTranslation } from "@/features/pantry/i18n";

type PantryAddTypeTabsProps = {
  activeType: "product" | "recipe";
  onChange: (type: "product" | "recipe") => void;
  t: PantryTranslation;
};

export function PantryAddTypeTabs({
  activeType,
  onChange,
  t,
}: PantryAddTypeTabsProps) {
  const tabs = [
    { type: "product" as const, label: t.addItem },
    { type: "recipe" as const, label: t.addRecipe },
  ];

  return (
    <div
      role="tablist"
      aria-label={t.addType}
      className="grid grid-cols-2 gap-1 border-b border-border px-5 py-2"
    >
      {tabs.map((tab) => (
        <button
          key={tab.type}
          type="button"
          role="tab"
          aria-selected={activeType === tab.type}
          onClick={() => onChange(tab.type)}
          className={`min-h-10 rounded-lg px-3 text-sm font-medium transition ${
            activeType === tab.type
              ? "bg-emerald-400/15 text-emerald-200"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
