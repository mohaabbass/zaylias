"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  HandCoins,
  House,
  Menu,
  MoonStar,
  Plus,
  SunMedium,
  X,
} from "lucide-react";

import { TransactionForm } from "@/components/budget/TransactionForm";
import { BalanceCard } from "@/components/budget/BalanceCard";
import { DailySpendingChart } from "@/components/budget/DailySpendingChart";
import { StatisticsChart } from "@/components/budget/StatisticsChart";
import { TransactionList } from "@/components/budget/TransactionList";
import { LoansView } from "@/components/loans/LoansView";
import { AuthScreen } from "@/components/auth/AuthScreen";
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
import { formatCurrency } from "@/lib/utils";
import { normalizeCategoryValue } from "@/lib/i18n";
import { useBudget } from "@/hooks/useBudget";
import type { TransactionType } from "@/types/finance";

export type AppView = "home" | "loans" | "add" | "locale" | "menu";
type ThemeMode = "light" | "dark";

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
    updateTransaction,
    deleteTransaction,
    setAuthError,
  } = useBudget();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(() =>
    normalizeCategoryValue(t.expenseCategories[0]?.value ?? "food"),
  );
  const [type, setType] = useState<TransactionType>("expense");
  const [activeView, setActiveView] = useState<AppView>("home");
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [hasHydratedTheme, setHasHydratedTheme] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("zaylias-theme");
    const initialTheme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    queueMicrotask(() => {
      setTheme(initialTheme);
      setHasHydratedTheme(true);
    });
  }, []);

  useEffect(() => {
    if (!hasHydratedTheme) {
      return;
    }

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("zaylias-theme", theme);
  }, [hasHydratedTheme, theme]);

  const getDefaultCategory = useCallback(
    (nextType: TransactionType = type) =>
      nextType === "income"
        ? normalizeCategoryValue(t.incomeCategories[0]?.value ?? "salary")
        : normalizeCategoryValue(t.expenseCategories[0]?.value ?? "food"),
    [t, type],
  );

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSignUp) {
      const success = await signUp(email, password);
      if (success) {
        alert(t.accountCreated);
      }
      return;
    }

    await signIn(email, password);
  };

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextCategory = getDefaultCategory(nextType);
    setCategory(nextCategory);
  };

  const openEditDrawer = (transaction: (typeof transactions)[number]) => {
    setEditingTransactionId(transaction.id);
    setTitle(transaction.title);
    setAmount(String(transaction.amount));
    setCategory(normalizeCategoryValue(transaction.category));
    setType(transaction.type);
    setActiveView("add");
    setIsAddDrawerOpen(true);
  };

  const handleAddTransaction = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!title || !amount) return;

    if (editingTransactionId) {
      const success = await updateTransaction(editingTransactionId, {
        title,
        amount,
        category,
        type,
      });

      if (success) {
        setTitle("");
        setAmount("");
        setCategory(getDefaultCategory("expense"));
        setType("expense");
        setEditingTransactionId(null);
        setIsAddDrawerOpen(false);
        setActiveView("home");
      }
      return;
    }

    const success = await addTransaction({
      title,
      amount,
      category,
      type,
    });

    if (success) {
      setTitle("");
      setAmount("");
      setCategory(getDefaultCategory("expense"));
      setType("expense");
      setIsAddDrawerOpen(false);
      setActiveView("home");
    }
  };

  const recentTransactionTitles = useMemo(() => {
    const counts = new Map<string, number>();

    for (const transaction of transactions) {
      const title = transaction.title.trim();

      if (!title) {
        continue;
      }

      counts.set(title, (counts.get(title) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([title]) => title);
  }, [transactions]);

  const navItems = useMemo(
    () => [
      {
        id: "home",
        label: t.home,
        icon: House,
        onClick: () => setActiveView("home"),
      },
      {
        id: "loans",
        label: t.loans,
        icon: HandCoins,
        onClick: () => setActiveView("loans"),
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
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
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
      case "loans":
        return <LoansView userId={session.user.id} locale={locale} t={t} />;
      case "add":
        return null;
      case "menu":
        return null;
      case "locale":
        return (
          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                {t.statistics}
              </h2>
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {t.totalBalance}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {formatCurrency(
                      totalBalance,
                      locale === "ar"
                        ? "ar-EG"
                        : locale === "en"
                          ? "en-US"
                          : "sv-SE",
                    )}{" "}
                    {t.currency}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{t.expense}</p>
                    <p className="mt-2 text-lg font-semibold text-red-500">
                      {formatCurrency(
                        transactions
                          .filter(
                            (transaction) => transaction.type === "expense",
                          )
                          .reduce(
                            (sum, transaction) =>
                              sum + Number(transaction.amount || 0),
                            0,
                          ),
                        locale === "ar"
                          ? "ar-EG"
                          : locale === "en"
                            ? "en-US"
                            : "sv-SE",
                      )}{" "}
                      {t.currency}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{t.income}</p>
                    <p className="mt-2 text-lg font-semibold text-emerald-500">
                      {formatCurrency(
                        transactions
                          .filter(
                            (transaction) => transaction.type === "income",
                          )
                          .reduce(
                            (sum, transaction) =>
                              sum + Number(transaction.amount || 0),
                            0,
                          ),
                        locale === "ar"
                          ? "ar-EG"
                          : locale === "en"
                            ? "en-US"
                            : "sv-SE",
                      )}{" "}
                      {t.currency}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            <StatisticsChart transactions={transactions} locale={locale} t={t} />
          </div>
        );
      case "home":
      default:
        return (
          <div className="space-y-6">
            <BalanceCard
              totalBalance={totalBalance}
              transactions={transactions}
              locale={locale}
              t={t}
            />
            <DailySpendingChart
              transactions={transactions}
              locale={locale}
              t={t}
            />
            <TransactionList
              transactions={transactions}
              onDelete={(id) => void deleteTransaction(id)}
              onEdit={openEditDrawer}
              locale={locale}
              t={t}
            />
          </div>
        );
    }
  };

  const drawerTitle = editingTransactionId
    ? t.editTransaction
    : t.addTransaction;

  return (
    <>
      <AppHeader title={t.appTitle} onLogout={() => void logout()} />

      <main className="min-h-screen bg-muted/50 px-4 pb-28 pt-6 text-foreground dark:bg-background sm:px-6">
        <div className="mx-auto max-w-md animate-view-in">{renderView()}</div>
      </main>

      <Drawer
        open={isAddDrawerOpen}
        modal={true}
        onOpenChange={(open) => {
          setIsAddDrawerOpen(open);
          if (!open) {
            setTitle("");
            setAmount("");
            setCategory(getDefaultCategory("expense"));
            setType("expense");
            setEditingTransactionId(null);
            setActiveView("home");
          }
        }}
      >
        <DrawerContent className="mx-auto max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl">
          <DrawerHeader className="border-b border-border px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {drawerTitle}
              </DrawerTitle>
              <DrawerClose
                type="button"
                aria-label={t.close}
                className="rounded-full border border-border bg-muted p-2 text-muted-foreground transition hover:border-ring hover:text-foreground"
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
              titleSuggestions={recentTransactionTitles}
              onTitleChange={setTitle}
              onAmountChange={setAmount}
              onCategoryChange={setCategory}
              onTypeChange={handleTypeChange}
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
        <DrawerContent className="mx-auto max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl">
          <DrawerHeader className="border-b border-border px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {t.menu}
              </DrawerTitle>
              <DrawerClose
                type="button"
                aria-label="Close"
                className="rounded-full border border-border bg-muted p-2 text-muted-foreground transition hover:border-ring hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-6 pt-4 text-sm text-foreground">
            <div className="rounded-xl border border-border bg-muted/50 p-3">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
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
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-all duration-200 ${
                      locale === option
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "border-border bg-background text-foreground hover:border-ring"
                    }`}
                  >
                    <span>{localeLabels[option]}</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {option}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/50 p-3">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t.appearance}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 ${
                    theme === "light"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      : "border-border bg-background text-foreground hover:border-ring"
                  }`}
                >
                  <SunMedium className="h-4 w-4" />
                  <span>{t.light}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 ${
                    theme === "dark"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      : "border-border bg-background text-foreground hover:border-ring"
                  }`}
                >
                  <MoonStar className="h-4 w-4" />
                  <span>{t.dark}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-500 transition-all duration-200 hover:bg-red-500/15 dark:text-red-300"
            >
              <span>{t.logout}</span>
              <ArrowRight
                className="h-4 w-4 text-red-500 dark:text-red-300"
                strokeWidth={2}
              />
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
