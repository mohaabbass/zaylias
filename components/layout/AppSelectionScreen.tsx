import {
  ArrowRight,
  ChartNoAxesColumn,
  LogOut,
  ShoppingBasket,
} from "lucide-react";

import type { Translation } from "@/app/i18n";
import { BrandMark } from "@/components/ui/BrandMark";

type AppSelectionScreenProps = {
  onSelectEconomy: () => void;
  onSelectPantry: () => void;
  onLogout: () => void;
  t: Translation;
};

export function AppSelectionScreen({
  onSelectEconomy,
  onSelectPantry,
  onLogout,
  t,
}: AppSelectionScreenProps) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#06101b] px-5 py-8 text-white sm:px-8 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-emerald-500/12 blur-[100px]" />
        <div className="absolute -bottom-48 -right-32 h-[38rem] w-[38rem] rounded-full bg-cyan-500/10 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.52)_100%)]" />
      </div>

      <section className="w-full max-w-6xl">
        <header className="mb-12 flex items-center justify-between gap-4 sm:mb-16">
          <div className="flex items-center gap-3">
            <BrandMark size="lg" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {t.appTitle}
              </h1>
              <p className="mt-0.5 text-xs font-medium tracking-wide text-slate-400">
                YOUR PERSONAL SPACE
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {t.logout}
          </button>
        </header>

        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
          <div className="max-w-lg">
            <span className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              <span className="h-px w-7 bg-emerald-400/70" />
              {t.chooseApp}
            </span>
            <h2 className="text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">
              {t.homeTagline}
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
              {t.homeDescription}
            </p>
          </div>

          <div className="min-w-0">
            <div className="mb-6 flex items-end justify-between gap-4">
              {/* <div>
                <h3 className="text-xl font-semibold tracking-tight text-white">
                  {t.chooseApp}
                </h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  {t.chooseAppDescription}
                </p>
              </div> */}
              <span
                aria-hidden="true"
                className="mb-1 hidden h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)] sm:block"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={onSelectEconomy}
                className="group relative flex min-h-52 flex-col items-start overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.09] to-slate-950/30 p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-emerald-300/50 hover:from-emerald-400/[0.15] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/30"
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-emerald-400/[0.07] blur-2xl transition group-hover:bg-emerald-300/[0.14]"
                />
                <span className="relative mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-950/40">
                  <ChartNoAxesColumn aria-hidden="true" className="h-6 w-6" />
                </span>
                <span className="relative flex w-full items-center justify-between gap-3">
                  <span className="text-lg font-semibold">{t.economyApp}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/[0.08]">
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 text-emerald-300 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </span>
                <span className="relative mt-2 text-sm leading-6 text-slate-400">
                  {t.economyAppDescription}
                </span>
              </button>

              <button
                type="button"
                onClick={onSelectPantry}
                className="group relative flex min-h-52 flex-col items-start overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.08] to-slate-950/30 p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-cyan-300/50 hover:from-cyan-400/[0.14] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/30"
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-cyan-400/[0.07] blur-2xl transition group-hover:bg-cyan-300/[0.14]"
                />
                <span className="relative mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-lg shadow-cyan-950/40">
                  <ShoppingBasket aria-hidden="true" className="h-6 w-6" />
                </span>
                <span className="relative flex w-full items-center justify-between gap-3">
                  <span className="text-lg font-semibold">{t.pantryApp}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/[0.08]">
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 text-cyan-300 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </span>
                <span className="relative mt-2 text-sm leading-6 text-slate-400">
                  {t.pantryAppDescription}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
