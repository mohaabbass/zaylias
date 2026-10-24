import type { Translation } from "@/lib/i18n";

export type TransactionFilter = "all" | "income" | "expense";

type TransactionListFilterProps = {
  value: TransactionFilter;
  onChange: (value: TransactionFilter) => void;
  locale?: string;
  t: Translation;
};

export function TransactionListFilter({
  value,
  onChange,
  locale = "sv",
  t,
}: TransactionListFilterProps) {
  const options: Array<{ value: TransactionFilter; label: string }> = [
    { value: "all", label: t.all },
    { value: "expense", label: t.expense },
    { value: "income", label: t.income },
  ];

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={[
        "flex items-center rounded-full border border-border bg-muted/60 p-1",
        locale === "ar" ? "mr-auto" : "ml-auto",
      ].join(" ")}
    >
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-2.5 py-1.5 text-[11px] font-medium transition ${
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
