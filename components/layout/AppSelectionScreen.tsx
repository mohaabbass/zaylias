import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesColumn,
  LogOut,
  ShoppingBasket,
} from "lucide-react";

import type { Translation } from "@/lib/i18n";
import { BrandMark } from "@/components/ui/BrandMark";
import { PantryView } from "@/features/pantry";

type AppSelectionScreenProps = {
  view: "picker" | "pantry";
  userId: string;
  onSelectEconomy: () => void;
  onSelectPantry: () => void;
  onBackToApps: () => void;
  onLogout: () => void;
  t: Translation;
};

export function AppSelectionScreen({
  view,
  userId,
  onSelectEconomy,
  onSelectPantry,
  onBackToApps,
  onLogout,
  t,
}: AppSelectionScreenProps) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-10 text-white sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-32 -top-36 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-28 h-[30rem] w-[30rem] rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.58)_100%)]" />
      </div>

      <section
        className={`w-full ${view === "pantry" ? "max-w-6xl" : "max-w-2xl"}`}
      >
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark size="lg" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {t.appTitle}
            </h1>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {t.logout}
          </button>
        </div>

        {view === "picker" ? (
          <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-9">
            <div className="mb-7">
              <h2 className="text-2xl font-semibold tracking-tight">
                {t.chooseApp}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {t.chooseAppDescription}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={onSelectEconomy}
                className="group flex min-h-48 flex-col items-start rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-left transition hover:border-emerald-300/60 hover:bg-emerald-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/30"
              >
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-950/30">
                  <ChartNoAxesColumn aria-hidden="true" className="h-6 w-6" />
                </span>
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-lg font-semibold">{t.economyApp}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-5 w-5 text-emerald-300 transition group-hover:translate-x-1"
                  />
                </span>
                <span className="mt-1 text-sm text-slate-400">
                  {t.economyAppDescription}
                </span>
              </button>

              <button
                type="button"
                onClick={onSelectPantry}
                className="group flex min-h-48 flex-col items-start rounded-2xl border border-teal-400/20 bg-teal-400/5 p-5 text-left transition hover:border-teal-300/60 hover:bg-teal-400/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/30"
              >
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-lg shadow-teal-950/30">
                  <ShoppingBasket aria-hidden="true" className="h-6 w-6" />
                </span>
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-lg font-semibold">{t.pantryApp}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-5 w-5 text-teal-300 transition group-hover:translate-x-1"
                  />
                </span>
                <span className="mt-1 text-sm text-slate-400">
                  {t.pantryAppDescription}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <button
              type="button"
              onClick={onBackToApps}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {t.backToApps}
            </button>
            <PantryView userId={userId} />
          </div>
        )}
      </section>
    </main>
  );
}
