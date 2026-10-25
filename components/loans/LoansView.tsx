"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CircleAlert,
  HandCoins,
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

type Loan = {
  id: string;
  title: string;
  total_amount: number | string;
  remaining_amount: number | string;
  interest_rate: number | string | null;
  monthly_payment: number | string | null;
  invoice_fee: number | string | null;
  extra_costs: number | string | null;
  due_date: string | null;
};

type LoansViewProps = {
  userId: string;
  locale: Locale;
  t: Translation;
};

const localeMap: Record<Locale, string> = {
  sv: "sv-SE",
  en: "en-US",
  ar: "ar-EG",
};

function numericValue(value: number | string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function LoansView({ userId, locale, t }: LoansViewProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [pressedLoanId, setPressedLoanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    total_amount: "",
    remaining_amount: "",
    interest_rate: "",
    monthly_payment: "",
    invoice_fee: "",
    extra_costs: "",
    due_date: "",
  });

  useEffect(() => {
    let isCurrent = true;

    const loadLoans = async () => {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("loans")
        .select(
          "id, title, total_amount, remaining_amount, interest_rate, monthly_payment, invoice_fee, extra_costs, due_date",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!isCurrent) return;

      if (queryError) {
        console.error("Failed to load loans:", queryError);
        setLoans([]);
        setError(queryError.message);
      } else {
        setLoans(data ?? []);
      }

      setLoading(false);
    };

    void loadLoans();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!pressedLoanId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        !target ||
        (!target.closest("[data-loan-action]") &&
          !target.closest("[data-loan-row]"))
      ) {
        setPressedLoanId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [pressedLoanId]);

  useEffect(
    () => () => {
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
      }
    },
    [],
  );

  const currencyLocale = localeMap[locale];
  const totalBorrowed = loans.reduce(
    (sum, loan) => sum + numericValue(loan.total_amount),
    0,
  );
  const totalRemaining = loans.reduce(
    (sum, loan) => sum + numericValue(loan.remaining_amount),
    0,
  );
  const totalMonthlyPayment = loans.reduce(
    (sum, loan) => sum + numericValue(loan.monthly_payment),
    0,
  );

  const resetForm = () => {
    setForm({
      title: "",
      total_amount: "",
      remaining_amount: "",
      interest_rate: "",
      monthly_payment: "",
      invoice_fee: "",
      extra_costs: "",
      due_date: "",
    });
    setCreateError("");
    setEditingLoanId(null);
  };

  const startLongPress = (id: string) => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
    }
    longPressTimer.current = window.setTimeout(() => {
      setPressedLoanId(id);
    }, 500);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDeleteLoan = async (id: string) => {
    setDeleteError("");
    setDeletingLoanId(id);

    const { error: deleteQueryError } = await supabase
      .from("loans")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    setDeletingLoanId(null);
    setPressedLoanId(null);

    if (deleteQueryError) {
      console.error("Failed to delete loan:", deleteQueryError);
      setDeleteError(deleteQueryError.message);
      return;
    }

    setLoans((current) => current.filter((loan) => loan.id !== id));
  };

  const openEditLoan = (loan: Loan) => {
    setForm({
      title: loan.title,
      total_amount: String(loan.total_amount),
      remaining_amount: String(loan.remaining_amount),
      interest_rate:
        loan.interest_rate == null ? "" : String(loan.interest_rate),
      monthly_payment:
        loan.monthly_payment == null ? "" : String(loan.monthly_payment),
      invoice_fee: loan.invoice_fee == null ? "" : String(loan.invoice_fee),
      extra_costs: loan.extra_costs == null ? "" : String(loan.extra_costs),
      due_date: loan.due_date ?? "",
    });
    setEditingLoanId(loan.id);
    setCreateError("");
    setPressedLoanId(null);
    setIsCreateOpen(true);
  };

  const handleCreateLoan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");

    const totalAmount = Number(form.total_amount);
    const remainingAmount = Number(form.remaining_amount);
    const interestRate =
      form.interest_rate.trim() === "" ? null : Number(form.interest_rate);
    const monthlyPayment =
      form.monthly_payment.trim() === "" ? null : Number(form.monthly_payment);
    const invoiceFee = Number(form.invoice_fee || 0);
    const extraCosts = Number(form.extra_costs || 0);
    const optionalAmounts = [
      interestRate,
      monthlyPayment,
      invoiceFee,
      extraCosts,
    ];
    if (
      !form.title.trim() ||
      !Number.isFinite(totalAmount) ||
      !Number.isFinite(remainingAmount) ||
      totalAmount <= 0 ||
      remainingAmount < 0 ||
      remainingAmount > totalAmount ||
      optionalAmounts.some(
        (amount) => amount !== null && (!Number.isFinite(amount) || amount < 0),
      )
    ) {
      setCreateError(t.loanAmountError);
      return;
    }

    const loanValues = {
      title: form.title.trim(),
      total_amount: totalAmount,
      remaining_amount: remainingAmount,
      interest_rate: interestRate,
      monthly_payment: monthlyPayment,
      invoice_fee: invoiceFee,
      extra_costs: extraCosts,
      due_date: form.due_date || null,
    };

    setIsSaving(true);
    if (editingLoanId) {
      const { data, error: updateError } = await supabase
        .from("loans")
        .update(loanValues)
        .eq("id", editingLoanId)
        .eq("user_id", userId)
        .select(
          "id, title, total_amount, remaining_amount, interest_rate, monthly_payment, invoice_fee, extra_costs, due_date",
        )
        .single();

      setIsSaving(false);
      if (updateError) {
        console.error("Failed to update loan:", updateError);
        setCreateError(updateError.message);
        return;
      }

      setLoans((current) =>
        current.map((loan) => (loan.id === data.id ? data : loan)),
      );
    } else {
      const { data, error: insertError } = await supabase
        .from("loans")
        .insert({ ...loanValues, user_id: userId })
        .select(
          "id, title, total_amount, remaining_amount, interest_rate, monthly_payment, invoice_fee, extra_costs, due_date",
        )
        .single();

      setIsSaving(false);
      if (insertError) {
        console.error("Failed to create loan:", insertError);
        setCreateError(insertError.message);
        return;
      }

      setLoans((current) => [data, ...current]);
    }

    resetForm();
    setIsCreateOpen(false);
  };

  let loansContent;
  if (loading) {
    loansContent = (
      <section
        aria-live="polite"
        className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground"
      >
        {t.loading}
      </section>
    );
  } else if (error) {
    loansContent = (
      <section
        aria-live="polite"
        className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-600 dark:text-red-300"
      >
        <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">{t.loansLoadError}</p>
          <p className="mt-1 break-words opacity-80">{error}</p>
        </div>
      </section>
    );
  } else if (loans.length === 0) {
    loansContent = (
      <section className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
        <HandCoins
          aria-hidden="true"
          className="mx-auto h-9 w-9 text-muted-foreground"
          strokeWidth={1.6}
        />
        <h2 className="mt-3 font-semibold text-foreground">{t.loans}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.noLoans}</p>
      </section>
    );
  } else {
    loansContent = (
      <>
        <section className="rounded-2xl border border-border bg-linear-to-br from-card via-card to-emerald-500/5 p-5">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t.loanOverview}
          </h2>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {formatCurrency(totalRemaining, currencyLocale)} {t.currency}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.remainingAmount}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div>
              <p className="text-xs text-muted-foreground">{t.totalAmount}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(totalBorrowed, currencyLocale)} {t.currency}
              </p>
            </div>
            <div className="text-end">
              <p className="text-xs text-muted-foreground">
                {t.monthlyPayment}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(totalMonthlyPayment, currencyLocale)}{" "}
                {t.currency}
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {loans.map((loan) => {
            const total = numericValue(loan.total_amount);
            const remaining = numericValue(loan.remaining_amount);
            const paidPercentage =
              total > 0
                ? Math.min(
                    100,
                    Math.max(0, ((total - remaining) / total) * 100),
                  )
                : 0;
            const dueDate = loan.due_date
              ? new Intl.DateTimeFormat(currencyLocale, {
                  dateStyle: "medium",
                }).format(new Date(`${loan.due_date}T00:00:00`))
              : null;

            return (
              <div
                key={loan.id}
                className="relative select-none"
                data-loan-row
                onMouseDown={() => startLongPress(loan.id)}
                onMouseUp={clearLongPress}
                onMouseLeave={clearLongPress}
                onTouchStart={(event) => {
                  event.preventDefault();
                  startLongPress(loan.id);
                }}
                onTouchMove={clearLongPress}
                onTouchEnd={clearLongPress}
                onContextMenu={(event) => event.preventDefault()}
              >
                <article className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                      <HandCoins aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-foreground">
                        {loan.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.remainingAmount}
                      </p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
                        {formatCurrency(remaining, currencyLocale)} {t.currency}
                      </p>
                    </div>
                  </div>

                  <div
                    aria-label={`${Math.round(paidPercentage)}% ${t.loanPaid}`}
                    className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
                    role="img"
                  >
                    <span
                      className="block h-full rounded-full bg-emerald-500 transition-[width]"
                      style={{ width: `${paidPercentage}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {Math.round(paidPercentage)}% {t.loanPaid}
                    </span>
                    <span>
                      {t.totalAmount}: {formatCurrency(total, currencyLocale)}{" "}
                      {t.currency}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t.monthlyPayment}
                      </dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
                        {loan.monthly_payment == null
                          ? "—"
                          : `${formatCurrency(numericValue(loan.monthly_payment), currencyLocale)} ${t.currency}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t.interestRate}
                      </dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
                        {loan.interest_rate == null
                          ? "—"
                          : `${loan.interest_rate}%`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t.invoiceFee}
                      </dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
                        {formatCurrency(
                          numericValue(loan.invoice_fee),
                          currencyLocale,
                        )}{" "}
                        {t.currency}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t.extraCosts}
                      </dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums text-foreground">
                        {formatCurrency(
                          numericValue(loan.extra_costs),
                          currencyLocale,
                        )}{" "}
                        {t.currency}
                      </dd>
                    </div>
                    {dueDate && (
                      <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays aria-hidden="true" className="h-4 w-4" />
                        <span>
                          {t.dueDate}: {dueDate}
                        </span>
                      </div>
                    )}
                  </dl>
                </article>
                {pressedLoanId === loan.id && (
                  <div
                    data-loan-action
                    className="animate-action-in absolute inset-x-2 top-1 z-10 flex gap-2 rounded-xl border border-border bg-popover p-2"
                  >
                    <button
                      type="button"
                      onClick={() => openEditLoan(loan)}
                      disabled={deletingLoanId === loan.id}
                      className="flex-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-500/15 dark:text-emerald-300"
                    >
                      {t.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteLoan(loan.id)}
                      disabled={deletingLoanId === loan.id}
                      className="flex-1 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300"
                    >
                      {deletingLoanId === loan.id ? t.loading : t.remove}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPressedLoanId(null)}
                      disabled={deletingLoanId === loan.id}
                      className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      {t.cancel}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const inputClassName =
    "w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none";

  return (
    <div className="space-y-5">
      {deleteError && (
        <section
          aria-live="polite"
          className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-300"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{t.loansDeleteError}</p>
            <p className="mt-1 break-words opacity-80">{deleteError}</p>
          </div>
        </section>
      )}
      {loansContent}

      <Drawer
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DrawerContent className="mx-auto max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl">
          <DrawerHeader className="border-b border-border px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {editingLoanId ? t.editLoan : t.newLoan}
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
            onSubmit={handleCreateLoan}
            className="space-y-4 overflow-y-auto px-4 pb-6 pt-4"
          >
            <label className="block text-xs text-muted-foreground">
              {t.loanTitle}
              <input
                autoFocus
                required
                maxLength={120}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className={`${inputClassName} mt-1`}
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
                  value={form.total_amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      total_amount: event.target.value,
                    }))
                  }
                  className={`${inputClassName} mt-1`}
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                {t.remainingAmount}
                <input
                  required
                  type="number"
                  min="0"
                  max={form.total_amount || undefined}
                  step="0.01"
                  value={form.remaining_amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      remaining_amount: event.target.value,
                    }))
                  }
                  className={`${inputClassName} mt-1`}
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
                  value={form.interest_rate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      interest_rate: event.target.value,
                    }))
                  }
                  className={`${inputClassName} mt-1`}
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                {t.monthlyPayment}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthly_payment}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      monthly_payment: event.target.value,
                    }))
                  }
                  className={`${inputClassName} mt-1`}
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                {t.invoiceFee}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.invoice_fee}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      invoice_fee: event.target.value,
                    }))
                  }
                  className={`${inputClassName} mt-1`}
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                {t.extraCosts}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.extra_costs}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      extra_costs: event.target.value,
                    }))
                  }
                  className={`${inputClassName} mt-1`}
                />
              </label>
            </div>

            <label className="block text-xs text-muted-foreground">
              {t.dueDate}
              <input
                type="date"
                value={form.due_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    due_date: event.target.value,
                  }))
                }
                className={`${inputClassName} mt-1`}
              />
            </label>

            {createError && (
              <p
                aria-live="polite"
                className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-300"
              >
                {createError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? t.loading
                : editingLoanId
                  ? t.updateLoan
                  : t.createLoan}
            </button>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
