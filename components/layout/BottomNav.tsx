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
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-slate-950/90 px-3 pb-4 pt-2 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-2 py-2 text-center transition ${
                item.active
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 leading-none" strokeWidth={2} />
              <span className="mt-1 text-[10px] font-medium tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
