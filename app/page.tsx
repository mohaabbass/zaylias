"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: "expense" | "income";
  date: string;
};

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Mat");
  const [type, setType] = useState<"expense" | "income">("expense");

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Fel vid hämtning:", error);
    } else {
      setExpenses(data || []);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !amount) return;

    const { error } = await supabase.from("expenses").insert([
      {
        title,
        amount: parseFloat(amount),
        category,
        type,
      },
    ]);

    if (error) {
      console.error("Fel vid sparande:", error);
    } else {
      setTitle("");
      setAmount("");
      fetchExpenses();
    }
  }

  const totalBalance = expenses.reduce((acc, curr) => {
    return curr.type === "income"
      ? acc + Number(curr.amount)
      : acc - Number(curr.amount);
  }, 0);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-emerald-400">
        Zaylias Ekonomi
      </h1>

      {/* Saldo-kort */}
      <div className="bg-gray-800 p-4 rounded-xl mb-6 shadow-md border border-gray-700">
        <p className="text-gray-400 text-sm">Total balans</p>
        <p
          className={`text-3xl font-bold ${totalBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}
        >
          {totalBalance.toFixed(2)} kr
        </p>
      </div>

      {/* Formulär för att lägga till */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-4 rounded-xl mb-6 shadow-md border border-gray-700 space-y-4"
      >
        <h2 className="text-lg font-semibold">Lägg till transaktion</h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-2 rounded-lg font-medium transition ${type === "expense" ? "bg-red-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Utgift
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-2 rounded-lg font-medium transition ${type === "income" ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Inkomst
          </button>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Titel / Vad köpte du?
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="T.ex. ICA Kvantum, Lön..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Belopp (kr)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="150"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Mat">Mat</option>
              <option value="Boende">Boende</option>
              <option value="Nöje">Nöje</option>
              <option value="Transport">Transport</option>
              <option value="Övrigt">Övrigt</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg transition"
        >
          Spara köp
        </button>
      </form>

      {/* Lista över transaktioner */}
      <div className="bg-gray-800 p-4 rounded-xl shadow-md border border-gray-700">
        <h2 className="text-lg font-semibold mb-4">Historik</h2>
        {expenses.length === 0 ? (
          <p className="text-gray-400 text-sm">
            Inga transaktioner tillagda ännu.
          </p>
        ) : (
          <ul className="space-y-3">
            {expenses.map((item) => (
              <li
                key={item.id}
                className="flex justify-between items-center border-b border-gray-700 pb-2"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-gray-400">
                    {item.category} • {item.date}
                  </p>
                </div>
                <span
                  className={`font-bold ${item.type === "income" ? "text-emerald-400" : "text-red-400"}`}
                >
                  {item.type === "income" ? "+" : "-"}
                  {Number(item.amount).toFixed(2)} kr
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
