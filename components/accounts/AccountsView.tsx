"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Landmark, Pencil, Star, Trash2, X } from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatCurrency, sortAccountsByFavorite } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Locale, Translation } from "@/lib/i18n";
import type { Account } from "@/types/finance";

type AccountsViewProps = {
  userId: string;
  locale: Locale;
  t: Translation;
  onAccountsChange: () => void;
};

const localeMap: Record<Locale, string> = {
  sv: "sv-SE",
  en: "en-US",
  ar: "ar-EG",
};

const inputClassName =
  "w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none";

export function AccountsView({
  userId,
  locale,
  t,
  onAccountsChange,
}: AccountsViewProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [accountActionError, setAccountActionError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null,
  );
  const [updatingFavoriteAccountId, setUpdatingFavoriteAccountId] = useState<
    string | null
  >(null);
  const [form, setForm] = useState({
    name: "",
    type: "checking",
    balance: "0",
  });

  useEffect(() => {
    let isCurrent = true;

    const loadAccounts = async () => {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, type, balance, is_favorite, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!isCurrent) return;

      if (error) {
        console.error("Failed to load accounts:", error);
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

  const totalBalance = accounts.reduce(
    (total, account) => total + Number(account.balance),
    0,
  );
  const sortedAccounts = sortAccountsByFavorite(accounts, localeMap[locale]);

  const resetForm = () => {
    setForm({ name: "", type: "checking", balance: "0" });
    setFormError("");
    setEditingAccountId(null);
  };

  const openEditForm = (account: Account) => {
    setForm({
      name: account.name,
      type: account.type ?? "checking",
      balance: String(account.balance),
    });
    setFormError("");
    setEditingAccountId(account.id);
    setIsFormOpen(true);
  };

  const handleSaveAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const balance = Number(form.balance);
    if (!form.name.trim() || !Number.isFinite(balance)) {
      setFormError(t.accountValidationError);
      return;
    }

    const values = {
      name: form.name.trim(),
      type: form.type,
      balance,
    };

    setSaving(true);
    const result = editingAccountId
      ? await supabase
          .from("accounts")
          .update(values)
          .eq("id", editingAccountId)
          .eq("user_id", userId)
          .select("id, name, type, balance, is_favorite, created_at")
          .single()
      : await supabase
          .from("accounts")
          .insert({ ...values, user_id: userId })
          .select("id, name, type, balance, is_favorite, created_at")
          .single();
    setSaving(false);

    if (result.error) {
      console.error(
        editingAccountId
          ? "Failed to update account:"
          : "Failed to create account:",
        result.error,
      );
      setFormError(result.error.message);
      return;
    }

    if (editingAccountId) {
      setAccounts((current) =>
        current.map((account) =>
          account.id === result.data.id ? result.data : account,
        ),
      );
    } else {
      setAccounts((current) => [result.data, ...current]);
    }

    resetForm();
    setIsFormOpen(false);
    onAccountsChange();
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!window.confirm(t.confirmAccountDelete)) return;

    setAccountActionError("");
    setDeletingAccountId(account.id);
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", account.id)
      .eq("user_id", userId);
    setDeletingAccountId(null);

    if (error) {
      console.error("Failed to delete account:", error);
      setAccountActionError(error.message);
      return;
    }

    setAccounts((current) =>
      current.filter((currentAccount) => currentAccount.id !== account.id),
    );
    onAccountsChange();
  };

  const handleToggleFavorite = async (account: Account) => {
    setAccountActionError("");
    setUpdatingFavoriteAccountId(account.id);
    const isFavorite = !account.is_favorite;
    const { data, error } = await supabase
      .from("accounts")
      .update({ is_favorite: isFavorite })
      .eq("id", account.id)
      .eq("user_id", userId)
      .select("id, name, type, balance, is_favorite, created_at")
      .single();
    setUpdatingFavoriteAccountId(null);

    if (error) {
      console.error("Failed to update account favorite:", error);
      setAccountActionError(error.message);
      return;
    }

    setAccounts((current) =>
      current.map((currentAccount) =>
        currentAccount.id === data.id ? data : currentAccount,
      ),
    );
    onAccountsChange();
  };

  const accountTypeLabel = (type: string | null) => {
    if (type === "checking") return t.checkingAccount;
    if (type === "savings") return t.savingsAccount;
    if (type === "other") return t.otherAccount;
    return type || t.checkingAccount;
  };

  return (
    <div className="space-y-5">
      {accountActionError ? (
        <section
          aria-live="polite"
          className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-300"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{t.accountActionError}</p>
            <p className="mt-1 break-words opacity-80">{accountActionError}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            {t.accountsOverview}
          </h2>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {formatCurrency(totalBalance, localeMap[locale])} {t.currency}
          </p>
        </div>
        <hr className="my-4 border-border" />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <p className="text-muted-foreground">
            {loading
              ? t.loading
              : t.accountCount.replace("{count}", String(accounts.length))}
          </p>
          <p className="text-end text-muted-foreground">
            {loading
              ? t.loading
              : t.favoriteAccountCount.replace(
                  "{count}",
                  String(
                    accounts.filter((account) => account.is_favorite).length,
                  ),
                )}
          </p>
        </div>
      </section>

      {loading ? (
        <section
          aria-live="polite"
          className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground"
        >
          {t.loading}
        </section>
      ) : loadError ? (
        <section
          aria-live="polite"
          className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-600 dark:text-red-300"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{t.accountsLoadError}</p>
            <p className="mt-1 break-words opacity-80">{loadError}</p>
          </div>
        </section>
      ) : accounts.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
          <Landmark
            aria-hidden="true"
            className="mx-auto h-9 w-9 text-muted-foreground"
            strokeWidth={1.6}
          />
          <h2 className="mt-3 font-semibold text-foreground">{t.accounts}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.noAccounts}</p>
        </section>
      ) : (
        <div className="space-y-3">
          {sortedAccounts.map((account) => (
            <article
              key={account.id}
              className={`rounded-2xl border p-5 ${
                account.is_favorite
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
                  <Landmark aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-foreground">
                    {account.name}
                  </h3>
                  {/* {account.is_favorite ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <Star
                        aria-hidden="true"
                        className="h-3 w-3 fill-current"
                      />
                      {t.favorite}
                    </span>
                  ) : null} */}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {accountTypeLabel(account.type)}
                  </p>
                  <p className="mt-2 text-md font-bold tabular-nums text-foreground">
                    {formatCurrency(Number(account.balance), localeMap[locale])}{" "}
                    {t.currency}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    aria-label={`${account.is_favorite ? t.removeFavorite : t.markFavorite} ${account.name}`}
                    aria-pressed={account.is_favorite}
                    onClick={() => void handleToggleFavorite(account)}
                    disabled={
                      updatingFavoriteAccountId !== null ||
                      deletingAccountId === account.id
                    }
                    className={`rounded-lg border border-border p-2 transition disabled:opacity-50 ${
                      account.is_favorite
                        ? "text-amber-500 hover:border-amber-500 hover:text-amber-600"
                        : "text-muted-foreground hover:border-amber-500 hover:text-amber-500"
                    }`}
                  >
                    <Star
                      aria-hidden="true"
                      className={`h-4 w-4 ${account.is_favorite ? "fill-current" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={`${t.edit} ${account.name}`}
                    onClick={() => openEditForm(account)}
                    disabled={
                      deletingAccountId === account.id ||
                      updatingFavoriteAccountId === account.id
                    }
                    className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-50 dark:hover:text-emerald-400"
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${t.remove} ${account.name}`}
                    onClick={() => void handleDeleteAccount(account)}
                    disabled={
                      deletingAccountId === account.id ||
                      updatingFavoriteAccountId === account.id
                    }
                    className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-500 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-300"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Drawer
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DrawerContent className="mx-auto max-h-[90dvh] max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl">
          <DrawerHeader className="border-b border-border px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {editingAccountId ? t.editAccount : t.newAccount}
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
            onSubmit={(event) => void handleSaveAccount(event)}
            className="space-y-4 overflow-y-auto px-4 pb-6 pt-4"
          >
            <label className="block text-xs text-muted-foreground">
              {t.accountName}
              <input
                autoFocus
                required
                maxLength={120}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={`${inputClassName} mt-1`}
              />
            </label>

            <label className="block text-xs text-muted-foreground">
              {t.accountType}
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
                className={`${inputClassName} mt-1`}
              >
                {!["checking", "savings", "other"].includes(form.type) ? (
                  <option value={form.type}>{form.type}</option>
                ) : null}
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
                value={form.balance}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    balance: event.target.value,
                  }))
                }
                className={`${inputClassName} mt-1`}
              />
            </label>

            {formError ? (
              <p
                role="alert"
                className="text-sm text-red-600 dark:text-red-300"
              >
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving
                ? t.loading
                : editingAccountId
                  ? t.updateAccount
                  : t.saveAccount}
            </button>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
