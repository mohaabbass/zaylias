import type { LucideIcon } from "lucide-react";

type BottomNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
};

type BottomNavProps = {
  items: BottomNavItem[];
};

export function BottomNav({ items }: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-30 mx-auto max-w-md rounded-full border border-border bg-background/95 px-3 py-2 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-label={item.label}
              className={
                item.id === "add"
                  ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-950/20 transition-all duration-200 ease-out hover:bg-emerald-500 active:scale-[0.97]"
                  : `flex h-11 min-w-0 flex-1 items-center justify-center rounded-full transition-all duration-200 ease-out active:scale-[0.97] ${
                      item.active
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`
              }
            >
              <Icon
                className={`leading-none transition-transform duration-200 ease-out ${
                  item.id === "add" ? "h-6 w-6" : "h-5 w-5"
                }`}
                strokeWidth={2}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
