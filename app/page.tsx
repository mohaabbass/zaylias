"use client";

import { useState } from "react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { BalanceCard } from "@/components/budget/BalanceCard";
import { TransactionForm } from "@/components/budget/TransactionForm";
import { TransactionList } from "@/components/budget/TransactionList";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useBudget } from "@/hooks/useBudget";
import type { TransactionType } from "@/types/finance";

export default function Home() {
  const { t } = useLocale();
  const {
    session,
    loading,
    authError,
    totalBalance,
    transactions,
    signIn,
    signUp,
    logout,
    addTransaction,
    deleteTransaction,
    setAuthError,
  } = useBudget();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Mat");
  const [type, setType] = useState<TransactionType>("expense");

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSignUp) {
      const success = await signUp(email, password);
      if (success) {
        alert(
          "Konto skapat! Kolla din e-post för bekräftelselänk om det krävs, eller logga in.",
        );
      }
      return;
    }

    await signIn(email, password);
  };

  const handleAddTransaction = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!title || !amount) return;

    const success = await addTransaction({
      title,
      amount,
      category,
      type,
    });

    if (success) {
      setTitle("");
      setAmount("");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p>{t.loading}</p>
      </main>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        email={email}
        password={password}
        isSignUp={isSignUp}
        authError={authError}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onToggleMode={() => {
          setAuthError("");
          setIsSignUp((current) => !current);
        }}
        onSubmit={handleAuth}
        t={t}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-emerald-400">{t.appTitle}</h1>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition"
          >
            {t.logout}
          </button>
        </div>

        <BalanceCard totalBalance={totalBalance} t={t} />

        <TransactionForm
          title={title}
          amount={amount}
          category={category}
          type={type}
          onTitleChange={setTitle}
          onAmountChange={setAmount}
          onCategoryChange={setCategory}
          onTypeChange={setType}
          onSubmit={handleAddTransaction}
          t={t}
        />

        <TransactionList
          transactions={transactions}
          onDelete={(id) => void deleteTransaction(id)}
          t={t}
        />
      </div>
    </main>
  );
}
