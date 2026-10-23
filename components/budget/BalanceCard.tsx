type BalanceCardProps = {
  totalBalance: number;
};

export function BalanceCard({ totalBalance }: BalanceCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <p className="text-sm text-slate-400 font-medium">Total balans</p>
      <p
        className={`text-3xl font-bold mt-1 ${
          totalBalance < 0 ? "text-red-400" : "text-emerald-400"
        }`}
      >
        {totalBalance.toFixed(2)} kr
      </p>
    </div>
  );
}
