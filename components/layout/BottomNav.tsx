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
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/90 px-3 pt-2 pb-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-label={item.label}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center text-center transition-all duration-200 ease-out active:scale-[0.97] ${
                item.id === "add"
                  ? "py-0 text-white"
                  : `rounded-xl px-2 py-2 ${
                      item.active
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground hover:text-foreground"
                    }`
              }`}
            >
              <span
                className={`flex items-center justify-center rounded-full transition-colors ${
                  item.id === "add"
                    ? "h-12 w-12 bg-emerald-600 shadow-md shadow-emerald-900/20 hover:bg-emerald-500"
                    : ""
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className="h-5 w-5 leading-none transition-transform duration-200 ease-out"
                  strokeWidth={2}
                />
              </span>
              {item.id !== "add" ? (
                <span className="mt-1 text-[10px] font-medium tracking-wide">
                  {item.label}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
