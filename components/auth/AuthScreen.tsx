type AuthScreenProps = {
  email: string;
  password: string;
  isSignUp: boolean;
  authError: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onToggleMode: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
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
}: AuthScreenProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-emerald-400 text-center mb-6">
          Zaylias Ekonomi
        </h1>
        <h2 className="text-xl font-semibold mb-4 text-center">
          {isSignUp ? "Skapa konto" : "Logga in"}
        </h2>

        {authError && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded mb-4 text-sm">
            {authError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">E-post</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              placeholder="din.epost@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lösenord</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {isSignUp ? "Skapa konto" : "Logga in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          {isSignUp ? "Har du redan ett konto?" : "Har du inget konto?"}
          <button
            type="button"
            onClick={onToggleMode}
            className="ml-2 text-emerald-400 hover:underline font-medium"
          >
            {isSignUp ? "Logga in" : "Skapa ett"}
          </button>
        </p>
      </div>
    </main>
  );
}
