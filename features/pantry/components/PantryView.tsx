"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Heart, House, LayoutGrid, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";

import { BottomNav } from "@/components/layout/BottomNav";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { PantryEmptyState } from "@/features/pantry/components/PantryEmptyState";
import { PantryFilters } from "@/features/pantry/components/PantryFilters";
import { PantryPageHeader } from "@/features/pantry/components/PantryPageHeader";
import { PantryProductCard } from "@/features/pantry/components/PantryProductCard";
import { PantryProductForm } from "@/features/pantry/components/PantryProductForm";
import { RecipeView } from "@/features/pantry/components/RecipeView";
import { PantryStats } from "@/features/pantry/components/PantryStats";
import { productColumns } from "@/features/pantry/constants";
import { pantryTranslations } from "@/features/pantry/i18n";
import type {
  PantryProduct,
  ProductFormValues,
  StatusFilter,
} from "@/features/pantry/types";
import {
  compressProductImage,
  dateDifference,
  getLocalDateString,
} from "@/features/pantry/utils";
import { supabase } from "@/lib/supabase";

function createEmptyForm(locale: "sv" | "en"): ProductFormValues {
  return {
    namn: "",
    kategori: "Pantry",
    kvantitet: "1",
    enhet: locale === "sv" ? "st" : "pcs",
    pris: "",
    kopdatum: getLocalDateString(new Date()),
    sista_forbrukningsdag: "",
    ar_oppnad: false,
    oppnad_datum: "",
    butik: "",
    streckkod: "",
    varumarke: "",
    bild_url: "",
  };
}

function getBarcodeLookupValues(barcode: string): string[] {
  const values = [barcode];

  if (/^\d{13}$/.test(barcode) && barcode.startsWith("0")) {
    values.push(barcode.slice(1));
  } else if (/^\d{12}$/.test(barcode)) {
    values.push(`0${barcode}`);
  }

  return values;
}

type PantryViewProps = {
  userId: string;
  onOpenApps: () => void;
};

export function PantryView({ userId, onOpenApps }: PantryViewProps) {
  const { locale } = useLocale();
  const t = pantryTranslations[locale];
  const numberLocale = locale === "sv" ? "sv-SE" : "en-US";
  const [products, setProducts] = useState<PantryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [operationError, setOperationError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("i_lager");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeSection, setActiveSection] = useState<"inventory" | "recipes">(
    "inventory",
  );
  const [recipeAddRequest, setRecipeAddRequest] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PantryProduct | null>(
    null,
  );
  const [form, setForm] = useState<ProductFormValues>(() =>
    createEmptyForm(locale),
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUpProduct, setIsLookingUpProduct] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] =
    useState<PantryProduct | null>(null);

  useEffect(() => {
    let isCurrent = true;

    const loadProducts = async () => {
      setIsLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("produkter")
        .select(productColumns)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!isCurrent) return;

      if (error) {
        console.error("Failed to load pantry products:", error);
        setLoadError(error.message);
        setProducts([]);
      } else {
        setProducts(data ?? []);
      }

      setIsLoading(false);
    };

    void loadProducts();

    return () => {
      isCurrent = false;
    };
  }, [reloadToken, userId]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(numberLocale);

    return products.filter((product) => {
      if (statusFilter !== "all" && product.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== "all" && product.kategori !== categoryFilter) {
        return false;
      }
      if (favoritesOnly && !product.is_favorite) {
        return false;
      }

      return (
        !normalizedSearch ||
        [
          product.namn,
          product.kategori,
          product.butik,
          product.streckkod,
          product.varumarke,
        ]
          .filter(Boolean)
          .some((value) =>
            value!.toLocaleLowerCase(numberLocale).includes(normalizedSearch),
          )
      );
    });
  }, [
    categoryFilter,
    favoritesOnly,
    numberLocale,
    products,
    search,
    statusFilter,
  ]);

  const inStockProducts = products.filter(
    (product) => product.status === "i_lager",
  );
  const expiringCount = inStockProducts.filter((product) => {
    if (!product.sista_forbrukningsdag) return false;
    const daysUntilExpiry = dateDifference(product.sista_forbrukningsdag);
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  }).length;
  const openedCount = inStockProducts.filter(
    (product) => product.ar_oppnad,
  ).length;
  const favoriteCount = inStockProducts.filter(
    (product) => product.is_favorite,
  ).length;
  const categories = Array.from(
    new Set(
      products
        .filter(
          (product) =>
            statusFilter === "all" || product.status === statusFilter,
        )
        .map((product) => product.kategori)
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort((a, b) => a.localeCompare(b, numberLocale));

  const openNewForm = () => {
    setEditingProduct(null);
    setForm(createEmptyForm(locale));
    setSelectedImage(null);
    setFormError("");
    setLookupError("");
    setScannerOpen(false);
    setOperationError("");
    setIsFormOpen(true);
  };

  const switchAddForm = (type: "product" | "recipe") => {
    if (type === "product") {
      setActiveSection("inventory");
      openNewForm();
      return;
    }

    setIsFormOpen(false);
    setActiveSection("recipes");
    setRecipeAddRequest((current) => current + 1);
  };

  const openEditForm = (product: PantryProduct) => {
    setEditingProduct(product);
    setSelectedImage(null);
    setForm({
      namn: product.namn,
      kategori: product.kategori ?? "Other",
      kvantitet: product.kvantitet == null ? "" : String(product.kvantitet),
      enhet: product.enhet ?? (locale === "sv" ? "st" : "pcs"),
      pris: product.pris == null ? "" : String(product.pris),
      kopdatum: product.kopdatum ?? "",
      sista_forbrukningsdag: product.sista_forbrukningsdag ?? "",
      ar_oppnad: product.ar_oppnad,
      oppnad_datum: product.oppnad_datum ?? "",
      butik: product.butik ?? "",
      streckkod: product.streckkod ?? "",
      varumarke: product.varumarke ?? "",
      bild_url: product.bild_url ?? "",
    });
    setFormError("");
    setLookupError("");
    setScannerOpen(false);
    setOperationError("");
    setIsFormOpen(true);
  };

  const lookupBarcode = async (barcode: string) => {
    const normalizedBarcode = barcode.trim();
    if (!normalizedBarcode) return;

    setLookupError("");
    setFormError("");
    setIsLookingUpProduct(true);
    setForm((current) => ({ ...current, streckkod: normalizedBarcode }));

    try {
      const barcodeLookupValues = getBarcodeLookupValues(normalizedBarcode);
      const { data: catalogProduct, error: catalogError } = await supabase
        .from("produkt_katalog")
        .select("streckkod, namn, brand, image_url, kategori")
        .in("streckkod", barcodeLookupValues)
        .maybeSingle();

      if (catalogError) {
        throw catalogError;
      }

      if (catalogProduct) {
        setForm((current) => ({
          ...current,
          streckkod: catalogProduct.streckkod,
          namn: catalogProduct.namn,
          varumarke: catalogProduct.brand ?? "",
          bild_url: catalogProduct.image_url ?? "",
          kategori: catalogProduct.kategori ?? current.kategori,
        }));
        return;
      }

      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedBarcode)}.json`,
      );
      if (!response.ok) {
        throw new Error(`Open Food Facts returned ${response.status}.`);
      }

      const result = (await response.json()) as {
        status?: number;
        product?: {
          product_name?: string;
          brands?: string;
          image_front_url?: string;
          image_url?: string;
        };
      };

      if (result.status !== 1 || !result.product) {
        setLookupError(t.productNotFound);
        return;
      }

      const productName = result.product.product_name?.trim();
      const brand = result.product.brands?.trim();
      const imageUrl =
        result.product.image_front_url?.trim() ||
        result.product.image_url?.trim();

      setForm((current) => ({
        ...current,
        streckkod: normalizedBarcode,
        namn: productName || current.namn,
        varumarke: brand || current.varumarke,
        bild_url: imageUrl || current.bild_url,
      }));
    } catch (error) {
      console.error("Failed to look up product barcode:", error);
      setLookupError(t.productLookupError);
    } finally {
      setIsLookingUpProduct(false);
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setOperationError("");

    const quantity = Number(form.kvantitet);
    const price = form.pris.trim() ? Number(form.pris) : null;

    if (!form.namn.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      setFormError(t.quantityRequired);
      return;
    }

    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setFormError(t.invalidPrice);
      return;
    }

    setIsSaving(true);

    let imageUrl = form.bild_url.trim() || null;
    if (selectedImage) {
      let uploadImage: Blob;
      try {
        uploadImage = await compressProductImage(selectedImage);
      } catch (error) {
        console.error("Failed to compress pantry product image:", error);
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
        console.error("Failed to upload pantry product image:", error);
        setOperationError(t.imageUploadError);
        setIsSaving(false);
        return;
      }

      imageUrl = supabase.storage
        .from("pantry-product-images")
        .getPublicUrl(imagePath).data.publicUrl;
    }

    const values = {
      namn: form.namn.trim(),
      kategori: form.kategori || null,
      kvantitet: quantity,
      enhet: form.enhet.trim() || null,
      pris: price,
      kopdatum: form.kopdatum || null,
      sista_forbrukningsdag: form.sista_forbrukningsdag || null,
      ar_oppnad: form.ar_oppnad,
      oppnad_datum: form.ar_oppnad
        ? form.oppnad_datum || getLocalDateString(new Date())
        : null,
      butik: form.butik.trim() || null,
      streckkod: form.streckkod.trim() || null,
      varumarke: form.varumarke.trim() || null,
      bild_url: imageUrl,
    };

    if (values.streckkod) {
      const { error } = await supabase.from("produkt_katalog").upsert(
        {
          streckkod: values.streckkod,
          namn: values.namn,
          brand: values.varumarke,
          image_url: values.bild_url,
          kategori: values.kategori,
        },
        { onConflict: "streckkod" },
      );

      if (error) {
        console.error("Failed to save product to catalog:", error);
        setOperationError(t.catalogSaveError);
        setIsSaving(false);
        return;
      }
    }

    if (editingProduct) {
      const { data, error } = await supabase
        .from("produkter")
        .update(values)
        .eq("id", editingProduct.id)
        .eq("user_id", userId)
        .select(productColumns)
        .single();

      if (error) {
        console.error("Failed to update pantry product:", error);
        setOperationError(t.updateError);
        setIsSaving(false);
        return;
      }

      setProducts((current) =>
        current.map((product) =>
          product.id === editingProduct.id ? data : product,
        ),
      );
    } else {
      const { data, error } = await supabase
        .from("produkter")
        .insert({ ...values, user_id: userId })
        .select(productColumns)
        .single();

      if (error) {
        console.error("Failed to add pantry product:", error);
        setOperationError(t.saveError);
        setIsSaving(false);
        return;
      }

      setProducts((current) => [data, ...current]);
    }

    setIsSaving(false);
    setSelectedImage(null);
    setIsFormOpen(false);
  };

  const selectProductImage = (file: File | null) => {
    setFormError("");
    if (file && !file.type.startsWith("image/")) {
      setSelectedImage(null);
      setFormError(t.imageInvalid);
      return;
    }

    setSelectedImage(file);
  };

  const updateProduct = async (
    product: PantryProduct,
    values: Partial<
      Pick<PantryProduct, "status" | "is_favorite" | "kvantitet">
    >,
  ) => {
    setBusyProductId(product.id);
    setOperationError("");

    const { error } = await supabase
      .from("produkter")
      .update(values)
      .eq("id", product.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update pantry product:", error);
      setOperationError(t.updateError);
    } else {
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, ...values } : item,
        ),
      );
    }

    setBusyProductId(null);
  };

  const deleteProduct = async (product: PantryProduct) => {
    setBusyProductId(product.id);
    setOperationError("");
    const { error } = await supabase
      .from("produkter")
      .delete()
      .eq("id", product.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to delete pantry product:", error);
      setOperationError(t.deleteError);
    } else {
      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );
    }

    setBusyProductId(null);
  };

  const confirmDeleteProduct = () => {
    if (!pendingDeleteProduct) return;

    const product = pendingDeleteProduct;
    setPendingDeleteProduct(null);
    void deleteProduct(product);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setFavoritesOnly(false);
  };

  const navItems = [
    {
      id: "inventory",
      label: t.inventory,
      icon: House,
      active: activeSection === "inventory" && !favoritesOnly,
      onClick: () => {
        setActiveSection("inventory");
        setStatusFilter("i_lager");
        setFavoritesOnly(false);
      },
    },
    {
      id: "recipes",
      label: t.recipes,
      icon: BookOpen,
      active: activeSection === "recipes",
      onClick: () => {
        setActiveSection("recipes");
        setFavoritesOnly(false);
      },
    },
    {
      id: "add",
      label: t.addType,
      icon: Plus,
      onClick: () =>
        switchAddForm(activeSection === "recipes" ? "recipe" : "product"),
    },
    {
      id: "favorites",
      label: t.favorites,
      icon: Heart,
      active: activeSection === "inventory" && favoritesOnly,
      onClick: () => {
        setActiveSection("inventory");
        setStatusFilter("i_lager");
        setFavoritesOnly(true);
      },
    },
    {
      id: "apps",
      label: t.apps,
      icon: LayoutGrid,
      onClick: onOpenApps,
    },
  ];

  return (
    <>
      <main className="min-h-[calc(100dvh-4rem)] bg-slate-950 px-4 pb-28 pt-6 text-white sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6 animate-view-in">
          {activeSection === "recipes" ? (
            <RecipeView
              userId={userId}
              addRequest={recipeAddRequest}
              onAddRequestHandled={() => setRecipeAddRequest(0)}
              onSwitchForm={switchAddForm}
            />
          ) : (
            <>
              <PantryPageHeader t={t} />

              {operationError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  {operationError}
                </div>
              ) : null}

              <PantryStats
                t={t}
                totalItems={inStockProducts.length}
                expiring={expiringCount}
                opened={openedCount}
                favorites={favoriteCount}
              />

              <PantryFilters
                t={t}
                locale={locale}
                search={search}
                statusFilter={statusFilter}
                categoryFilter={categoryFilter}
                favoritesOnly={favoritesOnly}
                categories={categories}
                inStockCount={inStockProducts.length}
                onSearchChange={setSearch}
                onStatusChange={setStatusFilter}
                onCategoryChange={setCategoryFilter}
                onFavoritesChange={() =>
                  setFavoritesOnly((current) => !current)
                }
              />

              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-12 text-center text-sm text-slate-400">
                  {t.loading}
                </div>
              ) : loadError ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-8 text-center"
                >
                  <p className="text-sm text-red-200">{t.loadError}</p>
                  <button
                    type="button"
                    onClick={() => setReloadToken((current) => current + 1)}
                    className="mt-3 text-sm font-semibold text-red-100 underline underline-offset-4"
                  >
                    {t.retry}
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <PantryEmptyState
                  t={t}
                  hasProducts={products.length > 0}
                  onClearFilters={resetFilters}
                />
              ) : (
                <section
                  aria-label={t.inStock}
                  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {filteredProducts.map((product) => (
                    <PantryProductCard
                      key={product.id}
                      product={product}
                      t={t}
                      locale={locale}
                      numberLocale={numberLocale}
                      isBusy={busyProductId === product.id}
                      onUpdate={(target, values) => {
                        void updateProduct(target, values);
                      }}
                      onEdit={openEditForm}
                      onDelete={setPendingDeleteProduct}
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <PantryProductForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedImage(null);
        }}
        editingProduct={editingProduct}
        form={form}
        setForm={setForm}
        selectedImage={selectedImage}
        onImageChange={selectProductImage}
        formError={formError}
        operationError={operationError}
        isSaving={isSaving}
        isLookingUpProduct={isLookingUpProduct}
        lookupError={lookupError}
        scannerOpen={scannerOpen}
        t={t}
        locale={locale}
        onSwitchForm={switchAddForm}
        onLookupProduct={() => {
          void lookupBarcode(form.streckkod);
        }}
        onScanBarcode={() => {
          setLookupError("");
          setScannerOpen(true);
        }}
        onScannerClose={() => setScannerOpen(false)}
        onBarcodeDetected={(barcode) => {
          setScannerOpen(false);
          void lookupBarcode(barcode);
        }}
        onScannerError={setLookupError}
        onSubmit={(event) => {
          void saveProduct(event);
        }}
      />

      <AlertDialog.Root
        open={pendingDeleteProduct !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteProduct(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <AlertDialog.Popup className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none transition-[opacity,transform] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <AlertDialog.Title className="text-lg font-semibold">
                {t.deleteItemTitle}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {t.deleteConfirm}
              </AlertDialog.Description>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingDeleteProduct(null)}
                >
                  {t.cancel}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmDeleteProduct}
                >
                  {t.delete}
                </Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <BottomNav items={navItems} />
    </>
  );
}
