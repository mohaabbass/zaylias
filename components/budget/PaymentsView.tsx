"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CircleAlert, CreditCard, X } from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { normalizeCategoryValue } from "@/lib/i18n";
import type { Locale, Translation } from "@/lib/i18n";

type Payment = {
  id: string;
  title: string;
  amount: number | string;
  category: string;
  due_date: string;
  created_at: string;
};

type PaymentsViewProps = {
  userId: string;
  onAddExpense: (payment: {
    title: string;
    amount: string;
    category: string;
    type: "expense";
  }) => Promise<string | null>;
  onDeleteExpense: (id: string) => Promise<boolean>;
  onPaymentsChange: () => void;
  locale: Locale;
  t: Translation;
};

const localeMap: Record<Locale, string> = {
  sv: "sv-SE",
  en: "en-US",
  ar: "ar-EG",
};

const paymentFields = "id, title, amount, category, due_date, created_at";

export function PaymentsView({
  userId,
  onAddExpense,
  onDeleteExpense,
  onPaymentsChange,
  locale,
  t,
}: PaymentsViewProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "",
    due_date: "",
  });
  const paymentCategories = t.expenseCategories;

  useEffect(() => {
    let isCurrent = true;

    const loadPayments = async () => {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("payments")
        .select(paymentFields)
        .eq("user_id", userId)
        .order("due_date", { ascending: true });

      if (!isCurrent) return;

      if (error) {
        console.error("Failed to load payments:", error);
        setPayments([]);
        setLoadError(error.message);
      } else {
        setPayments(data ?? []);
      }
      setLoading(false);
    };

    void loadPayments();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  const totalPayments = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  const resetForm = () => {
    setForm({ title: "", amount: "", category: "", due_date: "" });
    setEditingPaymentId(null);
    setActionError("");
  };

  const openEditForm = (payment: Payment) => {
    const category = normalizeCategoryValue(payment.category);
    setForm({
      title: payment.title,
      amount: String(payment.amount),
      category,
      due_date: payment.due_date,
    });
    setEditingPaymentId(payment.id);
    setActionError("");
    setIsFormOpen(true);
  };

  const handleSavePayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError("");

    const amount = Number(form.amount);
    if (
      !form.title.trim() ||
      !form.category.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !form.due_date
    ) {
      setActionError(t.paymentValidationError);
      return;
    }

    if (!editingPaymentId) {
      return;
    }

    setIsSaving(true);
    const values = {
      title: form.title.trim(),
      amount,
      category: form.category.trim(),
      due_date: form.due_date,
    };

    const { data, error } = await supabase
      .from("payments")
      .update(values)
      .eq("id", editingPaymentId)
      .eq("user_id", userId)
      .select(paymentFields)
      .single();

    setIsSaving(false);
    if (error) {
      console.error("Failed to update payment:", error);
      setActionError(error.message);
      return;
    }

    setPayments((current) =>
      current.map((payment) => (payment.id === data.id ? data : payment)),
    );
    onPaymentsChange();

    resetForm();
    setIsFormOpen(false);
  };

  const handleDeletePayment = async (payment: Payment) => {
    setActionError("");
    setBusyPaymentId(payment.id);

    const { data, error } = await supabase
      .from("payments")
      .delete()
      .eq("id", payment.id)
      .eq("user_id", userId)
      .select("id")
      .single();

    setBusyPaymentId(null);
    if (error || !data) {
      console.error("Failed to delete payment:", error);
      setActionError(error?.message ?? t.paymentDeleteError);
      return;
    }

    setPayments((current) => current.filter((item) => item.id !== payment.id));
    onPaymentsChange();
  };

  const handleMarkPaid = async (payment: Payment) => {
    setActionError("");
    setBusyPaymentId(payment.id);

    const expenseId = await onAddExpense({
      title: payment.title,
      amount: String(payment.amount),
      category: payment.category,
      type: "expense",
    });

    if (!expenseId) {
      setActionError(t.paymentPaidError);
      setBusyPaymentId(null);
      return;
    }

    const { data, error } = await supabase
      .from("payments")
      .delete()
      .eq("id", payment.id)
      .eq("user_id", userId)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to remove paid payment:", error);
      const expenseRemoved = await onDeleteExpense(expenseId);
      setActionError(
        expenseRemoved
          ? (error?.message ?? t.paymentDeleteError)
          : t.paymentRollbackError,
      );
      setBusyPaymentId(null);
      return;
    }

    setPayments((current) => current.filter((item) => item.id !== payment.id));
    onPaymentsChange();
    setBusyPaymentId(null);
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(localeMap[locale], {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));

  return (
    <>
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {t.payments}
            </h2>
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {t.totalPayments}
          </p>
          <p className="mt-2 text-2xl font-semibold text-red-500">
            {formatCurrency(totalPayments, localeMap[locale])} {t.currency}
          </p>
        </section>

        {actionError ? (
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
              <p className="font-semibold">{t.paymentsLoadError}</p>
              <p className="mt-1 break-words opacity-80">{loadError}</p>
            </div>
          </section>
        ) : payments.length === 0 ? (
          <section className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <CreditCard
              aria-hidden="true"
              className="mx-auto h-9 w-9 text-muted-foreground"
              strokeWidth={1.6}
            />
            <p className="mt-3 text-sm text-muted-foreground">{t.noPayments}</p>
          </section>
        ) : (
          <ul className="space-y-3">
            {payments.map((payment) => {
              const isBusy = busyPaymentId === payment.id;
              return (
                <li
                  key={payment.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-foreground">
                        {payment.title}
                      </p>
                      {/* <p className="mt-1 text-xs text-muted-foreground">
                        {payment.category}
                      </p> */}
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-red-500">
                      {formatCurrency(
                        Number(payment.amount),
                        localeMap[locale],
                      )}{" "}
                      {t.currency}
                    </p>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays aria-hidden="true" className="h-4 w-4" />
                    {t.dueDate}: {formatDate(payment.due_date)}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleMarkPaid(payment)}
                      className="rounded-lg bg-emerald-600 px-2 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {isBusy ? t.loading : t.markPaid}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => openEditForm(payment)}
                      className="rounded-lg border border-border px-2 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                    >
                      {t.edit}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleDeletePayment(payment)}
                      className="rounded-lg bg-red-500/10 px-2 py-2 text-xs font-medium text-red-600 transition hover:bg-red-500/15 dark:text-red-300 disabled:opacity-50"
                    >
                      {t.remove}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
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
                {t.editPayment}
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

          <form
            onSubmit={(event) => void handleSavePayment(event)}
            className="space-y-4 px-4 pb-6 pt-4"
          >
            <label className="block text-xs text-muted-foreground">
              {t.paymentTitle}
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
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
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                {t.categoryLabel}
                <select
                  required
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
                >
                  <option value="" disabled>
                    {t.paymentCategoryPlaceholder}
                  </option>
                  {!paymentCategories.some(
                    (category) => category.value === form.category,
                  ) && form.category ? (
                    <option value={form.category}>{form.category}</option>
                  ) : null}
                  {paymentCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
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
                value={form.due_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    due_date: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
              />
            </label>

            {actionError ? (
              <p
                role="alert"
                className="text-sm text-red-600 dark:text-red-300"
              >
                {actionError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {isSaving ? t.loading : t.savePayment}
            </button>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}
