"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Pencil, Plus, Trash2, Wallet, X } from "lucide-react";

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

type SavingsAccount = {
  id: string;
  name: string;
  balance: number | string;
};

type SavingsAccountForm = {
  name: string;
  balance: string;
};

type SavingsAccountsViewProps = {
  userId: string;
  locale: Locale;
  t: Translation;
};

const billsSavingsAccountName = "Average bills";
const accountFields = "id, name, balance";
const localeMap: Record<Locale, string> = {
  sv: "sv-SE",
  en: "en-US",
  ar: "ar-EG",
};

export function SavingsAccountsView({
  userId,
  locale,
  t,
}: SavingsAccountsViewProps) {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [form, setForm] = useState<SavingsAccountForm>({
    name: billsSavingsAccountName,
    balance: "0",
  });

  useEffect(() => {
    let isCurrent = true;

    const loadAccounts = async () => {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("savings_accounts")
        .select(accountFields)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (!isCurrent) return;

      if (error) {
        console.error("Failed to load savings accounts:", error);
        setAccounts([]);
        setLoadError(error.message);
      } else {
        setAccounts(data ?? []);
      }

      setLoading(false);
    };

    void loadAccounts();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  const billsAccountExists = accounts.some(
    (account) => account.name === billsSavingsAccountName,
  );
  const totalBalance = accounts.reduce((total, account) => {
    const balance = Number(account.balance);
    return total + (Number.isFinite(balance) ? balance : 0);
  }, 0);

  const resetForm = () => {
    setForm({
      name: billsAccountExists ? "" : billsSavingsAccountName,
      balance: "0",
    });
    setEditingAccountId(null);
    setActionError("");
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (account: SavingsAccount) => {
    setForm({
      name: account.name,
      balance: String(account.balance),
    });
    setEditingAccountId(account.id);
    setActionError("");
    setIsFormOpen(true);
  };

  const handleSaveAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError("");

    const balance = Number(form.balance);
    const name = form.name.trim();
    const duplicateBillsAccount = accounts.some(
      (account) =>
        account.name === billsSavingsAccountName &&
        account.id !== editingAccountId,
    );
    if (
      !name ||
      !Number.isFinite(balance) ||
      balance < 0 ||
      (name === billsSavingsAccountName && duplicateBillsAccount)
    ) {
      setActionError(
        name === billsSavingsAccountName && duplicateBillsAccount
          ? t.duplicateBillsSavingsAccount
          : t.savingsAccountValidationError,
      );
      return;
    }

    const values = { name, balance };
    setIsSaving(true);

    if (editingAccountId) {
      const { data, error } = await supabase
        .from("savings_accounts")
        .update(values)
        .eq("id", editingAccountId)
        .eq("user_id", userId)
        .select(accountFields)
        .single();

      setIsSaving(false);
      if (error) {
        console.error("Failed to update savings account:", error);
        setActionError(error.message);
        return;
      }

      setAccounts((current) =>
        current.map((account) => (account.id === data.id ? data : account)),
      );
    } else {
      const { data, error } = await supabase
        .from("savings_accounts")
        .insert({ ...values, user_id: userId })
        .select(accountFields)
        .single();

      setIsSaving(false);
      if (error) {
        console.error("Failed to create savings account:", error);
        setActionError(error.message);
        return;
      }

      setAccounts((current) => [data, ...current]);
    }

    setIsFormOpen(false);
    resetForm();
  };

  const handleDeleteAccount = async (account: SavingsAccount) => {
    setActionError("");
    setBusyAccountId(account.id);

    const { data, error } = await supabase
      .from("savings_accounts")
      .delete()
      .eq("id", account.id)
      .eq("user_id", userId)
      .select("id")
      .single();

    setBusyAccountId(null);
    if (error || !data) {
      console.error("Failed to delete savings account:", error);
      setActionError(error?.message ?? t.savingsAccountDeleteError);
      return;
    }

    setAccounts((current) => current.filter((item) => item.id !== account.id));
  };

  const inputClassName =
    "w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none";

  return (
    <>
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Wallet
                aria-hidden="true"
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
              />
              <h2 className="text-lg font-semibold text-foreground">
                {t.savingsAccounts}
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
          {/* <p className="mt-3 text-sm text-muted-foreground">
            {t.billsSavingsAccountHelp}
          </p> */}
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {t.savingsAccountBalance}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {loading || loadError
              ? "—"
              : `${formatCurrency(totalBalance, localeMap[locale])} ${t.currency}`}
          </p>
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
              <p className="font-semibold">{t.savingsAccountsLoadError}</p>
              <p className="mt-1 break-words opacity-80">{loadError}</p>
            </div>
          </section>
        ) : accounts.length === 0 ? (
          <section className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <Wallet
              aria-hidden="true"
              className="mx-auto h-9 w-9 text-muted-foreground"
              strokeWidth={1.6}
            />
            <p className="mt-3 text-sm text-muted-foreground">
              {t.noSavingsAccounts}
            </p>
          </section>
        ) : (
          <ul className="space-y-3">
            {accounts.map((account) => {
              const isBillsAccount = account.name === billsSavingsAccountName;

              return (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-foreground">
                      {account.name}
                    </h3>
                    {isBillsAccount ? (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        {t.billsSavingsAccountLabel}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(
                        Number(account.balance),
                        localeMap[locale],
                      )}{" "}
                      {t.currency}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(account)}
                      disabled={busyAccountId !== null}
                      aria-label={`${t.edit}: ${account.name}`}
                      className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAccount(account)}
                      disabled={busyAccountId !== null}
                      aria-label={`${t.remove}: ${account.name}`}
                      className="rounded-lg bg-red-500/10 p-2 text-red-500 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300"
                    >
                      {busyAccountId === account.id ? (
                        <span className="text-xs">{t.loading}</span>
                      ) : (
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      )}
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
                {editingAccountId ? t.editSavingsAccount : t.newSavingsAccount}
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
            onSubmit={handleSaveAccount}
            className="space-y-4 overflow-y-auto px-4 pb-6 pt-4"
          >
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              <span>{t.savingsAccountName}</span>
              <input
                required
                maxLength={120}
                value={form.name}
                disabled={accounts.some(
                  (account) =>
                    account.id === editingAccountId &&
                    account.name === billsSavingsAccountName,
                )}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              <span>{t.savingsAccountBalance}</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.balance}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    balance: event.target.value,
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
                : editingAccountId
                  ? t.updateSavingsAccount
                  : t.createSavingsAccount}
            </button>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}
