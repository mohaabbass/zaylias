import type { FormEvent, Dispatch, SetStateAction } from "react";
import { ScanLine, X } from "lucide-react";
import Image from "next/image";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { categoryOptions } from "@/features/pantry/constants";
import type { PantryTranslation } from "@/features/pantry/i18n";
import { PantryAddTypeTabs } from "@/features/pantry/components/PantryAddTypeTabs";
import { PantryProductScanner } from "@/features/pantry/components/PantryProductScanner";
import type { PantryProduct, ProductFormValues } from "@/features/pantry/types";
import { getLocalDateString } from "@/features/pantry/utils";

type PantryProductFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: PantryProduct | null;
  form: ProductFormValues;
  setForm: Dispatch<SetStateAction<ProductFormValues>>;
  formError: string;
  operationError: string;
  isSaving: boolean;
  isLookingUpProduct: boolean;
  lookupError: string;
  scannerOpen: boolean;
  t: PantryTranslation;
  locale: "sv" | "en";
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLookupProduct: () => void;
  onScanBarcode: () => void;
  onScannerClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
  onScannerError: (message: string) => void;
  onSwitchForm?: (type: "product" | "recipe") => void;
};

export function PantryProductForm({
  open,
  onOpenChange,
  editingProduct,
  form,
  setForm,
  formError,
  operationError,
  isSaving,
  isLookingUpProduct,
  lookupError,
  scannerOpen,
  t,
  locale,
  onSubmit,
  onLookupProduct,
  onScanBarcode,
  onScannerClose,
  onBarcodeDetected,
  onScannerError,
  onSwitchForm,
}: PantryProductFormProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
    >
      <DrawerContent className="mx-auto h-[calc(100dvh-env(safe-area-inset-top))] max-h-none max-w-xl rounded-t-2xl border border-white/10 bg-slate-950 p-0 text-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-3rem)]">
        <DrawerHeader className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <DrawerTitle className="text-lg font-semibold">
            {editingProduct ? t.editItem : t.newItem}
          </DrawerTitle>
          <DrawerClose
            disabled={isSaving}
            aria-label={t.cancel}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </DrawerClose>
        </DrawerHeader>
        {!editingProduct && onSwitchForm ? (
          <PantryAddTypeTabs
            activeType="product"
            onChange={onSwitchForm}
            t={t}
          />
        ) : null}
        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto px-5 py-5">
          {formError ? (
            <p
              role="alert"
              className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100"
            >
              {formError}
            </p>
          ) : null}
          {operationError ? (
            <p
              role="alert"
              className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {operationError}
            </p>
          ) : null}
          {lookupError ? (
            <p
              role="alert"
              className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100"
            >
              {lookupError}
            </p>
          ) : null}

          <div className="space-y-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-200">{t.barcode}</span>
              <input
                value={form.streckkod}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    streckkod: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none focus:border-emerald-400/60"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onScanBarcode}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/5"
              >
                <ScanLine aria-hidden="true" className="h-4 w-4" />
                {t.scanBarcode}
              </button>
              <button
                type="button"
                onClick={onLookupProduct}
                disabled={!form.streckkod.trim() || isLookingUpProduct}
                className="h-11 rounded-xl bg-emerald-400/10 px-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLookingUpProduct ? t.lookingUpProduct : t.lookupProduct}
              </button>
            </div>
          </div>

          {scannerOpen ? (
            <PantryProductScanner
              onDetected={onBarcodeDetected}
              onError={onScannerError}
              onClose={onScannerClose}
              cameraError={t.cameraError}
              unsupportedError={t.scannerUnsupported}
              cancelLabel={t.cancelScan}
              instruction={t.scanningBarcode}
            />
          ) : null}

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-slate-200">{t.name}</span>
            <input
              required
              autoFocus
              value={form.namn}
              onChange={(event) =>
                setForm((current) => ({ ...current, namn: event.target.value }))
              }
              placeholder={t.namePlaceholder}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-200">{t.category}</span>
              <select
                value={form.kategori}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kategori: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-white outline-none focus:border-emerald-400/60"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option[locale]}
                  </option>
                ))}
                {!categoryOptions.some(
                  (option) => option.value === form.kategori,
                ) ? (
                  <option value={form.kategori}>{form.kategori}</option>
                ) : null}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-200">{t.price}</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.pris}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pris: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 pr-10 text-white outline-none focus:border-emerald-400/60"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  {t.currency}
                </span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-200">{t.quantity}</span>
              <input
                required
                type="number"
                min="0.01"
                step="any"
                value={form.kvantitet}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kvantitet: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none focus:border-emerald-400/60"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-200">{t.unit}</span>
              <select
                value={form.enhet}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    enhet: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-2 text-white outline-none focus:border-emerald-400/60"
              >
                {!t.unitOptions.some((unit) => unit === form.enhet) ? (
                  <option value={form.enhet}>{form.enhet}</option>
                ) : null}
                {t.unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-slate-200">{t.brand}</span>
            <input
              value={form.varumarke}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  varumarke: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none focus:border-emerald-400/60"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-200">
                {t.purchaseDate}
              </span>
              <input
                type="date"
                value={form.kopdatum}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kopdatum: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none focus:border-emerald-400/60"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-200">{t.expiryDate}</span>
              <input
                type="date"
                value={form.sista_forbrukningsdag}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sista_forbrukningsdag: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none focus:border-emerald-400/60"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-slate-200">{t.store}</span>
            <input
              value={form.butik}
              onChange={(event) =>
                setForm((current) => ({ ...current, butik: event.target.value }))
              }
              placeholder={t.storePlaceholder}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
            />
          </label>
          {form.bild_url ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <Image
                unoptimized
                src={form.bild_url}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 rounded-lg bg-white object-contain"
              />
              <span className="text-sm text-slate-300">{form.namn}</span>
            </div>
          ) : null}

          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={form.ar_oppnad}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ar_oppnad: event.target.checked,
                    oppnad_datum: event.target.checked
                      ? current.oppnad_datum || getLocalDateString(new Date())
                      : "",
                  }))
                }
                className="h-4 w-4 accent-emerald-400"
              />
              {t.openedItem}
            </label>
            {form.ar_oppnad ? (
              <label className="mt-3 block space-y-1.5 text-sm">
                <span className="font-medium text-slate-300">{t.openedDate}</span>
                <input
                  type="date"
                  value={form.oppnad_datum}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      oppnad_datum: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none focus:border-emerald-400/60"
                />
              </label>
            ) : null}
          </div>

          <div className="flex gap-3 border-t border-white/10 pt-4">
            <DrawerClose
              disabled={isSaving}
              className="h-11 flex-1 rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              {t.cancel}
            </DrawerClose>
            <button
              type="submit"
              disabled={isSaving}
              className="h-11 flex-1 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving
                ? t.saving
                : editingProduct
                  ? t.saveChanges
                  : t.save}
            </button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
