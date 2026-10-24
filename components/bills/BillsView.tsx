"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CircleAlert,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Locale, Translation } from "@/lib/i18n";

type Bill = {
  id: string;
  title: string;
  amount: number | string;
  frequency_months: number | string;
  due_date: string;
};

type SavingsAccount = {
  id: string;
  name: string;
  balance: number | string;
};

type BillsViewProps = {
  userId: string;
  locale: Locale;
  t: Translation;
};

type BillForm = {
  title: string;
  amount: string;
  frequency_months: string;
  due_date: string;
};

const localeMap: Record<Locale, string> = {
  sv: "sv-SE",
  en: "en-US",
  ar: "ar-EG",
};

const billFields = "id, title, amount, frequency_months, due_date";
const billsSavingsAccountName = "Average bills";

function todayDateKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function monthlyAmount(bill: Bill) {
  const amount = Number(bill.amount);
  const frequencyMonths = Number(bill.frequency_months);

  if (
    !Number.isFinite(amount) ||
    !Number.isInteger(frequencyMonths) ||
    frequencyMonths <= 0
  ) {
    return null;
  }

  return amount / frequencyMonths;
}

export function BillsView({ userId, locale, t }: BillsViewProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [billsSavingsAccount, setBillsSavingsAccount] =
    useState<SavingsAccount | null>(null);
  const [savingsAccountLoading, setSavingsAccountLoading] = useState(true);
  const [savingsAccountLoadError, setSavingsAccountLoadError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyBillId, setBusyBillId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [form, setForm] = useState<BillForm>({
    title: "",
    amount: "",
    frequency_months: "1",
    due_date: todayDateKey(),
  });

  useEffect(() => {
    let isCurrent = true;

    const loadBills = async () => {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("bills")
        .select("id, title, amount, frequency_months, due_date")
        .eq("user_id", userId)
        .order("due_date", { ascending: true });

      if (!isCurrent) return;

      if (error) {
        console.error("Failed to load bills:", error);
        setBills([]);
        setLoadError(error.message);
      } else {
        setBills(data ?? []);
      }

      setLoading(false);
    };

    void loadBills();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  useEffect(() => {
    let isCurrent = true;

    const loadSavingsAccounts = async () => {
      setSavingsAccountLoading(true);
      setSavingsAccountLoadError("");

      const { data, error } = await supabase
        .from("savings_accounts")
        .select("id, name, balance")
        .eq("user_id", userId)
        .eq("name", billsSavingsAccountName)
        .order("updated_at", { ascending: false });

      if (!isCurrent) return;

      if (error) {
        console.error("Failed to load savings accounts:", error);
        setBillsSavingsAccount(null);
        setSavingsAccountLoadError(error.message);
      } else if ((data ?? []).length > 1) {
        setBillsSavingsAccount(null);
        setSavingsAccountLoadError(t.multipleBillsSavingsAccounts);
      } else {
        setBillsSavingsAccount(data?.[0] ?? null);
      }

      setSavingsAccountLoading(false);
    };

    void loadSavingsAccounts();

    return () => {
      isCurrent = false;
    };
  }, [userId, t.multipleBillsSavingsAccounts]);

  const billAmounts = bills.map((bill) => ({
    bill,
    monthlyAmount: monthlyAmount(bill),
  }));
  const totalMonthlySavings = billAmounts.reduce(
    (total, item) => total + (item.monthlyAmount ?? 0),
    0,
  );
  const hasInvalidBills = billAmounts.some(
    (item) => item.monthlyAmount === null,
  );
  const accountBalance = Number(billsSavingsAccount?.balance ?? 0);
  const savingsGap = Math.max(0, totalMonthlySavings - accountBalance);
  const savingsSurplus = Math.max(0, accountBalance - totalMonthlySavings);

  const resetForm = () => {
    setForm({
      title: "",
      amount: "",
      frequency_months: "1",
      due_date: todayDateKey(),
    });
    setEditingBillId(null);
    setActionError("");
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (bill: Bill) => {
    setForm({
      title: bill.title,
      amount: String(bill.amount),
      frequency_months: String(bill.frequency_months),
      due_date: bill.due_date,
    });
    setEditingBillId(bill.id);
    setActionError("");
    setIsFormOpen(true);
  };

  const handleSaveBill = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError("");

    const amount = Number(form.amount);
    const frequencyMonths = Number(form.frequency_months);
    if (
      !form.title.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isInteger(frequencyMonths) ||
      frequencyMonths <= 0 ||
      !form.due_date
    ) {
      setActionError(t.billValidationError);
      return;
    }

    const values = {
      title: form.title.trim(),
      amount,
      frequency_months: frequencyMonths,
      due_date: form.due_date,
    };

    setIsSaving(true);
    if (editingBillId) {
      const { data, error } = await supabase
        .from("bills")
        .update(values)
        .eq("id", editingBillId)
        .eq("user_id", userId)
        .select(billFields)
        .single();

      setIsSaving(false);
      if (error) {
        console.error("Failed to update bill:", error);
        setActionError(error.message);
        return;
      }

      setBills((current) =>
        current
          .map((bill) => (bill.id === data.id ? data : bill))
          .sort((a, b) => a.due_date.localeCompare(b.due_date)),
      );
    } else {
      const { data, error } = await supabase
        .from("bills")
        .insert({ ...values, user_id: userId })
        .select(billFields)
        .single();

      setIsSaving(false);
      if (error) {
        console.error("Failed to create bill:", error);
        setActionError(error.message);
        return;
      }

      setBills((current) =>
        [...current, data].sort((a, b) => a.due_date.localeCompare(b.due_date)),
      );
    }

    resetForm();
    setIsFormOpen(false);
  };

  const handleDeleteBill = async (bill: Bill) => {
    setActionError("");
    setBusyBillId(bill.id);

    const { data, error } = await supabase
      .from("bills")
      .delete()
      .eq("id", bill.id)
      .eq("user_id", userId)
      .select("id")
      .single();

    setBusyBillId(null);
    if (error || !data) {
      console.error("Failed to delete bill:", error);
      setActionError(error?.message ?? t.billDeleteError);
      return;
    }

    setBills((current) => current.filter((item) => item.id !== bill.id));
  };

  const inputClassName =
    "w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none";

  return (
    <>
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ReceiptText
                aria-hidden="true"
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
              />
              <h2 className="text-lg font-semibold text-foreground">
                {t.bills}
              </h2>
            </div>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 p-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {t.totalMonthlySavings}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {loading || loadError
              ? "—"
              : `${formatCurrency(totalMonthlySavings, localeMap[locale])} ${t.currency}`}
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">
            {t.savingsAccounts}
          </h2>
          {savingsAccountLoading ? (
            <p
              aria-live="polite"
              className="mt-3 text-sm text-muted-foreground"
            >
              {t.loading}
            </p>
          ) : savingsAccountLoadError ? (
            <div
              role="alert"
              className="mt-3 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-300"
            >
              <CircleAlert
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0"
              />
              <div>
                <p className="font-semibold">{t.savingsAccountsLoadError}</p>
                <p className="mt-1 break-words opacity-80">
                  {savingsAccountLoadError}
                </p>
              </div>
            </div>
          ) : billsSavingsAccount ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                {billsSavingsAccountName}
              </p>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
                {formatCurrency(accountBalance, localeMap[locale])} {t.currency}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.monthlySavingsTarget}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {loading || loadError
                      ? "—"
                      : `${formatCurrency(totalMonthlySavings, localeMap[locale])} ${t.currency}`}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-xs text-muted-foreground">
                    {savingsGap > 0
                      ? t.savingsStillNeeded
                      : t.savingsAboveTarget}
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold tabular-nums ${
                      savingsGap > 0
                        ? "text-amber-600 dark:text-amber-300"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {loading || loadError
                      ? "—"
                      : `${formatCurrency(savingsGap > 0 ? savingsGap : savingsSurplus, localeMap[locale])} ${t.currency}`}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {t.noBillsSavingsAccount}
            </p>
          )}
        </section>

        {actionError && !isFormOpen ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-300"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            <p className="break-words">{actionError}</p>
          </div>
        ) : null}

        {loading ? (
          <section
            aria-live="polite"
            className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground"
          >
            {t.loading}
          </section>
        ) : loadError ? (
          <section
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-600 dark:text-red-300"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            <div>
              <p className="font-semibold">{t.billsLoadError}</p>
              <p className="mt-1 break-words opacity-80">{loadError}</p>
            </div>
          </section>
        ) : bills.length === 0 ? (
          <section className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <ReceiptText
              aria-hidden="true"
              className="mx-auto h-9 w-9 text-muted-foreground"
              strokeWidth={1.6}
            />
            <p className="mt-3 text-sm text-muted-foreground">{t.noBills}</p>
          </section>
        ) : (
          <>
            {hasInvalidBills ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300"
              >
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0"
                />
                <p>{t.invalidBillData}</p>
              </div>
            ) : null}

            <ul className="space-y-3">
              {billAmounts.map(({ bill, monthlyAmount: amountPerMonth }) => (
                <li
                  key={bill.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-foreground">
                        {bill.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {Number.isInteger(Number(bill.frequency_months)) &&
                        Number(bill.frequency_months) > 0
                          ? t.billFrequency(Number(bill.frequency_months))
                          : "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-xs text-muted-foreground">
                        {t.monthlySavings}
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                        {amountPerMonth === null
                          ? "—"
                          : `${formatCurrency(amountPerMonth, localeMap[locale])} ${t.currency}`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">
                      {Number.isFinite(Number(bill.amount))
                        ? `${formatCurrency(Number(bill.amount), localeMap[locale])} ${t.currency}`
                        : "—"}
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays aria-hidden="true" className="h-4 w-4" />
                      <time dateTime={bill.due_date}>{bill.due_date}</time>
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => openEditForm(bill)}
                      disabled={busyBillId !== null}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                      {t.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteBill(bill)}
                      disabled={busyBillId !== null}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      {busyBillId === bill.id ? t.loading : t.remove}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Drawer
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DrawerContent className="mx-auto max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl">
          <DrawerHeader className="border-b border-border px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {editingBillId ? t.editBill : t.newBill}
              </DrawerTitle>
              <DrawerClose
                type="button"
                aria-label={t.close}
                className="rounded-full border border-border bg-muted p-2 text-muted-foreground transition hover:border-ring hover:text-foreground"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </DrawerClose>
            </div>
          </DrawerHeader>
          <form
            onSubmit={handleSaveBill}
            className="space-y-4 overflow-y-auto px-4 pb-6 pt-4"
          >
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              <span>{t.billTitle}</span>
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              <span>{t.amountLabel}</span>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              <span>{t.billFrequencyLabel}</span>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={form.frequency_months}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    frequency_months: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              <span>{t.dueDate}</span>
              <input
                required
                type="date"
                value={form.due_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    due_date: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>

            {actionError ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-300"
              >
                <CircleAlert
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0"
                />
                <p className="break-words">{actionError}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? t.loading
                : editingBillId
                  ? t.updateBill
                  : t.createBill}
            </button>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}
