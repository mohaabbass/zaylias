import { useState } from "react";
import type { FormEvent, Dispatch, SetStateAction, KeyboardEvent } from "react";
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
import type {
  PantryProduct,
  ProductCatalogEntry,
  ProductFormValues,
} from "@/features/pantry/types";
import { getLocalDateString } from "@/features/pantry/utils";

type PantryProductFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: PantryProduct | null;
  form: ProductFormValues;
  setForm: Dispatch<SetStateAction<ProductFormValues>>;
  selectedImage: File | null;
  onImageChange: (file: File | null) => void;
  formError: string;
  operationError: string;
  isSaving: boolean;
  isLookingUpProduct: boolean;
  lookupError: string;
  catalogProducts: ProductCatalogEntry[];
  isSearchingCatalog: boolean;
  catalogSearchError: string;
  scannerOpen: boolean;
  t: PantryTranslation;
  locale: "sv" | "en";
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onProductNameChange: (name: string) => void;
  onLookupProduct: () => void;
  onSelectCatalogProduct: (product: ProductCatalogEntry) => void;
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
  selectedImage,
  onImageChange,
  formError,
  operationError,
  isSaving,
  isLookingUpProduct,
  lookupError,
  catalogProducts,
  isSearchingCatalog,
  catalogSearchError,
  scannerOpen,
  t,
  locale,
  onSubmit,
  onProductNameChange,
  onLookupProduct,
  onSelectCatalogProduct,
  onScanBarcode,
  onScannerClose,
  onBarcodeDetected,
  onScannerError,
  onSwitchForm,
}: PantryProductFormProps) {
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(true);
  const [activeCatalogIndex, setActiveCatalogIndex] = useState(0);
  const isCatalogDropdownVisible =
    isCatalogDropdownOpen &&
    (isSearchingCatalog ||
      catalogProducts.length > 0 ||
      Boolean(catalogSearchError));
  const catalogListboxId = "pantry-product-catalog-options";

  const handleProductNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isCatalogDropdownVisible || catalogProducts.length === 0) {
      if (event.key === "Escape") setIsCatalogDropdownOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCatalogIndex((index) =>
        index >= catalogProducts.length - 1 ? 0 : index + 1,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCatalogIndex((index) =>
        index <= 0 ? catalogProducts.length - 1 : index - 1,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      onSelectCatalogProduct(
        catalogProducts[
          Math.min(activeCatalogIndex, catalogProducts.length - 1)
        ],
      );
      setIsCatalogDropdownOpen(false);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsCatalogDropdownOpen(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
    >
      <DrawerContent className="mx-auto h-[calc(100dvh-env(safe-area-inset-top))] max-h-none max-w-xl rounded-t-2xl border border-border bg-background p-0 text-foreground shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-3rem)]">
        <DrawerHeader className="flex items-center justify-between border-b border-border px-5 py-4">
          <DrawerTitle className="text-lg font-semibold">
            {editingProduct ? t.editItem : t.newItem}
          </DrawerTitle>
          <DrawerClose
            disabled={isSaving}
            aria-label={t.cancel}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
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
        <form
          onSubmit={onSubmit}
          className="space-y-4 overflow-y-auto px-5 py-5"
        >
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
              <span className="font-medium text-muted-foreground">
                {t.barcode}
              </span>
              <div className="relative">
                <input
                  value={form.streckkod}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      streckkod: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-muted px-3 pr-14 text-foreground outline-none focus:border-emerald-400/60"
                />
                <button
                  type="button"
                  onClick={onScanBarcode}
                  aria-label={t.scanBarcode}
                  className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                >
                  <ScanLine aria-hidden="true" className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.scanBarcode}</span>
                </button>
              </div>
            </label>
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

          <div className="relative space-y-1.5 text-sm">
            <label
              htmlFor="pantry-product-name"
              className="block font-medium text-muted-foreground"
            >
              {t.name}
            </label>
            <input
              id="pantry-product-name"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isCatalogDropdownVisible}
              aria-controls={catalogListboxId}
              aria-activedescendant={
                isCatalogDropdownVisible && catalogProducts.length > 0
                  ? `${catalogListboxId}-${catalogProducts[Math.min(activeCatalogIndex, catalogProducts.length - 1)].catalog_id}`
                  : undefined
              }
              required
              autoFocus
              value={form.namn}
              onChange={(event) => {
                setIsCatalogDropdownOpen(true);
                setActiveCatalogIndex(0);
                onProductNameChange(event.target.value);
              }}
              onKeyDown={handleProductNameKeyDown}
              onFocus={() => setIsCatalogDropdownOpen(true)}
              placeholder={t.namePlaceholder}
              className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
            />
            {isCatalogDropdownVisible ? (
              <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  {t.productSuggestions}
                </p>
                {isSearchingCatalog ? (
                  <p
                    role="status"
                    className="px-3 pb-3 text-xs text-muted-foreground"
                  >
                    {t.catalogSearchLoading}
                  </p>
                ) : null}
                {catalogSearchError ? (
                  <p role="alert" className="px-3 pb-3 text-xs text-amber-200">
                    {catalogSearchError}
                  </p>
                ) : null}
                {catalogProducts.length > 0 ? (
                  <ul
                    id={catalogListboxId}
                    role="listbox"
                    aria-label={t.productSuggestions}
                    className="max-h-56 overflow-y-auto border-t border-border py-1"
                  >
                    {catalogProducts.map((product, index) => (
                      <li
                        key={product.catalog_id}
                        id={`${catalogListboxId}-${product.catalog_id}`}
                        role="option"
                        aria-selected={index === activeCatalogIndex}
                        onMouseEnter={() => setActiveCatalogIndex(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          onSelectCatalogProduct(product);
                          setIsCatalogDropdownOpen(false);
                        }}
                        className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 ${
                          index === activeCatalogIndex
                            ? "bg-emerald-400/10"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-foreground">
                            {product.namn}
                          </span>
                          {product.brand || product.kategori ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {[product.brand, product.kategori]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-xs font-medium text-emerald-200">
                          {t.select}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted-foreground">
                {t.category}
              </span>
              <select
                value={form.kategori}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kategori: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-foreground outline-none focus:border-emerald-400/60"
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
              <span className="font-medium text-muted-foreground">
                {t.price}
              </span>
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
                  className="h-11 w-full rounded-xl border border-border bg-muted px-3 pr-10 text-foreground outline-none focus:border-emerald-400/60"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {t.currency}
                </span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted-foreground">
                {t.quantity}
              </span>
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
                className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none focus:border-emerald-400/60"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted-foreground">
                {t.unit}
              </span>
              <select
                value={form.enhet}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    enhet: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-border bg-card px-2 text-foreground outline-none focus:border-emerald-400/60"
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
            <span className="font-medium text-muted-foreground">{t.brand}</span>
            <input
              value={form.varumarke}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  varumarke: event.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none focus:border-emerald-400/60"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted-foreground">
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
                className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none focus:border-emerald-400/60"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted-foreground">
                {t.expiryDate}
              </span>
              <input
                type="date"
                value={form.sista_forbrukningsdag}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sista_forbrukningsdag: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none focus:border-emerald-400/60"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted-foreground">{t.store}</span>
            <input
              value={form.butik}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  butik: event.target.value,
                }))
              }
              placeholder={t.storePlaceholder}
              className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted-foreground">
              {t.productImage}
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={isSaving}
              onChange={(event) => {
                onImageChange(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400/10 file:px-3 file:py-2 file:font-medium file:text-emerald-200 hover:file:bg-emerald-400/20"
            />
            {selectedImage ? (
              <span className="block truncate text-xs text-muted-foreground">
                {selectedImage.name}
              </span>
            ) : null}
          </label>
          {form.bild_url ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted p-3">
              <Image
                unoptimized
                src={form.bild_url}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 rounded-lg bg-white object-contain"
              />
              <span className="text-sm text-muted-foreground">{form.namn}</span>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-muted p-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
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
                <span className="font-medium text-muted-foreground">
                  {t.openedDate}
                </span>
                <input
                  type="date"
                  value={form.oppnad_datum}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      oppnad_datum: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none focus:border-emerald-400/60"
                />
              </label>
            ) : null}
          </div>

          <div className="flex gap-3 border-t border-border pt-4">
            <DrawerClose
              disabled={isSaving}
              className="h-11 flex-1 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
            >
              {t.cancel}
            </DrawerClose>
            <button
              type="submit"
              disabled={isSaving}
              className="h-11 flex-1 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? t.saving : editingProduct ? t.saveChanges : t.save}
            </button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
