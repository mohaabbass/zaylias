import type { Translation } from "@/lib/i18n";
import type { TransactionType } from "@/types/finance";

type TransactionFormProps = {
  title: string;
  amount: string;
  category: string;
  type: TransactionType;
  titleSuggestions?: string[];
  onTitleChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTypeChange: (value: TransactionType) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  t: Translation;
};

export function TransactionForm({
  title,
  amount,
  category,
  type,
  titleSuggestions = [],
  onTitleChange,
  onAmountChange,
  onCategoryChange,
  onTypeChange,
  onSubmit,
  t,
}: TransactionFormProps) {
  const suggestionListId = "transaction-title-suggestions";
  const availableCategories =
    type === "income" ? t.incomeCategories : t.expenseCategories;

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

      <button
        type="submit"
        className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500"
      >
        {t.saveTransaction}
      </button>
    </form>
  );
}
