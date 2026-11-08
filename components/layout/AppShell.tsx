"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import {
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HandCoins,
  House,
  Landmark,
  Menu,
  MoonStar,
  Plus,
  ReceiptText,
  SunMedium,
  X,
} from "lucide-react";

import {
  AccountsView,
  BalanceCard,
  CashFlowForecast,
  DailySpendingChart,
  LoansView,
  PaymentsView,
  StatisticsCategoryChart,
  TransactionForm,
  TransactionList,
  useBudget,
  type Account,
  type ScheduledForecastPayment,
  type TransactionType,
} from "@/features/economy";
import { PantryApp } from "@/features/pantry";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSelectionScreen } from "@/components/layout/AppSelectionScreen";
import { BottomNav } from "@/components/layout/BottomNav";
import { useLocale } from "@/components/providers/LocaleProvider";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { formatCurrency, sortAccountsByFavorite } from "@/lib/utils";
import { normalizeCategoryValue } from "@/features/economy/i18n";
import type { Locale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import {
  getBudgetPeriodForDate,
  getCalendarBudgetPeriod,
  getDateKey,
  parseStoredBudgetPeriods,
  toBudgetPeriod,
  type BudgetPeriod,
  type StoredBudgetPeriod,
} from "@/features/economy/utils/budgetPeriod";

const localeMap: Record<Locale, string> = {
  sv: "sv-SE",
  en: "en-US",
};

export type AppView =
  | "home"
  | "payments"
  | "loans"
  | "accounts"
  | "add"
  | "locale"
  | "menu";
type ThemeMode = "light" | "dark";
type AppSection = "economy" | "pantry" | null;
type AddMode = "expense" | "payment" | "loan" | "account";

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AppShell() {
  const { t, locale, setLocale, locales, localeLabels } = useLocale();
  const budgetMonthNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeMap[locale], {
      month: "long",
      timeZone: "UTC",
    });
    return Array.from({ length: 12 }, (_, month) =>
      formatter.format(new Date(Date.UTC(2020, month, 1))),
    );
  }, [locale]);
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
    addExpenseTransaction,
    updateTransaction,
    deleteTransaction,
    setAuthError,
  } = useBudget();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [category, setCategory] = useState<string>(() =>
    normalizeCategoryValue(t.expenseCategories[0]?.value ?? "groceries"),
  );
  const [type, setType] = useState<TransactionType>("expense");
  const [accountId, setAccountId] = useState("");
  const [addMode, setAddMode] = useState<AddMode>("expense");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [loanForm, setLoanForm] = useState({
    title: "",
    total_amount: "",
    remaining_amount: "",
    interest_rate: "",
    monthly_payment: "",
    invoice_fee: "",
    extra_costs: "",
    due_date: "",
  });
  const [accountForm, setAccountForm] = useState({
    name: "",
    type: "checking",
    balance: "0",
  });
  const [creationError, setCreationError] = useState("");
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("home");
  const [activeApp, setActiveApp] = useState<AppSection>(null);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isCashFlowDrawerOpen, setIsCashFlowDrawerOpen] = useState(false);
  const [paymentsRefreshToken, setPaymentsRefreshToken] = useState(0);
  const [accountsRefreshToken, setAccountsRefreshToken] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState("");
  const [forecastPayments, setForecastPayments] = useState<
    ScheduledForecastPayment[]
  >([]);
  const [forecastPaymentsLoading, setForecastPaymentsLoading] = useState(true);
  const [forecastPaymentsError, setForecastPaymentsError] = useState("");
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [hasHydratedTheme, setHasHydratedTheme] = useState(false);
  const [budgetPeriodsOverride, setBudgetPeriodsOverride] = useState<{
    userId: string;
    value: StoredBudgetPeriod[];
  } | null>(null);
  const [isLoadingBudgetPeriods, setIsLoadingBudgetPeriods] = useState(false);
  const [isSavingBudgetPeriods, setIsSavingBudgetPeriods] = useState(false);
  const [budgetPeriodsError, setBudgetPeriodsError] = useState("");
  const [budgetPeriodName, setBudgetPeriodName] = useState("");
  const [budgetPeriodMonth, setBudgetPeriodMonth] = useState<number | null>(
    null,
  );
  const [isCustomBudgetPeriodName, setIsCustomBudgetPeriodName] =
    useState(false);
  const [budgetPeriodStartDate, setBudgetPeriodStartDate] = useState("");
  const [budgetPeriodEndDate, setBudgetPeriodEndDate] = useState("");
  const [pendingBudgetPeriodRemoval, setPendingBudgetPeriodRemoval] =
    useState<StoredBudgetPeriod | null>(null);
  const [selectedBudgetPeriodSelection, setSelectedBudgetPeriodSelection] =
    useState<{ userId: string; id: string | null } | null>(null);
  const [today, setToday] = useState(() => new Date(2000, 0, 1));
  const selectedBudgetPeriodId =
    selectedBudgetPeriodSelection &&
    selectedBudgetPeriodSelection.userId === session?.user.id
      ? selectedBudgetPeriodSelection.id
      : null;
  const storedBudgetPeriods = parseStoredBudgetPeriods(
    session?.user.user_metadata?.budget_periods,
  );
  const budgetPeriods =
    budgetPeriodsOverride && budgetPeriodsOverride.userId === session?.user.id
      ? budgetPeriodsOverride.value
      : storedBudgetPeriods;
  const defaultBudgetPeriod = getBudgetPeriodForDate(today, budgetPeriods);
  const selectedCustomBudgetPeriod = budgetPeriods.find(
    (period) => period.id === selectedBudgetPeriodId,
  );
  const selectedBudgetPeriod = selectedCustomBudgetPeriod
    ? toBudgetPeriod(selectedCustomBudgetPeriod)
    : selectedBudgetPeriodId?.startsWith("calendar-")
      ? getCalendarBudgetPeriod(
          new Date(
            `${selectedBudgetPeriodId.slice("calendar-".length)}T00:00:00`,
          ),
        )
      : defaultBudgetPeriod;
  const budgetPeriodOptions = [
    ...budgetPeriods.map(toBudgetPeriod),
    defaultBudgetPeriod,
    selectedBudgetPeriod,
  ].filter(
    (period, index, periods) =>
      periods.findIndex((candidate) => candidate.id === period.id) === index,
  );
  const selectedPeriodStartKey = getDateKey(selectedBudgetPeriod.start);
  const selectedPeriodEndKey = getDateKey(selectedBudgetPeriod.endExclusive);
  const selectedPeriodTransactions = transactions.filter(
    (transaction) =>
      transaction.transaction_date >= selectedPeriodStartKey &&
      transaction.transaction_date < selectedPeriodEndKey,
  );
  const selectedPeriodBalance = selectedPeriodTransactions.reduce(
    (balance, transaction) => {
      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount)) return balance;
      return transaction.type === "income"
        ? balance + amount
        : balance - amount;
    },
    0,
  );
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const sortedAccounts = sortAccountsByFavorite(accounts, localeMap[locale]);
  const favoriteAccounts = sortedAccounts.filter(
    (account) => account.is_favorite,
  );
  const otherAccounts = sortedAccounts.filter(
    (account) => !account.is_favorite,
  );

  useEffect(() => {
    queueMicrotask(() => setToday(new Date()));
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const userId = session?.user.id;

    const loadBudgetPeriods = async () => {
      if (!userId) {
        setBudgetPeriodsOverride(null);
        setSelectedBudgetPeriodSelection(null);
        setBudgetPeriodsError("");
        setIsLoadingBudgetPeriods(false);
        return;
      }

      setIsLoadingBudgetPeriods(true);
      setBudgetPeriodsError("");

      const { data, error } = await supabase
        .from("budget_settings")
        .select("periods, selected_period_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!isCurrent) return;

      if (error) {
        console.error("Failed to load budget periods:", error);
        setBudgetPeriodsError(`${t.budgetPeriodsLoadError} ${error.message}`);
        setIsLoadingBudgetPeriods(false);
        return;
      }

      if (data) {
        setBudgetPeriodsOverride({
          userId,
          value: parseStoredBudgetPeriods(data.periods),
        });
        setSelectedBudgetPeriodSelection({
          userId,
          id:
            typeof data.selected_period_id === "string"
              ? data.selected_period_id
              : null,
        });
        setIsLoadingBudgetPeriods(false);
        return;
      }

      const legacyPeriods = parseStoredBudgetPeriods(
        session?.user.user_metadata?.budget_periods,
      );
      if (legacyPeriods.length > 0) {
        const { error: migrationError } = await supabase
          .from("budget_settings")
          .upsert(
            {
              user_id: userId,
              periods: legacyPeriods,
              selected_period_id: null,
            },
            { onConflict: "user_id" },
          );

        if (!isCurrent) return;

        if (migrationError) {
          console.error("Failed to migrate budget periods:", migrationError);
          setBudgetPeriodsError(
            `${t.budgetPeriodsSaveError} ${migrationError.message}`,
          );
        }
      }

      setBudgetPeriodsOverride({ userId, value: legacyPeriods });
      setSelectedBudgetPeriodSelection({ userId, id: null });
      setIsLoadingBudgetPeriods(false);
    };

    void loadBudgetPeriods();

    return () => {
      isCurrent = false;
    };
  }, [
    session?.user.id,
    session?.user.user_metadata,
    t.budgetPeriodsLoadError,
    t.budgetPeriodsSaveError,
  ]);

  useEffect(() => {
    let isCurrent = true;
    const userId = session?.user.id;

    const loadAccounts = async () => {
      if (!userId) {
        setAccounts([]);
        setAccountId("");
        setAccountsError("");
        setAccountsLoading(false);
        return;
      }

      setAccountsLoading(true);
      setAccountsError("");

      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, type, balance, is_favorite, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!isCurrent) return;

      if (error) {
        console.error("Failed to load accounts for transaction forms:", error);
        setAccounts([]);
        setAccountId("");
        setAccountsError(error.message);
      } else {
        setAccounts(data ?? []);
        setAccountId((current) =>
          current && data.some((account) => account.id === current)
            ? current
            : "",
        );
      }
      setAccountsLoading(false);
    };

    void loadAccounts();

    return () => {
      isCurrent = false;
    };
  }, [session?.user.id, accountsRefreshToken]);

  useEffect(() => {
    let isCurrent = true;
    const userId = session?.user.id;

    const loadForecastPayments = async () => {
      if (!userId) {
        setForecastPayments([]);
        setForecastPaymentsError("");
        setForecastPaymentsLoading(false);
        return;
      }

      setForecastPaymentsLoading(true);
      setForecastPaymentsError("");

      const { data, error } = await supabase
        .from("payments")
        .select("amount, due_date")
        .eq("user_id", userId)
        .gte("due_date", selectedPeriodStartKey)
        .lt("due_date", selectedPeriodEndKey);

      if (!isCurrent) return;

      if (error) {
        console.error("Failed to load forecast payments:", error);
        setForecastPayments([]);
        setForecastPaymentsError(error.message);
      } else {
        setForecastPayments(data ?? []);
      }
      setForecastPaymentsLoading(false);
    };

    void loadForecastPayments();

    return () => {
      isCurrent = false;
    };
  }, [
    selectedPeriodEndKey,
    selectedPeriodStartKey,
    session?.user.id,
    paymentsRefreshToken,
  ]);

  useEffect(() => {
    const stored = window.localStorage.getItem("zaylias-theme");
    const initialTheme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    queueMicrotask(() => {
      setTransactionDate(getLocalDateString(new Date()));
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
        : normalizeCategoryValue(t.expenseCategories[0]?.value ?? "groceries"),
    [t, type],
  );

  const resetAddForm = useCallback(() => {
    setTitle("");
    setAmount("");
    setTransactionDate(getLocalDateString(new Date()));
    setCategory(getDefaultCategory("expense"));
    setType("expense");
    setAccountId("");
    setAddMode("expense");
    setPaymentDueDate("");
    setPaymentError("");
    setLoanForm({
      title: "",
      total_amount: "",
      remaining_amount: "",
      interest_rate: "",
      monthly_payment: "",
      invoice_fee: "",
      extra_costs: "",
      due_date: "",
    });
    setAccountForm({ name: "", type: "checking", balance: "0" });
    setCreationError("");
    setEditingTransactionId(null);
  }, [getDefaultCategory]);

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveApp(null);

    if (isSignUp) {
      const success = await signUp(email, password);
      if (success) {
        alert(t.accountCreated);
      }
      return;
    }

    await signIn(email, password);
  };

  const handleLogout = () => {
    setActiveApp(null);
    void logout();
  };

  const saveBudgetPeriods = async (
    nextPeriods: StoredBudgetPeriod[],
    nextSelectedPeriodId: string | null = selectedBudgetPeriodId,
  ) => {
    if (!session?.user.id) return false;

    setBudgetPeriodsError("");
    setIsSavingBudgetPeriods(true);
    const selectedPeriodId = nextPeriods.some(
      (period) => period.id === nextSelectedPeriodId,
    )
      ? nextSelectedPeriodId
      : nextSelectedPeriodId?.startsWith("calendar-")
        ? nextSelectedPeriodId
        : null;
    const { error } = await supabase.from("budget_settings").upsert(
      {
        user_id: session.user.id,
        periods: nextPeriods,
        selected_period_id: selectedPeriodId,
      },
      { onConflict: "user_id" },
    );
    setIsSavingBudgetPeriods(false);
    if (error) {
      console.error("Failed to save budget periods:", error);
      setBudgetPeriodsError(`${t.budgetPeriodsSaveError} ${error.message}`);
      return false;
    }

    setBudgetPeriodsOverride({
      userId: session.user.id,
      value: nextPeriods,
    });
    setSelectedBudgetPeriodSelection({
      userId: session.user.id,
      id: selectedPeriodId,
    });
    return true;
  };

  const handleAddBudgetPeriod = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const name = isCustomBudgetPeriodName
      ? budgetPeriodName.trim()
      : budgetMonthNames[budgetPeriodMonth ?? -1] ?? "";
    const hasInvalidRange =
      !budgetPeriodStartDate ||
      !budgetPeriodEndDate ||
      budgetPeriodStartDate > budgetPeriodEndDate;
    const overlapsExistingPeriod = budgetPeriods.some(
      (period) =>
        budgetPeriodStartDate <= period.endDate &&
        budgetPeriodEndDate >= period.startDate,
    );

    if (!name || hasInvalidRange || overlapsExistingPeriod) {
      setBudgetPeriodsError(t.budgetPeriodValidationError);
      return;
    }

    const nextPeriods = parseStoredBudgetPeriods([
      ...budgetPeriods,
      {
        id: budgetPeriodStartDate,
        name,
        startDate: budgetPeriodStartDate,
        endDate: budgetPeriodEndDate,
      },
    ]);

    if (await saveBudgetPeriods(nextPeriods)) {
      setBudgetPeriodName("");
      setBudgetPeriodMonth(null);
      setIsCustomBudgetPeriodName(false);
      setBudgetPeriodStartDate("");
      setBudgetPeriodEndDate("");
    }
  };

  const handleRemoveBudgetPeriod = async (periodId: string) => {
    const nextPeriods = budgetPeriods.filter(
      (period) => period.id !== periodId,
    );
    const nextSelectedPeriodId =
      selectedBudgetPeriodId === periodId ? null : selectedBudgetPeriodId;
    await saveBudgetPeriods(nextPeriods, nextSelectedPeriodId);
  };

  const handleSelectBudgetPeriod = (periodId: string) => {
    if (session?.user.id) {
      setSelectedBudgetPeriodSelection({
        userId: session.user.id,
        id: periodId,
      });
      void saveBudgetPeriods(budgetPeriods, periodId);
    }
  };

  const handleBudgetPeriodNavigation = (direction: -1 | 1) => {
    if (budgetPeriods.length === 0) {
      const nextMonth = new Date(selectedBudgetPeriod.start);
      nextMonth.setMonth(nextMonth.getMonth() + direction);
      handleSelectBudgetPeriod(getCalendarBudgetPeriod(nextMonth).id);
      return;
    }

    const selectedIndex = budgetPeriods.findIndex(
      (period) => period.id === selectedBudgetPeriod.id,
    );
    if (selectedIndex >= 0) {
      const nextPeriod = budgetPeriods[selectedIndex + direction];
      if (nextPeriod) handleSelectBudgetPeriod(nextPeriod.id);
      return;
    }

    const candidates = budgetPeriods
      .filter((period) =>
        direction < 0
          ? period.startDate < selectedPeriodStartKey
          : period.startDate > selectedPeriodStartKey,
      )
      .sort((a, b) =>
        direction < 0
          ? b.startDate.localeCompare(a.startDate)
          : a.startDate.localeCompare(b.startDate),
      );
    if (candidates[0]) {
      handleSelectBudgetPeriod(candidates[0].id);
    }
  };

  const canNavigateBudgetPeriod = (direction: -1 | 1) => {
    if (budgetPeriods.length === 0) return true;
    const selectedIndex = budgetPeriods.findIndex(
      (period) => period.id === selectedBudgetPeriod.id,
    );
    if (selectedIndex >= 0) {
      return Boolean(budgetPeriods[selectedIndex + direction]);
    }
    return budgetPeriods.some((period) =>
      direction < 0
        ? period.startDate < selectedPeriodStartKey
        : period.startDate > selectedPeriodStartKey,
    );
  };

  const formatBudgetPeriodOption = (period: BudgetPeriod) => {
    const dateFormatter = new Intl.DateTimeFormat(localeMap[locale], {
      dateStyle: "medium",
    });
    const periodEnd = new Date(period.endExclusive);
    periodEnd.setDate(periodEnd.getDate() - 1);
    const range = `${dateFormatter.format(period.start)} – ${dateFormatter.format(periodEnd)}`;
    return period.name ? `${period.name} · ${range}` : range;
  };

  const renderBudgetPeriodSelector = () => (
    <section className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
      <button
        type="button"
        aria-label={t.previousBudgetPeriod}
        disabled={
          isLoadingBudgetPeriods ||
          isSavingBudgetPeriods ||
          !canNavigateBudgetPeriod(-1)
        }
        onClick={() => handleBudgetPeriodNavigation(-1)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-foreground transition hover:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </button>
      <label className="min-w-0 flex-1">
        <span className="sr-only">{t.selectBudgetPeriod}</span>
        <select
          aria-label={t.selectBudgetPeriod}
          value={selectedBudgetPeriod.id}
          disabled={isLoadingBudgetPeriods || isSavingBudgetPeriods}
          onChange={(event) => handleSelectBudgetPeriod(event.target.value)}
          className="w-full truncate bg-transparent text-center text-sm font-semibold text-foreground outline-none"
        >
          {budgetPeriodOptions.map((period) => (
            <option key={period.id} value={period.id}>
              {formatBudgetPeriodOption(period)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-label={t.nextBudgetPeriod}
        disabled={
          isLoadingBudgetPeriods ||
          isSavingBudgetPeriods ||
          !canNavigateBudgetPeriod(1)
        }
        onClick={() => handleBudgetPeriodNavigation(1)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-foreground transition hover:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </button>
    </section>
  );

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const nextCategory = getDefaultCategory(nextType);
    setCategory(nextCategory);
  };

  const openEditDrawer = (transaction: (typeof transactions)[number]) => {
    setAddMode("expense");
    setEditingTransactionId(transaction.id);
    setTitle(transaction.title);
    setAmount(String(transaction.amount));
    setTransactionDate(transaction.transaction_date);
    setCategory(normalizeCategoryValue(transaction.category));
    setType(transaction.type);
    setAccountId(transaction.account_id ?? "");
    setActiveView("add");
    setIsAddDrawerOpen(true);
  };

  const handleAddTransaction = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!title || !amount || !accountId || !transactionDate) return;

    if (editingTransactionId) {
      const success = await updateTransaction(editingTransactionId, {
        title,
        amount,
        category,
        type,
        account_id: accountId,
        transaction_date: transactionDate,
      });

      if (success) {
        resetAddForm();
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
      account_id: accountId,
      transaction_date: transactionDate,
    });

    if (success) {
      resetAddForm();
      setIsAddDrawerOpen(false);
      setActiveView("home");
    }
  };

  const handleAddPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentError("");

    const parsedAmount = Number(amount);
    if (
      !title.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !paymentDueDate ||
      !category ||
      !accountId
    ) {
      setPaymentError(t.paymentValidationError);
      return;
    }

    setIsSavingPayment(true);
    const { error } = await supabase.from("payments").insert({
      title: title.trim(),
      amount: parsedAmount,
      category,
      account_id: accountId,
      due_date: paymentDueDate,
      user_id: session?.user.id,
    });
    setIsSavingPayment(false);

    if (error) {
      console.error("Failed to create payment:", error);
      setPaymentError(error.message);
      return;
    }

    setPaymentsRefreshToken((current) => current + 1);
    resetAddForm();
    setIsAddDrawerOpen(false);
    setActiveView("payments");
  };

  const handleCreateAccount = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreationError("");

    const balance = Number(accountForm.balance);
    if (!accountForm.name.trim() || !Number.isFinite(balance)) {
      setCreationError(t.accountValidationError);
      return;
    }

    setIsSavingRecord(true);
    const { error } = await supabase.from("accounts").insert({
      name: accountForm.name.trim(),
      type: accountForm.type,
      balance,
      user_id: session?.user.id,
    });
    setIsSavingRecord(false);

    if (error) {
      console.error("Failed to create account:", error);
      setCreationError(error.message);
      return;
    }

    setAccountsRefreshToken((current) => current + 1);
    resetAddForm();
    setActiveView("accounts");
    setIsAddDrawerOpen(false);
  };

  const handleCreateLoan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreationError("");

    const totalAmount = Number(loanForm.total_amount);
    const remainingAmount = Number(loanForm.remaining_amount);
    const interestRate =
      loanForm.interest_rate.trim() === ""
        ? null
        : Number(loanForm.interest_rate);
    const monthlyPayment =
      loanForm.monthly_payment.trim() === ""
        ? null
        : Number(loanForm.monthly_payment);
    const invoiceFee = Number(loanForm.invoice_fee || 0);
    const extraCosts = Number(loanForm.extra_costs || 0);
    const optionalAmounts = [
      interestRate,
      monthlyPayment,
      invoiceFee,
      extraCosts,
    ];

    if (
      !loanForm.title.trim() ||
      !Number.isFinite(totalAmount) ||
      !Number.isFinite(remainingAmount) ||
      totalAmount <= 0 ||
      remainingAmount < 0 ||
      remainingAmount > totalAmount ||
      optionalAmounts.some(
        (value) => value !== null && (!Number.isFinite(value) || value < 0),
      )
    ) {
      setCreationError(t.loanAmountError);
      return;
    }

    setIsSavingRecord(true);
    const { error } = await supabase.from("loans").insert({
      title: loanForm.title.trim(),
      total_amount: totalAmount,
      remaining_amount: remainingAmount,
      interest_rate: interestRate,
      monthly_payment: monthlyPayment,
      invoice_fee: invoiceFee,
      extra_costs: extraCosts,
      due_date: loanForm.due_date || null,
      user_id: session?.user.id,
    });
    setIsSavingRecord(false);

    if (error) {
      console.error("Failed to create loan:", error);
      setCreationError(error.message);
      return;
    }

    resetAddForm();
    setActiveView("loans");
    setIsAddDrawerOpen(false);
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
        id: "payments",
        label: t.payments,
        icon: CreditCard,
        onClick: () => setActiveView("payments"),
      },
      {
        id: "add",
        label: t.add,
        icon: Plus,
        onClick: () => {
          resetAddForm();
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
    [resetAddForm, t],
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

  if (activeApp === null) {
    return (
      <AppSelectionScreen
        onSelectEconomy={() => setActiveApp("economy")}
        onSelectPantry={() => setActiveApp("pantry")}
        onLogout={handleLogout}
        t={t}
      />
    );
  }

  if (activeApp === "pantry") {
    return (
      <PantryApp
        userId={session.user.id}
        paymentsRefreshToken={paymentsRefreshToken}
        onLogout={handleLogout}
        onSwitchApps={() => setActiveApp(null)}
        theme={theme}
        onThemeChange={setTheme}
        onOpenEconomyPayments={() => {
          setActiveView("payments");
          setActiveApp("economy");
        }}
      />
    );
  }

  const renderView = () => {
    switch (activeView) {
      case "payments":
        return (
          <PaymentsView
            userId={session.user.id}
            accounts={accounts}
            accountsLoading={accountsLoading}
            accountsError={accountsError}
            onOpenAccounts={() => setActiveView("accounts")}
            onAddExpense={async (payment) => {
              const transaction = await addExpenseTransaction(payment);
              return transaction?.id ?? null;
            }}
            onDeleteExpense={deleteTransaction}
            onPaymentsChange={() =>
              setPaymentsRefreshToken((current) => current + 1)
            }
            locale={locale}
            t={t}
          />
        );
      case "loans":
        return <LoansView userId={session.user.id} locale={locale} t={t} />;
      case "accounts":
        return (
          <AccountsView
            userId={session.user.id}
            locale={locale}
            t={t}
            onAccountsChange={() =>
              setAccountsRefreshToken((current) => current + 1)
            }
          />
        );
      case "add":
        return null;
      case "menu":
        return null;
      case "locale":
        return (
          <div className="space-y-4">
            {renderBudgetPeriodSelector()}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                {t.statistics}
              </h2>
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-muted/50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {t.budgetPeriodBalance}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {formatCurrency(
                      selectedPeriodBalance,
                      locale === "en" ? "en-US" : "sv-SE",
                    )}{" "}
                    {t.currency}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{t.expense}</p>
                    <p className="mt-2 text-lg font-semibold text-red-500">
                      {formatCurrency(
                        selectedPeriodTransactions
                          .filter(
                            (transaction) => transaction.type === "expense",
                          )
                          .reduce(
                            (sum, transaction) =>
                              sum + Number(transaction.amount || 0),
                            0,
                          ),
                        locale === "en" ? "en-US" : "sv-SE",
                      )}{" "}
                      {t.currency}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{t.income}</p>
                    <p className="mt-2 text-lg font-semibold text-emerald-500">
                      {formatCurrency(
                        selectedPeriodTransactions
                          .filter(
                            (transaction) => transaction.type === "income",
                          )
                          .reduce(
                            (sum, transaction) =>
                              sum + Number(transaction.amount || 0),
                            0,
                          ),
                        locale === "en" ? "en-US" : "sv-SE",
                      )}{" "}
                      {t.currency}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            <StatisticsCategoryChart
              transactions={transactions}
              locale={locale}
              t={t}
              budgetPeriod={selectedBudgetPeriod}
              budgetPeriods={budgetPeriods}
            />
          </div>
        );
      case "home":
      default:
        return (
          <div className="space-y-6">
            {renderBudgetPeriodSelector()}
            <BalanceCard
              periodBalance={selectedPeriodBalance}
              transactions={selectedPeriodTransactions}
              locale={locale}
              t={t}
              onOpenCashFlow={() => setIsCashFlowDrawerOpen(true)}
            />
            <DailySpendingChart
              transactions={selectedPeriodTransactions}
              locale={locale}
              t={t}
              budgetPeriod={selectedBudgetPeriod}
            />
            <TransactionList
              transactions={selectedPeriodTransactions}
              onDelete={(id) => void deleteTransaction(id)}
              onEdit={openEditDrawer}
              accounts={accounts}
              locale={locale}
              t={t}
            />
          </div>
        );
    }
  };

  const drawerTitle = editingTransactionId
    ? t.editTransaction
    : addMode === "payment"
      ? t.newPayment
      : addMode === "loan"
        ? t.newLoan
        : addMode === "account"
          ? t.newAccount
          : t.addTransaction;

  return (
    <>
      <AppHeader
        title={t.appTitle}
        userId={session.user.id}
        paymentsRefreshToken={paymentsRefreshToken}
        onLogout={handleLogout}
        onSwitchApps={() => setActiveApp(null)}
        onOpenPayments={() => setActiveView("payments")}
      />

      <main className="min-h-screen bg-muted/50 px-4 pb-28 pt-6 text-foreground dark:bg-background sm:px-6">
        <div className="mx-auto max-w-md animate-view-in">{renderView()}</div>
      </main>

      <Drawer
        open={isAddDrawerOpen}
        modal={true}
        onOpenChange={(open) => {
          setIsAddDrawerOpen(open);
          if (!open) {
            resetAddForm();
            setActiveView((current) =>
              current === "payments" ||
              current === "loans" ||
              current === "accounts"
                ? current
                : "home",
            );
          }
        }}
      >
        <DrawerContent className="mx-auto h-[calc(100dvh-env(safe-area-inset-top))] max-h-none max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-6rem)] [&_input]:rounded-xl [&_input]:border-border [&_input]:bg-muted/60 [&_input]:shadow-sm [&_input]:transition-colors [&_input:focus]:border-emerald-500 [&_input:focus]:ring-2 [&_input:focus]:ring-emerald-500/20 [&_input::placeholder]:text-xs [&_select]:rounded-xl [&_select]:border-border [&_select]:bg-muted/60 [&_select]:shadow-sm [&_select]:transition-colors [&_select:focus]:border-emerald-500 [&_select:focus]:ring-2 [&_select:focus]:ring-emerald-500/20">
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

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
            {!editingTransactionId ? (
              <div
                role="group"
                aria-label={t.add}
                className="grid grid-cols-2 gap-2"
              >
                {(
                  [
                    ["expense", t.expense, ReceiptText],
                    ["payment", t.payments, CreditCard],
                    ["loan", t.loans, HandCoins],
                    ["account", t.accounts, Landmark],
                  ] as const
                ).map(([mode, label, Icon]) => {
                  const isSelected = addMode === mode;

                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setAddMode(mode);
                        setCreationError("");
                        setPaymentError("");
                        if (mode === "payment") {
                          setType("expense");
                          setCategory(
                            t.expenseCategories.find(
                              (option) => option.value === "bills",
                            )?.value ?? getDefaultCategory("expense"),
                          );
                        }
                      }}
                      className={`flex min-h-16 items-center gap-3 rounded-xl border px-3 py-3 text-start text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-border bg-card text-muted-foreground hover:border-emerald-500/50 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {addMode === "payment" && !editingTransactionId ? (
              <form
                onSubmit={(event) => void handleAddPayment(event)}
                className="space-y-4 rounded-xl border border-border bg-card p-5"
              >
                <h2 className="text-lg font-semibold text-foreground">
                  {t.newPayment}
                </h2>
                <label className="block text-xs text-muted-foreground">
                  {t.paymentTitle}
                  <input
                    required
                    value={title}
                    placeholder={t.paymentTitlePlaceholder}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs text-muted-foreground">
                    {t.amountLabel}
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      placeholder={t.amountPlaceholder}
                      onChange={(event) => setAmount(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    {t.categoryLabel}
                    <select
                      required
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
                    >
                      {t.expenseCategories.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block text-xs text-muted-foreground">
                  {t.dueDate}
                  <input
                    required
                    type="date"
                    value={paymentDueDate}
                    onChange={(event) => setPaymentDueDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  {t.account}
                  <select
                    required
                    disabled={accountsLoading || Boolean(accountsError)}
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      {t.selectAccount}
                    </option>
                    {favoriteAccounts.length > 0 ? (
                      <optgroup label={t.favoriteAccounts}>
                        {favoriteAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            ★ {account.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {otherAccounts.length > 0 ? (
                      <optgroup label={t.otherAccounts}>
                        {otherAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                  {accountsLoading ? (
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {t.loading}
                    </span>
                  ) : accountsError ? (
                    <span
                      role="alert"
                      className="mt-2 block text-xs text-red-600 dark:text-red-300"
                    >
                      {t.accountsLoadError} {accountsError}
                    </span>
                  ) : accounts.length === 0 ? (
                    <span className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{t.createAccountFirst}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAddMode("account");
                          setCreationError("");
                        }}
                        className="shrink-0 font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                      >
                        {t.accounts}
                      </button>
                    </span>
                  ) : null}
                </label>
                {paymentError ? (
                  <p
                    role="alert"
                    className="text-sm text-red-600 dark:text-red-300"
                  >
                    {paymentError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={
                    isSavingPayment ||
                    accountsLoading ||
                    Boolean(accountsError) ||
                    accounts.length === 0
                  }
                  className="sticky bottom-0 z-10 w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSavingPayment ? t.loading : t.savePayment}
                </button>
              </form>
            ) : addMode === "loan" && !editingTransactionId ? (
              <form
                onSubmit={(event) => void handleCreateLoan(event)}
                className="space-y-4 rounded-xl border border-border bg-card p-5"
              >
                <label className="block text-xs text-muted-foreground">
                  {t.loanTitle}
                  <input
                    required
                    maxLength={120}
                    value={loanForm.title}
                    placeholder={t.loanTitle}
                    onChange={(event) =>
                      setLoanForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs text-muted-foreground">
                    {t.totalAmount}
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={loanForm.total_amount}
                      placeholder={t.amountPlaceholder}
                      onChange={(event) =>
                        setLoanForm((current) => ({
                          ...current,
                          total_amount: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    {t.remainingAmount}
                    <input
                      required
                      type="number"
                      min="0"
                      max={loanForm.total_amount || undefined}
                      step="0.01"
                      value={loanForm.remaining_amount}
                      placeholder={t.amountPlaceholder}
                      onChange={(event) =>
                        setLoanForm((current) => ({
                          ...current,
                          remaining_amount: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs text-muted-foreground">
                    {t.interestRate} (%)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={loanForm.interest_rate}
                      placeholder={t.amountPlaceholder}
                      onChange={(event) =>
                        setLoanForm((current) => ({
                          ...current,
                          interest_rate: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    {t.monthlyPayment}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={loanForm.monthly_payment}
                      placeholder={t.amountPlaceholder}
                      onChange={(event) =>
                        setLoanForm((current) => ({
                          ...current,
                          monthly_payment: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    {t.invoiceFee}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={loanForm.invoice_fee}
                      placeholder={t.amountPlaceholder}
                      onChange={(event) =>
                        setLoanForm((current) => ({
                          ...current,
                          invoice_fee: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    {t.extraCosts}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={loanForm.extra_costs}
                      placeholder={t.amountPlaceholder}
                      onChange={(event) =>
                        setLoanForm((current) => ({
                          ...current,
                          extra_costs: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                    />
                  </label>
                </div>
                <label className="block text-xs text-muted-foreground">
                  {t.dueDate}
                  <input
                    type="date"
                    value={loanForm.due_date}
                    onChange={(event) =>
                      setLoanForm((current) => ({
                        ...current,
                        due_date: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                {creationError ? (
                  <p
                    role="alert"
                    className="text-sm text-red-600 dark:text-red-300"
                  >
                    {creationError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSavingRecord}
                  className="sticky bottom-0 z-10 w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSavingRecord ? t.loading : t.createLoan}
                </button>
              </form>
            ) : addMode === "account" && !editingTransactionId ? (
              <form
                onSubmit={(event) => void handleCreateAccount(event)}
                className="space-y-4 rounded-xl border border-border bg-card p-5"
              >
                <label className="block text-xs text-muted-foreground">
                  {t.accountName}
                  <input
                    required
                    maxLength={120}
                    value={accountForm.name}
                    placeholder={t.accountName}
                    onChange={(event) =>
                      setAccountForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  {t.accountType}
                  <select
                    value={accountForm.type}
                    onChange={(event) =>
                      setAccountForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="checking">{t.checkingAccount}</option>
                    <option value="savings">{t.savingsAccount}</option>
                    <option value="other">{t.otherAccount}</option>
                  </select>
                </label>
                <label className="block text-xs text-muted-foreground">
                  {t.accountBalance}
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={accountForm.balance}
                    placeholder={t.accountBalance}
                    onChange={(event) =>
                      setAccountForm((current) => ({
                        ...current,
                        balance: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                {creationError ? (
                  <p
                    role="alert"
                    className="text-sm text-red-600 dark:text-red-300"
                  >
                    {creationError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSavingRecord}
                  className="sticky bottom-0 z-10 w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSavingRecord ? t.loading : t.saveAccount}
                </button>
              </form>
            ) : (
              <TransactionForm
                accounts={accounts}
                locale={locale}
                accountsLoading={accountsLoading}
                accountsError={accountsError}
                accountId={accountId}
                title={title}
                amount={amount}
                category={category}
                transactionDate={transactionDate}
                type={type}
                titleSuggestions={recentTransactionTitles}
                onTitleChange={setTitle}
                onAmountChange={setAmount}
                onTransactionDateChange={setTransactionDate}
                onAccountIdChange={setAccountId}
                onOpenAccounts={() => {
                  setAddMode("account");
                  setCreationError("");
                }}
                onCategoryChange={setCategory}
                onTypeChange={handleTypeChange}
                onSubmit={handleAddTransaction}
                t={t}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={isCashFlowDrawerOpen}
        modal={true}
        onOpenChange={setIsCashFlowDrawerOpen}
      >
        <DrawerContent className="mx-auto max-h-[90dvh] max-w-md overflow-y-auto rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl">
          <DrawerHeader className="border-b border-border px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {t.monthlyCashFlowForecast}
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
            <CashFlowForecast
              transactions={transactions}
              payments={forecastPayments}
              totalBalance={totalBalance}
              loading={forecastPaymentsLoading}
              error={forecastPaymentsError}
              locale={locale}
              t={t}
              budgetPeriod={selectedBudgetPeriod}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={isMenuDrawerOpen}
        modal={true}
        onOpenChange={(open) => {
          setIsMenuDrawerOpen(open);
        }}
      >
        <DrawerContent className="mx-auto h-[calc(100dvh-env(safe-area-inset-top))] max-h-none max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-6rem)]">
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

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-sm text-foreground">
            <button
              type="button"
              onClick={() => {
                setActiveView("loans");
                setIsMenuDrawerOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/50 p-3 text-left font-medium transition hover:border-ring hover:bg-muted"
            >
              <HandCoins className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>{t.loans}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView("accounts");
                setIsMenuDrawerOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/50 p-3 text-left font-medium transition hover:border-ring hover:bg-muted"
            >
              <Landmark className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>{t.accounts}</span>
            </button>

            <section className="rounded-xl border border-border bg-muted/50 p-3">
              <h2 className="font-medium text-foreground">{t.budgetPeriods}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.budgetPeriodsDescription}
              </p>

              {budgetPeriods.length > 0 ? (
                <div className="mt-3 max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-border/70 p-2">
                  <ul aria-label={t.budgetPeriods} className="space-y-2">
                    {budgetPeriods.map((period) => (
                      <li
                        key={period.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {period.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {formatBudgetPeriodOption(
                              toBudgetPeriod(period),
                            ).replace(`${period.name} · `, "")}
                          </span>
                        </span>
                        <button
                          type="button"
                          aria-label={`${t.removeBudgetPeriod}: ${period.name}`}
                          disabled={
                            isLoadingBudgetPeriods || isSavingBudgetPeriods
                          }
                          onClick={() => setPendingBudgetPeriodRemoval(period)}
                          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
                        >
                          {t.removeBudgetPeriod}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t.noCustomBudgetPeriods}
                </p>
              )}

              <form
                onSubmit={(event) => void handleAddBudgetPeriod(event)}
                className="mt-4 space-y-3 border-t border-border pt-3"
              >
                <label className="block text-xs text-muted-foreground">
                  {t.budgetPeriodName}
                  <select
                    required={!isCustomBudgetPeriodName}
                    value={
                      isCustomBudgetPeriodName
                        ? "custom"
                        : budgetPeriodMonth?.toString() ?? ""
                    }
                    onChange={(event) => {
                      const value = event.target.value;
                      const isCustom = value === "custom";
                      setIsCustomBudgetPeriodName(isCustom);
                      setBudgetPeriodName("");
                      setBudgetPeriodMonth(
                        isCustom || value === "" ? null : Number(value),
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="" disabled>
                      {t.selectBudgetPeriodMonth}
                    </option>
                    {budgetMonthNames.map((month, index) => (
                      <option key={month} value={index}>
                        {month}
                      </option>
                    ))}
                    <option value="custom">{t.customBudgetPeriodName}</option>
                  </select>
                  {isCustomBudgetPeriodName ? (
                    <input
                      required
                      maxLength={60}
                      value={budgetPeriodName}
                      placeholder={t.budgetPeriodNamePlaceholder}
                      onChange={(event) =>
                        setBudgetPeriodName(event.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                  ) : null}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-muted-foreground">
                    {t.budgetPeriodStart}
                    <input
                      required
                      type="date"
                      value={budgetPeriodStartDate}
                      onChange={(event) =>
                        setBudgetPeriodStartDate(event.target.value)
                      }
                      className="mt-1 w-full min-w-0 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    {t.budgetPeriodEnd}
                    <input
                      required
                      type="date"
                      value={budgetPeriodEndDate}
                      onChange={(event) =>
                        setBudgetPeriodEndDate(event.target.value)
                      }
                      className="mt-1 w-full min-w-0 rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
                    />
                  </label>
                </div>
                {budgetPeriodsError ? (
                  <p
                    role="alert"
                    className="text-xs text-red-600 dark:text-red-300"
                  >
                    {budgetPeriodsError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={isLoadingBudgetPeriods || isSavingBudgetPeriods}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSavingBudgetPeriods ? t.loading : t.addBudgetPeriod}
                </button>
              </form>
            </section>

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
              onClick={handleLogout}
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

      <AlertDialog.Root
        open={pendingBudgetPeriodRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBudgetPeriodRemoval(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <AlertDialog.Popup className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none transition-[opacity,transform] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <AlertDialog.Title className="text-lg font-semibold">
                {t.deleteTitle}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {pendingBudgetPeriodRemoval
                  ? t.confirmBudgetPeriodDelete(
                      pendingBudgetPeriodRemoval.name,
                    )
                  : ""}
              </AlertDialog.Description>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingBudgetPeriodRemoval(null)}
                >
                  {t.cancel}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSavingBudgetPeriods}
                  onClick={() => {
                    if (pendingBudgetPeriodRemoval) {
                      void handleRemoveBudgetPeriod(
                        pendingBudgetPeriodRemoval.id,
                      );
                      setPendingBudgetPeriodRemoval(null);
                    }
                  }}
                >
                  {t.remove}
                </Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <BottomNav
        items={navItems.map((item) => ({
          ...item,
          active: activeView === item.id,
        }))}
      />
    </>
  );
}
