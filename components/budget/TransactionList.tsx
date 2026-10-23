import type { Transaction } from "@/types/finance";

type TransactionListProps = {
  transactions: Transaction[];
  onDelete: (id: string) => void;
};

export function TransactionList({
  transactions,
  onDelete,
}: TransactionListProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <h2 className="text-lg font-semibold mb-3">Historik</h2>

      {transactions.length === 0 ? (
        <p className="text-sm text-slate-500">
          Inga transaktioner tillagda ännu.
        </p>
      ) : (
        <ul className="space-y-2">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-800"
            >
              <div>
                <p className="font-medium text-sm">{transaction.title}</p>
                <p className="text-xs text-slate-400">{transaction.category}</p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`font-semibold text-sm ${
                    transaction.type === "income"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {transaction.amount} kr
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(transaction.id)}
                  className="text-slate-500 hover:text-red-400 transition text-sm px-1"
                  title="Radera"
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
