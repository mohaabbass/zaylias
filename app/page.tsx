"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: "expense" | "income";
  created_at: string;
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth-formulär state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");

  // Transaktions-state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Mat");
  const [type, setType] = useState<"expense" | "income">("expense");

  // Kontrollera om användaren är inloggad
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Hämta transaktioner när sessionen ändras
  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Fel vid hämtning:", error);
    else setTransactions(data || []);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else
        alert(
          "Konto skapat! Kolla din e-post för bekräftelselänk om det krävs, eller logga in.",
        );
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTransactions([]);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          title,
          amount: parseFloat(amount),
          category,
          type,
          user_id: session.user.id,
        },
      ])
      .select();

    if (error) {
      console.error("Fel vid tillägg:", error);
    } else if (data) {
      setTransactions([data[0], ...transactions]);
      setTitle("");
      setAmount("");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) console.error("Fel vid radering:", error);
    else setTransactions(transactions.filter((t) => t.id !== id));
  };

  const totalBalance = transactions.reduce((acc, curr) => {
    return curr.type === "income" ? acc + curr.amount : acc - curr.amount;
  }, 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p>Laddar...</p>
      </main>
    );
  }

  // Om användaren INTE är inloggad -> Visa inloggningsformulär
  if (!session) {
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

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-post</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 text-emerald-400 hover:underline font-medium"
            >
              {isSignUp ? "Logga in" : "Skapa ett"}
            </button>
          </p>
        </div>
      </main>
    );
  }

  // Om användaren ÄR inloggad -> Visa appen
  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-emerald-400">
            Zaylias Ekonomi
          </h1>
          <button
            onClick={handleLogout}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition"
          >
            Logga ut
          </button>
        </div>

        {/* Balanskort */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <p className="text-sm text-slate-400 font-medium">Total balans</p>
          <p
            className={`text-3xl font-bold mt-1 ${
              totalBalance < 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {totalBalance.toFixed(2)} kr
          </p>
        </div>

        {/* Formulär */}
        <form
          onSubmit={handleAddTransaction}
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
        >
          <h2 className="text-lg font-semibold">Lägg till transaktion</h2>

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`py-2 text-sm font-medium rounded-md transition ${
                type === "expense"
                  ? "bg-red-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Utgift
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`py-2 text-sm font-medium rounded-md transition ${
                type === "income"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Inkomst
            </button>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Titel / Vad köpte du?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="T.ex. ICA Kvantum, Lön..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Belopp (kr)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Mat">Mat</option>
                <option value="Boende">Boende</option>
                <option value="Transport">Transport</option>
                <option value="Nöje">Nöje</option>
                <option value="Lön">Lön</option>
                <option value="Övrigt">Övrigt</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition"
          >
            Spara köp
          </button>
        </form>

        {/* Historik */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-lg font-semibold mb-3">Historik</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Inga transaktioner tillagda ännu.
            </p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-800"
                >
                  <div>
                    <p className="font-medium text-sm">{t.title}</p>
                    <p className="text-xs text-slate-400">{t.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-semibold text-sm ${
                        t.type === "income"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {t.amount} kr
                    </span>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-slate-500 hover:text-red-400 transition text-sm px-1"
                      title="Radera"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
