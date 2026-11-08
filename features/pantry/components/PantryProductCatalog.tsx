"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import Image from "next/image";
import { Heart, Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  categoryOptions,
  getCategoryLabel,
} from "@/features/pantry/constants";
import type { PantryTranslation } from "@/features/pantry/i18n";
import type { ProductCatalogEntry } from "@/features/pantry/types";
import { compressProductImage } from "@/features/pantry/utils";
import { supabase } from "@/lib/supabase";

type CatalogFormValues = {
  namn: string;
  brand: string;
  streckkod: string;
  kategori: string;
  image_url: string;
};

const emptyForm: CatalogFormValues = {
  namn: "",
  brand: "",
  streckkod: "",
  kategori: "Other",
  image_url: "",
};

const catalogColumns = "catalog_id, streckkod, namn, brand, image_url, kategori";

type PantryProductCatalogProps = {
  userId: string;
  t: PantryTranslation;
  locale: "sv" | "en";
};

export function PantryProductCatalog({
  userId,
  t,
  locale,
}: PantryProductCatalogProps) {
  const [products, setProducts] = useState<ProductCatalogEntry[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<"catalog" | "favorites" | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [operationError, setOperationError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<ProductCatalogEntry | null>(null);
  const [form, setForm] = useState<CatalogFormValues>(emptyForm);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteProduct, setPendingDeleteProduct] =
    useState<ProductCatalogEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadProducts = async () => {
      const [catalogResult, favoriteResult] = await Promise.all([
        supabase
          .from("produkt_katalog")
          .select(catalogColumns)
          .order("namn", { ascending: true }),
        supabase
          .from("favorit_produkt_katalog")
          .select("catalog_id")
          .eq("user_id", userId),
      ]);

      if (!isCurrent) return;

      if (catalogResult.error) {
        console.error("Failed to load product catalog:", catalogResult.error);
        setLoadError("catalog");
        setProducts([]);
      } else if (favoriteResult.error) {
        console.error(
          "Failed to load product catalog favorites:",
          favoriteResult.error,
        );
        setLoadError("favorites");
        setProducts([]);
      } else {
        setLoadError(null);
        setProducts(catalogResult.data ?? []);
        setFavoriteIds(
          new Set(
            (favoriteResult.data ?? []).map((favorite) => favorite.catalog_id),
          ),
        );
      }

      setIsLoading(false);
    };

    void loadProducts();

    return () => {
      isCurrent = false;
    };
  }, [reloadToken, userId]);

  const filteredProducts = useMemo(() => {
    const numberLocale = locale === "sv" ? "sv-SE" : "en-US";
    const query = search.trim().toLocaleLowerCase(numberLocale);

    return products.filter((product) => {
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "uncategorized"
          ? !product.kategori
          : product.kategori === categoryFilter);
      const matchesFavorite =
        !favoritesOnly || favoriteIds.has(product.catalog_id);
      const matchesSearch =
        !query ||
        [product.namn, product.brand, product.streckkod]
          .filter(Boolean)
          .some((value) =>
            value!.toLocaleLowerCase(numberLocale).includes(query),
          ) ||
        (product.kategori
          ? getCategoryLabel(product.kategori, locale)
              .toLocaleLowerCase(numberLocale)
              .includes(query)
          : false);

      return matchesCategory && matchesFavorite && matchesSearch;
    });
  }, [categoryFilter, favoriteIds, favoritesOnly, locale, products, search]);

  const catalogCategories = useMemo(() => {
    const knownCategories = new Set<string>(
      categoryOptions.map((option) => option.value),
    );
    const additionalCategories = [
      ...new Set(
        products
          .map((product) => product.kategori)
          .filter(
            (category): category is string =>
              category !== null &&
              category !== "" &&
              !knownCategories.has(category),
          ),
      ),
    ].sort((a, b) => a.localeCompare(b, locale));

    return [...categoryOptions, ...additionalCategories.map((value) => ({
      value,
      sv: value,
      en: value,
    }))];
  }, [locale, products]);

  const openNewForm = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setSelectedImage(null);
    setFormError("");
    setOperationError("");
    setIsFormOpen(true);
  };

  const openEditForm = (product: ProductCatalogEntry) => {
    setEditingProduct(product);
    setForm({
      namn: product.namn,
      brand: product.brand ?? "",
      streckkod: product.streckkod ?? "",
      kategori: product.kategori ?? "Other",
      image_url: product.image_url ?? "",
    });
    setSelectedImage(null);
    setFormError("");
    setOperationError("");
    setIsFormOpen(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setOperationError("");

    const name = form.namn.trim();
    if (!name) {
      setFormError(t.catalogNameRequired);
      return;
    }

    setIsSaving(true);
    let imageUrl = form.image_url.trim() || null;

    if (selectedImage) {
      let uploadImage: Blob;
      try {
        uploadImage = await compressProductImage(selectedImage);
      } catch (error) {
        console.error("Failed to compress product catalog image:", error);
        setOperationError(t.imageUploadError);
        setIsSaving(false);
        return;
      }

      const extensionByMimeType: Record<string, string> = {
        "image/avif": "avif",
        "image/gif": "gif",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/svg+xml": "svg",
        "image/webp": "webp",
      };
      const extension = extensionByMimeType[uploadImage.type] ?? "image";
      const imagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

      try {
        const { error } = await supabase.storage
          .from("pantry-product-images")
          .upload(imagePath, uploadImage, {
            contentType: uploadImage.type,
            upsert: false,
          });

        if (error) throw error;
      } catch (error) {
        console.error("Failed to upload product catalog image:", error);
        setOperationError(`${t.imageUploadError} (${error instanceof Error ? error.message : String(error)})`);
        setIsSaving(false);
        return;
      }

      imageUrl = supabase.storage
        .from("pantry-product-images")
        .getPublicUrl(imagePath).data.publicUrl;
    }

    const values = {
      namn: name,
      brand: form.brand.trim() || null,
      streckkod: form.streckkod.trim() || null,
      kategori: form.kategori || null,
      image_url: imageUrl,
    };
    const result = editingProduct
      ? await supabase
          .from("produkt_katalog")
          .update(values)
          .eq("catalog_id", editingProduct.catalog_id)
          .select(catalogColumns)
          .single()
      : await supabase
          .from("produkt_katalog")
          .insert(values)
          .select(catalogColumns)
          .single();

    if (result.error) {
      console.error("Failed to save product catalog entry:", result.error);
      setOperationError(`${t.catalogSaveError} (${result.error.message})`);
      setIsSaving(false);
      return;
    }

    setProducts((current) =>
      [
        ...current.filter(
          (product) => product.catalog_id !== result.data.catalog_id,
        ),
        result.data,
      ].sort((a, b) => a.namn.localeCompare(b.namn)),
    );
    setSelectedImage(null);
    setIsFormOpen(false);
    setIsSaving(false);
  };

  const selectCatalogImage = (file: File | null) => {
    setFormError("");
    if (file && !file.type.startsWith("image/")) {
      setSelectedImage(null);
      setFormError(t.imageInvalid);
      return;
    }

    setSelectedImage(file);
  };

  const confirmDeleteProduct = async () => {
    if (!pendingDeleteProduct) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from("produkt_katalog")
      .delete()
      .eq("catalog_id", pendingDeleteProduct.catalog_id);

    if (error) {
      console.error("Failed to delete product catalog entry:", error);
      setOperationError(`${t.catalogDeleteError} (${error.message})`);
      setIsDeleting(false);
      return;
    }

    setProducts((current) =>
      current.filter(
        (product) => product.catalog_id !== pendingDeleteProduct.catalog_id,
      ),
    );
    setFavoriteIds((current) => {
      const next = new Set(current);
      next.delete(pendingDeleteProduct.catalog_id);
      return next;
    });
    setPendingDeleteProduct(null);
    setIsDeleting(false);
  };

  const toggleFavorite = async (product: ProductCatalogEntry) => {
    const isFavorite = favoriteIds.has(product.catalog_id);
    setIsUpdatingFavorite(true);
    setOperationError("");

    const result = isFavorite
      ? await supabase
          .from("favorit_produkt_katalog")
          .delete()
          .eq("user_id", userId)
          .eq("catalog_id", product.catalog_id)
      : await supabase
          .from("favorit_produkt_katalog")
          .insert({ user_id: userId, catalog_id: product.catalog_id });

    if (result.error) {
      console.error("Failed to update product catalog favorite:", result.error);
      setOperationError(t.catalogFavoriteError);
    } else {
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (isFavorite) {
          next.delete(product.catalog_id);
        } else {
          next.add(product.catalog_id);
        }
        return next;
      });
    }

    setIsUpdatingFavorite(false);
  };

  return (
    <>
      <section className="space-y-5" aria-labelledby="product-catalog-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1
              id="product-catalog-heading"
              className="text-2xl font-semibold text-foreground"
            >
              {t.productCatalog}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.productCatalogDescription}
            </p>
          </div>
          <Button
            type="button"
            onClick={openNewForm}
            className="h-10 w-full rounded-xl sm:w-auto"
          >
            <Plus aria-hidden="true" />
            {t.addCatalogProduct}
          </Button>
        </div>

        {operationError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {operationError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-card/50 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.38fr)]">
            <label className="relative block">
              <span className="sr-only">{t.searchCatalog}</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.searchCatalog}
                className="h-11 rounded-xl bg-background pl-9"
              />
            </label>
            <label className="block">
              <span className="sr-only">{t.category}</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="all">{t.all}</option>
                {catalogCategories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option[locale]}
                  </option>
                ))}
                {products.some((product) => !product.kategori) ? (
                  <option value="uncategorized">{t.uncategorized}</option>
                ) : null}
              </select>
            </label>
          </div>
          <div className="mt-3 flex justify-start border-t border-border pt-3 sm:justify-end">
            <button
              type="button"
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly((current) => !current)}
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                favoritesOnly
                  ? "border-rose-300/30 bg-rose-300/15 text-rose-200"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Heart
                aria-hidden="true"
                className="h-4 w-4"
                fill={favoritesOnly ? "currentColor" : "none"}
              />
              {favoritesOnly ? t.catalogAllProducts : t.catalogFavorites}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-border bg-muted px-5 py-12 text-center text-sm text-muted-foreground">
            {t.catalogLoading}
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-8 text-center"
          >
            <p className="text-sm text-red-200">
              {loadError === "catalog"
                ? t.catalogLoadError
                : t.catalogFavoriteLoadError}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setLoadError(null);
                setReloadToken((current) => current + 1);
              }}
              className="mt-3 text-sm font-semibold text-red-100 underline underline-offset-4"
            >
              {t.retry}
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted px-5 py-12 text-center">
            <Package
              aria-hidden="true"
              className="mx-auto h-8 w-8 text-muted-foreground"
            />
            <p className="mt-3 text-sm font-medium text-foreground">
              {search.trim() || categoryFilter !== "all"
                ? t.catalogNoResults
                : favoritesOnly
                  ? t.catalogNoFavorites
                  : t.catalogEmpty}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <article
                key={product.catalog_id}
                className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-3 rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {product.image_url ? (
                    <Image
                      unoptimized
                      fill
                      sizes="64px"
                      src={product.image_url}
                      alt={product.namn}
                      className="object-cover"
                    />
                  ) : (
                    <Package
                      aria-hidden="true"
                      className="m-auto h-6 w-6 text-muted-foreground"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 truncate font-semibold">
                      {product.namn}
                    </h2>
                    <button
                      type="button"
                      aria-label={`${favoriteIds.has(product.catalog_id) ? t.unfavorite : t.favorite} ${product.namn}`}
                      aria-pressed={favoriteIds.has(product.catalog_id)}
                      disabled={isUpdatingFavorite}
                      onClick={() => void toggleFavorite(product)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-50"
                    >
                      <Heart
                        aria-hidden="true"
                        className={`h-4 w-4 ${
                          favoriteIds.has(product.catalog_id)
                            ? "fill-current"
                            : ""
                        }`}
                      />
                    </button>
                  </div>
                  {product.kategori ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {getCategoryLabel(product.kategori, locale)}
                    </p>
                  ) : null}
                  {product.streckkod ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {t.barcode}: {product.streckkod}
                    </p>
                  ) : null}
                </div>
                <div className="col-span-2 flex justify-end gap-2 border-t border-border pt-2">
                  <button
                    type="button"
                    disabled={isSaving || isDeleting}
                    onClick={() => openEditForm(product)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                    {t.edit}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || isDeleting}
                    onClick={() => {
                      setOperationError("");
                      setPendingDeleteProduct(product);
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    {t.delete}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog.Root
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open && isSaving) return;
          setIsFormOpen(open);
          if (!open) setEditingProduct(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <Dialog.Popup className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl outline-none sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <Dialog.Title className="text-lg font-semibold">
                  {editingProduct ? t.editCatalogProduct : t.newCatalogProduct}
                </Dialog.Title>
                <button
                  type="button"
                  aria-label={t.cancel}
                  disabled={isSaving}
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <form
                className="space-y-4"
                onSubmit={(event) => void saveProduct(event)}
              >
                <label className="block space-y-1.5 text-sm font-medium">
                  <span>{t.name}</span>
                  <Input
                    required
                    autoFocus
                    value={form.namn}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        namn: event.target.value,
                      }))
                    }
                    placeholder={t.namePlaceholder}
                  />
                </label>

                <label className="block space-y-1.5 text-sm font-medium">
                  <span>{t.brand}</span>
                  <Input
                    value={form.brand}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        brand: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block space-y-1.5 text-sm font-medium">
                  <span>{t.barcode}</span>
                  <Input
                    value={form.streckkod}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        streckkod: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block space-y-1.5 text-sm font-medium">
                  <span>{t.category}</span>
                  <select
                    value={form.kategori}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        kategori: event.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option[locale]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5 text-sm font-medium">
                  <span>{t.productImageUrl}</span>
                  <Input
                    type="url"
                    value={form.image_url}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        image_url: event.target.value,
                      }))
                    }
                    placeholder="https://"
                  />
                </label>

                <label className="block space-y-1.5 text-sm font-medium">
                  <span>{t.replaceCatalogImage}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isSaving}
                    onChange={(event) => {
                      selectCatalogImage(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400/10 file:px-3 file:py-2 file:font-medium file:text-emerald-200 hover:file:bg-emerald-400/20"
                  />
                  {selectedImage ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {t.selectedImage}: {selectedImage.name}
                    </span>
                  ) : null}
                </label>

                {selectedImage || form.image_url ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted p-3">
                    {selectedImage ? (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-background">
                        <Package
                          aria-hidden="true"
                          className="h-7 w-7 text-muted-foreground"
                        />
                      </span>
                    ) : (
                      <Image
                        unoptimized
                        src={form.image_url}
                        alt=""
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-lg bg-white object-contain"
                      />
                    )}
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {selectedImage ? selectedImage.name : form.namn}
                    </span>
                  </div>
                ) : null}

                {formError ? (
                  <p role="alert" className="text-sm text-red-500">
                    {formError}
                  </p>
                ) : null}
                {operationError ? (
                  <p role="alert" className="text-sm text-red-500">
                    {operationError}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => setIsFormOpen(false)}
                  >
                    {t.cancel}
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? t.saving : t.saveCatalogProduct}
                  </Button>
                </div>
              </form>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog.Root
        open={pendingDeleteProduct !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDeleteProduct(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <AlertDialog.Popup className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none">
              <AlertDialog.Title className="text-lg font-semibold">
                {t.catalogDeleteTitle}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {t.catalogDeleteConfirm}
              </AlertDialog.Description>
              {operationError ? (
                <p role="alert" className="mt-3 text-sm text-red-500">
                  {operationError}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => setPendingDeleteProduct(null)}
                >
                  {t.cancel}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={() => void confirmDeleteProduct()}
                >
                  {isDeleting ? t.saving : t.delete}
                </Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
