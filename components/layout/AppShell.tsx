"use client";

import { useMemo, useState } from "react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { BalanceCard } from "@/components/budget/BalanceCard";
import { TransactionForm } from "@/components/budget/TransactionForm";
import { TransactionList } from "@/components/budget/TransactionList";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useBudget } from "@/hooks/useBudget";
import type { TransactionType } from "@/types/finance";

export type AppView = "home" | "budget" | "add" | "locale" | "menu";

export function AppShell() {
  const { t, locale, setLocale, locales, localeLabels } = useLocale();
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
  const [activeView, setActiveView] = useState<AppView>("home");

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
      setActiveView("home");
    }
  };

  const navItems = useMemo(
    () => [
      {
        id: "home",
        label: t.home,
        icon: "⌂",
        onClick: () => setActiveView("home"),
      },
      {
        id: "budget",
        label: t.budget,
        icon: "◫",
        onClick: () => setActiveView("budget"),
      },
      {
        id: "add",
        label: t.add,
        icon: "+",
        onClick: () => setActiveView("add"),
      },
      {
        id: "locale",
        label: t.locale,
        icon: "🌐",
        onClick: () => setActiveView("locale"),
      },
      {
        id: "menu",
        label: t.menu,
        icon: "☰",
        onClick: () => setActiveView("menu"),
      },
    ],
    [t],
  );

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

  const renderView = () => {
    switch (activeView) {
      case "budget":
        return (
          <div className="space-y-6">
            <BalanceCard totalBalance={totalBalance} t={t} />
            <TransactionList
              transactions={transactions}
              onDelete={(id) => void deleteTransaction(id)}
              t={t}
            />
          </div>
        );
      case "add":
        return (
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
        );
      case "locale":
        return (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">{t.language}</h2>
            <div className="space-y-3">
              {locales.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLocale(option)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                    locale === option
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500"
                  }`}
                >
                  <span>{localeLabels[option]}</span>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {option}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      case "menu":
        return (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="mb-3 text-lg font-semibold">{t.settings}</h2>
            <div className="space-y-3 text-sm text-slate-300">
              <button
                type="button"
                onClick={() => setActiveView("locale")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3 py-2"
              >
                <span>{t.language}</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300"
              >
                <span>{t.logout}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        );
      case "home":
      default:
        return (
          <div className="space-y-6">
            <BalanceCard totalBalance={totalBalance} t={t} />
            <TransactionList
              transactions={transactions}
              onDelete={(id) => void deleteTransaction(id)}
              t={t}
            />
          </div>
        );
    }
  };

  return (
    <>
      <AppHeader title={t.appTitle} onLogout={() => void logout()} />

      <main className="min-h-screen bg-slate-950 px-4 pb-28 pt-6 text-white sm:px-6">
        <div className="mx-auto max-w-md">{renderView()}</div>
      </main>

      <BottomNav
        items={navItems.map((item) => ({
          ...item,
          active: activeView === item.id,
        }))}
      />
    </>
  );
}
