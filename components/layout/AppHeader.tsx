import { LogOut, Wallet } from "lucide-react";

type AppHeaderProps = {
  title: string;
  onLogout: () => void;
};

export function AppHeader({ title, onLogout }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 px-4 pb-3 pt-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-lg font-bold text-emerald-400 ring-1 ring-emerald-500/30">
            <Wallet className="h-5 w-5" strokeWidth={2.2} />
          </div>

          <div>
            <h1 className="text-base font-semibold text-white">{title}</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-700"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span>Logga ut</span>
        </button>
      </div>
    </header>
  );
}
