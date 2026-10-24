import type { Translation } from "@/lib/i18n";
import { BrandMark } from "@/components/ui/BrandMark";

type AuthScreenProps = {
  email: string;
  password: string;
  isSignUp: boolean;
  authError: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onToggleMode: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  t: Translation;
};

export function AuthScreen({
  email,
  password,
  isSignUp,
  authError,
  onEmailChange,
  onPasswordChange,
  onToggleMode,
  onSubmit,
  t,
}: AuthScreenProps) {
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

      <section className="w-full max-w-[430px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <BrandMark size="lg" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t.appTitle}
          </h1>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-9">
          <div className="mb-7 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isSignUp ? t.createAccount : t.login}
            </h2>
          </div>

          {authError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3.5 text-sm text-red-300"
            >
              {authError}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="auth-email"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                {t.email}
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-400/15"
                placeholder={t.emailPlaceholder}
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                {t.password}
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-400/15"
                placeholder={t.passwordPlaceholder}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:from-emerald-400 hover:to-teal-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/30 active:scale-[0.99]"
            >
              {isSignUp ? t.createAccount : t.login}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-400">
            {isSignUp ? t.alreadyHaveAccount : t.noAccount}
            <button
              type="button"
              onClick={onToggleMode}
              className="ml-2 font-semibold text-emerald-400 transition hover:text-emerald-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {isSignUp ? t.toggleLogin : t.toggleCreate}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
