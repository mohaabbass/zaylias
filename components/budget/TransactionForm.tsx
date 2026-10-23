import type { Translation } from "@/lib/i18n";
import type { TransactionType } from "@/types/finance";

type TransactionFormProps = {
  title: string;
  amount: string;
  category: string;
  type: TransactionType;
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
  onTitleChange,
  onAmountChange,
  onCategoryChange,
  onTypeChange,
  onSubmit,
  t,
}: TransactionFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
    >
      <h2 className="text-lg font-semibold">{t.addTransaction}</h2>

      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg">
        <button
          type="button"
          onClick={() => onTypeChange("expense")}
          className={`py-2 text-sm font-medium rounded-md transition ${
            type === "expense"
              ? "bg-red-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {t.expense}
        </button>
        <button
          type="button"
          onClick={() => onTypeChange("income")}
          className={`py-2 text-sm font-medium rounded-md transition ${
            type === "income"
              ? "bg-emerald-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {t.income}
        </button>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">
          {t.titleLabel}
        </label>
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={t.titlePlaceholder}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            {t.amountLabel}
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder={t.amountPlaceholder}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            {t.categoryLabel}
          </label>
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500"
          >
            {t.categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition"
      >
        {t.saveTransaction}
      </button>
    </form>
  );
}
