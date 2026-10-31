import type { Locale, Translation } from "@/lib/i18n";
import { sortAccountsByFavorite } from "@/lib/utils";
import type { Account, TransactionType } from "@/types/finance";

const localeMap: Record<Locale, string> = {
  sv: "sv-SE",
  en: "en-US",
  ar: "ar-EG",
};

type TransactionFormProps = {
  accounts: Account[];
  locale: Locale;
  accountsLoading: boolean;
  accountsError: string;
  accountId: string;
  title: string;
  amount: string;
  category: string;
  transactionDate: string;
  type: TransactionType;
  titleSuggestions?: string[];
  onTitleChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onTransactionDateChange: (value: string) => void;
  onAccountIdChange: (value: string) => void;
  onOpenAccounts: () => void;
  onCategoryChange: (value: string) => void;
  onTypeChange: (value: TransactionType) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  t: Translation;
};

export function TransactionForm({
  accounts,
  locale,
  accountsLoading,
  accountsError,
  accountId,
  title,
  amount,
  category,
  transactionDate,
  type,
  titleSuggestions = [],
  onTitleChange,
  onAmountChange,
  onTransactionDateChange,
  onAccountIdChange,
  onOpenAccounts,
  onCategoryChange,
  onTypeChange,
  onSubmit,
  t,
}: TransactionFormProps) {
  const suggestionListId = "transaction-title-suggestions";
  const availableCategories =
    type === "income" ? t.incomeCategories : t.expenseCategories;
  const sortedAccounts = sortAccountsByFavorite(accounts, localeMap[locale]);
  const favoriteAccounts = sortedAccounts.filter(
    (account) => account.is_favorite,
  );
  const otherAccounts = sortedAccounts.filter(
    (account) => !account.is_favorite,
  );

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <h2 className="text-lg font-semibold text-foreground">
        {t.addTransaction}
      </h2>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => onTypeChange("expense")}
          className={`rounded-md py-2 text-sm font-medium transition ${
            type === "expense"
              ? "bg-red-500 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.expense}
        </button>
        <button
          type="button"
          onClick={() => onTypeChange("income")}
          className={`rounded-md py-2 text-sm font-medium transition ${
            type === "income"
              ? "bg-emerald-500 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.income}
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          {t.titleLabel}
        </label>
        <input
          type="text"
          list={titleSuggestions.length > 0 ? suggestionListId : undefined}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={t.titlePlaceholder}
          className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
        />
        {titleSuggestions.length > 0 ? (
          <datalist id={suggestionListId}>
            {titleSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            {t.amountLabel}
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder={t.amountPlaceholder}
            className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            {t.categoryLabel}
          </label>
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
          >
            {availableCategories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          {t.account}
        </label>
        <select
          required
          disabled={accountsLoading || Boolean(accountsError)}
          value={accountId}
          onChange={(event) => onAccountIdChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
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
          <p className="mt-2 text-xs text-muted-foreground">{t.loading}</p>
        ) : accountsError ? (
          <p
            role="alert"
            className="mt-2 text-xs text-red-600 dark:text-red-300"
          >
            {t.accountsLoadError} {accountsError}
          </p>
        ) : accounts.length === 0 ? (
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{t.createAccountFirst}</span>
            <button
              type="button"
              onClick={onOpenAccounts}
              className="shrink-0 font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
            >
              {t.accounts}
            </button>
          </div>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          {t.transactionDate}
        </label>
        <input
          required
          type="date"
          value={transactionDate}
          onChange={(event) => onTransactionDateChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={
          accountsLoading || Boolean(accountsError) || accounts.length === 0
        }
        className="sticky bottom-0 z-10 w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t.saveTransaction}
      </button>
    </form>
  );
}
