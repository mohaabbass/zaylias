import {
  Apple,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  CircleMinus,
  Clock3,
  Heart,
  Milk,
  Minus,
  Package,
  Plus,
  Pencil,
  Snowflake,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import type { PantryTranslation } from "@/features/pantry/i18n";
import type { PantryProduct } from "@/features/pantry/types";
import { dateDifference, formatDate } from "@/features/pantry/utils";
import { getCategoryLabel } from "@/features/pantry/constants";
import type { Locale } from "@/lib/i18n";

type PantryProductCardProps = {
  product: PantryProduct;
  t: PantryTranslation;
  locale: Locale;
  numberLocale: string;
  isBusy: boolean;
  onUpdate: (
    product: PantryProduct,
    values: Partial<
      Pick<
        PantryProduct,
        "status" | "is_favorite" | "kvantitet" | "remaining_percent"
      >
    >,
  ) => void;
  onEdit: (product: PantryProduct) => void;
  onDelete: (product: PantryProduct) => void;
  onDiscard: (product: PantryProduct) => void;
  onConsume: (product: PantryProduct) => void;
  onViewImage: (product: PantryProduct) => void;
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
  locale,
  numberLocale,
  isBusy,
  onUpdate,
  onEdit,
  onDelete,
  onDiscard,
  onConsume,
  onViewImage,
}: PantryProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
    expiryDays !== null && expiryDays <= 7 && product.status === "i_lager";
  const isExpired =
    expiryDays !== null && expiryDays < 0 && product.status === "i_lager";
  const statusLabel =
    product.status === "i_lager"
      ? t.statusInStock
      : product.status === "konsumerad"
        ? t.statusConsumed
        : t.statusDiscarded;
  const detailsId = `product-details-${product.id}`;
  const quantity = Number(product.kvantitet ?? 0);
  const hasValidQuantity = Number.isFinite(quantity) && quantity >= 0;
  const displayedQuantity = hasValidQuantity
    ? new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 2 }).format(
        quantity,
      )
    : "—";
  const storedRemaining = Number(product.remaining_percent ?? 100);
  const remainingPercent = Number.isFinite(storedRemaining)
    ? Math.max(0, Math.min(100, storedRemaining))
    : 100;
  const adjustQuantity = (change: number) => {
    const nextQuantity = Math.max(
      0,
      (hasValidQuantity ? quantity : 0) + change,
    );
    const values: Partial<
      Pick<
        PantryProduct,
        "status" | "is_favorite" | "kvantitet" | "remaining_percent"
      >
    > = { kvantitet: nextQuantity };

    if (change < 0 && nextQuantity === 0) {
      values.status = "konsumerad";
    }

    onUpdate(product, values);
  };
  const adjustRemaining = (change: number) => {
    const nextRemaining = Math.max(
      0,
      Math.min(100, remainingPercent + change),
    );
    if (change < 0 && nextRemaining === 0) {
      onConsume(product);
      return;
    }

    onUpdate(product, {
      remaining_percent: nextRemaining,
    });
  };

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-4 transition hover:border-border">
      <div className="flex items-start gap-3">
        {product.bild_url ? (
          <button
            type="button"
            aria-label={`${t.viewProductImage}: ${product.namn}`}
            onClick={() => onViewImage(product)}
            className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <Image
              unoptimized
              src={product.bild_url}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-xl bg-white object-contain"
            />
          </button>
        ) : null}
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          onClick={() => setIsExpanded((current) => !current)}
          className="group flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left"
        >
          {!product.bild_url ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200">
              <CategoryIcon category={product.kategori} />
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-foreground">
              {product.namn}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {product.varumarke ||
                (product.kategori
                  ? getCategoryLabel(product.kategori, locale)
                  : t.category)}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() =>
            onUpdate(product, { is_favorite: !product.is_favorite })
          }
          disabled={isBusy}
          aria-label={product.is_favorite ? t.unfavorite : t.favorite}
          aria-pressed={product.is_favorite}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-rose-300 disabled:opacity-50"
        >
          <Heart
            aria-hidden="true"
            className={`h-4 w-4 ${
              product.is_favorite ? "fill-rose-400 text-rose-400" : ""
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {product.status === "i_lager" ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted p-1">
              <button
                type="button"
                onClick={() => adjustQuantity(-1)}
                disabled={isBusy || !hasValidQuantity || quantity <= 0}
                aria-label={t.decreaseQuantity}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus aria-hidden="true" className="h-4 w-4" />
              </button>
              <p className="min-w-10 text-center text-lg font-semibold text-foreground">
                {displayedQuantity}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {product.enhet}
                </span>
              </p>
              <button
                type="button"
                onClick={() => adjustQuantity(1)}
                disabled={isBusy}
                aria-label={t.increaseQuantity}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="text-xl font-semibold text-foreground">
              {displayedQuantity}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                {product.enhet}
              </span>
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-medium ${
            product.status === "i_lager"
              ? "bg-emerald-300/10 text-emerald-200"
              : "bg-slate-700 text-muted-foreground"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div id={detailsId} hidden={!isExpanded}>
        <div className="mt-3 min-h-10 space-y-1 text-xs text-muted-foreground">
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
                <CircleAlert
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0"
                />
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
          {product.status === "i_lager" ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustRemaining(-10)}
                disabled={isBusy || remainingPercent <= 0}
                aria-label={t.decreaseRemaining}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus aria-hidden="true" className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>{t.remainingAmount}</span>
                  <span>{remainingPercent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={t.remainingAmount}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={remainingPercent}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      remainingPercent <= 20
                        ? "bg-rose-400"
                        : remainingPercent <= 50
                          ? "bg-amber-300"
                          : "bg-emerald-300"
                    }`}
                    style={{ width: `${remainingPercent}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => adjustRemaining(10)}
                disabled={isBusy || remainingPercent >= 100}
                aria-label={t.increaseRemaining}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
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

        <div className="mt-3 border-t border-border pt-3">
          <div className="grid grid-cols-3 gap-2">
          {product.status === "i_lager" ? (
            <button
              type="button"
              onClick={() => onDiscard(product)}
              disabled={isBusy}
              aria-label={t.markDiscarded}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-amber-300/20 bg-amber-300/[0.04] px-2 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-300/10 disabled:opacity-50"
            >
              <CircleMinus aria-hidden="true" className="h-4 w-4" />
              {t.discardAction}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onUpdate(product, { status: "i_lager" })}
              disabled={isBusy}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] px-2 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-300/10 disabled:opacity-50"
            >
              {t.returnToStock}
            </button>
          )}
            <button
              type="button"
              onClick={() => onEdit(product)}
              disabled={isBusy}
              aria-label={t.edit}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              {t.edit}
            </button>
            <button
              type="button"
              onClick={() => onDelete(product)}
              disabled={isBusy}
              aria-label={t.delete}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-xs text-rose-300 transition hover:bg-red-400/10 disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {t.delete}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
