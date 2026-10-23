import type { Translation } from "@/lib/i18n";
import type { Transaction } from "@/types/finance";

type TransactionListProps = {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  t: Translation;
};

export function TransactionList({
  transactions,
  onDelete,
  t,
}: TransactionListProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        {t.history}
      </h2>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.emptyHistory}</p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/60 p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {transaction.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transaction.category}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-semibold ${
                    transaction.type === "income"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {transaction.amount} {t.currency}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(transaction.id)}
                  className="px-1 text-sm text-muted-foreground transition hover:text-red-500"
                  title={t.deleteTitle}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
