"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Coins,
  House,
  Menu,
  Plus,
  X,
} from "lucide-react";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { BalanceCard } from "@/components/budget/BalanceCard";
import { TransactionForm } from "@/components/budget/TransactionForm";
import { TransactionList } from "@/components/budget/TransactionList";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

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
      setIsAddDrawerOpen(false);
      setActiveView("home");
    }
  };

  const navItems = useMemo(
    () => [
      {
        id: "home",
        label: t.home,
        icon: House,
        onClick: () => setActiveView("home"),
      },
      {
        id: "budget",
        label: t.budget,
        icon: Coins,
        onClick: () => setActiveView("budget"),
      },
      {
        id: "add",
        label: t.add,
        icon: Plus,
        onClick: () => {
          setActiveView("add");
          setIsAddDrawerOpen(true);
        },
      },
      {
        id: "locale",
        label: t.statistics,
        icon: BarChart3,
        onClick: () => setActiveView("locale"),
      },
      {
        id: "menu",
        label: t.menu,
        icon: Menu,
        onClick: () => {
          setIsMenuDrawerOpen(true);
        },
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
        return null;
      case "menu":
        return null;
      case "locale":
        return (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">{t.statistics}</h2>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {t.totalBalance}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {totalBalance} {t.currency}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <p className="text-xs text-slate-400">{t.expense}</p>
                  <p className="mt-2 text-lg font-semibold text-red-400">
                    {transactions
                      .filter((transaction) => transaction.type === "expense")
                      .reduce(
                        (sum, transaction) =>
                          sum + Number(transaction.amount || 0),
                        0,
                      )}{" "}
                    {t.currency}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <p className="text-xs text-slate-400">{t.income}</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-400">
                    {transactions
                      .filter((transaction) => transaction.type === "income")
                      .reduce(
                        (sum, transaction) =>
                          sum + Number(transaction.amount || 0),
                        0,
                      )}{" "}
                    {t.currency}
                  </p>
                </div>
              </div>
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

      <Drawer
        open={isAddDrawerOpen}
        modal={true}
        onOpenChange={(open) => {
          setIsAddDrawerOpen(open);
          if (!open) {
            setActiveView("home");
          }
        }}
      >
        <DrawerContent className="mx-auto max-w-md rounded-t-2xl border border-slate-800 bg-slate-900 p-0 text-white shadow-2xl">
          <DrawerHeader className="border-b border-slate-800 px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-lg font-semibold text-white">
                {t.addTransaction}
              </DrawerTitle>
              <DrawerClose
                type="button"
                aria-label="Close"
                className="rounded-full border border-slate-700 bg-slate-800 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-6 pt-4">
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
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={isMenuDrawerOpen}
        modal={true}
        onOpenChange={(open) => {
          setIsMenuDrawerOpen(open);
          if (!open) {
            setActiveView("home");
          }
        }}
      >
        <DrawerContent className="mx-auto max-w-md rounded-t-2xl border border-slate-800 bg-slate-900 p-0 text-white shadow-2xl">
          <DrawerHeader className="border-b border-slate-800 px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-lg font-semibold text-white">
                {t.menu}
              </DrawerTitle>
              <DrawerClose
                type="button"
                aria-label="Close"
                className="rounded-full border border-slate-700 bg-slate-800 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-6 pt-4 text-sm text-slate-300">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                {t.language}
              </p>
              <div className="space-y-2">
                {locales.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setLocale(option);
                      setIsMenuDrawerOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
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

            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300"
            >
              <span>{t.logout}</span>
              <ArrowRight className="h-4 w-4 text-red-300" strokeWidth={2} />
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <BottomNav
        items={navItems.map((item) => ({
          ...item,
          active: activeView === item.id,
        }))}
      />
    </>
  );
}
