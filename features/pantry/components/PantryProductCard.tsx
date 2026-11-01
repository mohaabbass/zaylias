import {
  Apple,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Heart,
  Milk,
  Package,
  Pencil,
  Snowflake,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { PantryTranslation } from "@/features/pantry/i18n";
import type { PantryProduct } from "@/features/pantry/types";
import { dateDifference, formatDate } from "@/features/pantry/utils";

type PantryProductCardProps = {
  product: PantryProduct;
  t: PantryTranslation;
  numberLocale: string;
  isBusy: boolean;
  onUpdate: (
    product: PantryProduct,
    values: Partial<Pick<PantryProduct, "status" | "is_favorite">>,
  ) => void;
  onEdit: (product: PantryProduct) => void;
  onDelete: (product: PantryProduct) => void;
};

function CategoryIcon({ category }: { category: string | null }) {
  const value = category?.toLowerCase();
  const Icon: LucideIcon =
    value === "dairy"
      ? Milk
      : value === "produce"
        ? Apple
        : value === "freezer"
          ? Snowflake
          : Package;

  return <Icon aria-hidden="true" className="h-5 w-5" />;
}

export function PantryProductCard({
  product,
  t,
  numberLocale,
  isBusy,
  onUpdate,
  onEdit,
  onDelete,
}: PantryProductCardProps) {
  const expiryDays = product.sista_forbrukningsdag
    ? dateDifference(product.sista_forbrukningsdag)
    : null;
  const expiryLabel =
    expiryDays === null
      ? null
      : expiryDays < 0
        ? t.expired
        : expiryDays === 0
          ? t.expiresToday
          : expiryDays <= 7
            ? t.expiresIn(expiryDays)
            : formatDate(product.sista_forbrukningsdag!, numberLocale);
  const needsAttention =
    expiryDays !== null &&
    expiryDays <= 7 &&
    product.status === "i_lager";
  const isExpired =
    expiryDays !== null && expiryDays < 0 && product.status === "i_lager";
  const statusLabel =
    product.status === "i_lager"
      ? t.statusInStock
      : product.status === "konsumerad"
        ? t.statusConsumed
        : t.statusDiscarded;

  return (
    <article className="flex min-h-52 flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-white/20">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200">
          <CategoryIcon category={product.kategori} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{product.namn}</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {product.kategori ?? t.category}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onUpdate(product, { is_favorite: !product.is_favorite })
          }
          disabled={isBusy}
          aria-label={product.is_favorite ? t.unfavorite : t.favorite}
          aria-pressed={product.is_favorite}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-rose-300 disabled:opacity-50"
        >
          <Heart
            aria-hidden="true"
            className={`h-4 w-4 ${
              product.is_favorite ? "fill-rose-400 text-rose-400" : ""
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-xl font-semibold text-white">
          {product.kvantitet ?? "—"}
          <span className="ml-1.5 text-sm font-normal text-slate-400">
            {product.enhet}
          </span>
        </p>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-medium ${
            product.status === "i_lager"
              ? "bg-emerald-300/10 text-emerald-200"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 min-h-10 space-y-1 text-xs text-slate-400">
        {expiryLabel ? (
          <p
            className={`flex items-center gap-1.5 ${
              isExpired
                ? "text-red-300"
                : needsAttention
                  ? "text-amber-200"
                  : ""
            }`}
          >
            {needsAttention ? (
              <CircleAlert aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <CalendarDays
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0"
              />
            )}
            {expiryLabel}
          </p>
        ) : null}
        {product.ar_oppnad ? (
          <p className="flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {t.openedLabel}
            {product.oppnad_datum
              ? ` · ${formatDate(product.oppnad_datum, numberLocale)}`
              : ""}
          </p>
        ) : null}
        {product.butik ? (
          <p className="truncate">{t.boughtAt(product.butik)}</p>
        ) : null}
        {product.pris != null ? (
          <p>
            {new Intl.NumberFormat(numberLocale, {
              maximumFractionDigits: 2,
            }).format(Number(product.pris))}{" "}
            {t.currency}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
        <div className="flex items-center gap-1">
          {product.status === "i_lager" ? (
            <>
              <button
                type="button"
                onClick={() => onUpdate(product, { status: "konsumerad" })}
                disabled={isBusy}
                aria-label={t.markConsumed}
                title={t.markConsumed}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-300/10 hover:text-emerald-200 disabled:opacity-50"
              >
                <Check aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onUpdate(product, { status: "kastad" })}
                disabled={isBusy}
                aria-label={t.markDiscarded}
                title={t.markDiscarded}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-300/10 hover:text-amber-200 disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onUpdate(product, { status: "i_lager" })}
              disabled={isBusy}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/10 disabled:opacity-50"
            >
              {t.returnToStock}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(product)}
            aria-label={t.edit}
            title={t.edit}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(product)}
            disabled={isBusy}
            aria-label={t.delete}
            title={t.delete}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
