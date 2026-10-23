import type { Translation } from "@/lib/i18n";

type BalanceCardProps = {
  totalBalance: number;
  t: Translation;
};

export function BalanceCard({ totalBalance, t }: BalanceCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <p className="text-sm text-slate-400 font-medium">{t.totalBalance}</p>
      <p
        className={`text-3xl font-bold mt-1 ${
          totalBalance < 0 ? "text-red-400" : "text-emerald-400"
        }`}
      >
        {totalBalance.toFixed(2)} {t.currency}
      </p>
    </div>
  );
}
