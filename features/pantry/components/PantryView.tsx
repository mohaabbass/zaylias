"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  House,
  Menu,
  Package,
  Plus,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import Image from "next/image";

import { BottomNav } from "@/components/layout/BottomNav";
import { useLocale } from "@/components/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { PantryEmptyState } from "@/features/pantry/components/PantryEmptyState";
import { PantryCategories } from "@/features/pantry/components/PantryCategories";
import { PantryFilters } from "@/features/pantry/components/PantryFilters";
import { PantryPageHeader } from "@/features/pantry/components/PantryPageHeader";
import { PantryProductCard } from "@/features/pantry/components/PantryProductCard";
import { PantryProductForm } from "@/features/pantry/components/PantryProductForm";
import { PantryProductCatalog } from "@/features/pantry/components/PantryProductCatalog";
import { RecipeCarousel } from "@/features/pantry/components/RecipeCarousel";
import { RecipeView } from "@/features/pantry/components/RecipeView";
import { PantryStats } from "@/features/pantry/components/PantryStats";
import { PantrySettingsDrawer } from "@/features/pantry/components/PantrySettingsDrawer";
import { ListsView } from "@/features/pantry/components/ListsView";
import { productColumns } from "@/features/pantry/constants";
import { pantryTranslations } from "@/features/pantry/i18n";
import type {
  PantryProduct,
  ProductCatalogEntry,
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
    kategori: "Other",
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

type PantryViewProps = {
  userId: string;
  onLogout: () => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
};

export function PantryView({
  userId,
  onLogout,
  theme,
  onThemeChange,
}: PantryViewProps) {
  const { locale, t: sharedT } = useLocale();
  const t = pantryTranslations[locale];
  const numberLocale = locale === "sv" ? "sv-SE" : "en-US";
  const [products, setProducts] = useState<PantryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [recipeCount, setRecipeCount] = useState<number | null>(null);
  const [isRecipeCountLoading, setIsRecipeCountLoading] = useState(true);
  const [recipeCountError, setRecipeCountError] = useState(false);
  const [recipeCountReloadToken, setRecipeCountReloadToken] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [operationError, setOperationError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("i_lager");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [belowHalfOnly, setBelowHalfOnly] = useState(false);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "home" | "products" | "recipes" | "catalog" | "lists"
  >("home");
  const [recipeAddRequest, setRecipeAddRequest] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PantryProduct | null>(
    null,
  );
  const [form, setForm] = useState<ProductFormValues>(() =>
    createEmptyForm(locale),
  );
  const [catalogSearch, setCatalogSearch] = useState<{
    query: string;
    products: ProductCatalogEntry[];
    isLoading: boolean;
    error: string;
  }>({ query: "", products: [], isLoading: false, error: "" });
  const [selectedCatalogName, setSelectedCatalogName] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUpProduct, setIsLookingUpProduct] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] =
    useState<PantryProduct | null>(null);
  const [pendingDiscardProduct, setPendingDiscardProduct] =
    useState<PantryProduct | null>(null);
  const [pendingConsumedProduct, setPendingConsumedProduct] =
    useState<PantryProduct | null>(null);
  const [imagePreview, setImagePreview] = useState<{
    name: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    const query = form.namn.trim();
    if (
      !isFormOpen ||
      editingProduct ||
      query.length < 2 ||
      selectedCatalogName === query
    ) {
      return;
    }

    let isCurrent = true;
    const timeout = window.setTimeout(() => {
      const searchCatalog = async () => {
        setCatalogSearch({
          query,
          products: [],
          isLoading: true,
          error: "",
        });

        const { data, error } = await supabase
          .from("produkt_katalog")
          .select("catalog_id, streckkod, namn, brand, image_url, kategori")
          .ilike("namn", `%${query}%`)
          .order("namn")
          .limit(8);

        if (!isCurrent) return;

        if (error) {
          console.error("Failed to search product catalog:", error);
          setCatalogSearch({
            query,
            products: [],
            isLoading: false,
            error: t.catalogSearchError,
          });
        } else {
          setCatalogSearch({
            query,
            products: data ?? [],
            isLoading: false,
            error: "",
          });
        }
      };

      void searchCatalog();
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [
    editingProduct,
    form.namn,
    isFormOpen,
    selectedCatalogName,
    t.catalogSearchError,
  ]);

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

  useEffect(() => {
    let isCurrent = true;

    const loadRecipeCount = async () => {
      setIsRecipeCountLoading(true);
      setRecipeCountError(false);

      const { count, error } = await supabase
        .from("recept")
        .select("id", { count: "exact", head: true })
        .or(`user_id.is.null,user_id.eq.${userId}`);

      if (!isCurrent) return;

      if (error) {
        console.error("Failed to load recipe count:", error);
        setRecipeCountError(true);
      } else {
        setRecipeCount(count ?? 0);
      }
      setIsRecipeCountLoading(false);
    };

    void loadRecipeCount();

    return () => {
      isCurrent = false;
    };
  }, [recipeCountReloadToken, userId]);

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
      if (
        expiringOnly
      ) {
        if (!product.sista_forbrukningsdag) return false;
        const daysUntilExpiry = dateDifference(product.sista_forbrukningsdag);
        if (daysUntilExpiry < 0 || daysUntilExpiry > 7) return false;
      }
      if (
        belowHalfOnly &&
        (product.status !== "i_lager" ||
          !(Number(product.remaining_percent ?? 100) < 50))
      ) {
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
    belowHalfOnly,
    favoritesOnly,
    expiringOnly,
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
  const belowHalfCount = inStockProducts.filter(
    (product) => Number(product.remaining_percent ?? 100) < 50,
  ).length;
  const categories = Array.from(
    new Set(
      products
        .map((product) => product.kategori)
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort((a, b) => a.localeCompare(b, numberLocale));
  const categoryOptions = categories.map((value) => ({
    value,
    count: products.filter(
      (product) =>
        product.kategori === value &&
        (statusFilter === "all" || product.status === statusFilter),
    ).length,
  }));
  const categoryTotalCount = products.filter(
    (product) => statusFilter === "all" || product.status === statusFilter,
  ).length;

  const openNewForm = () => {
    setEditingProduct(null);
    setForm(createEmptyForm(locale));
    setSelectedCatalogName("");
    setSelectedImage(null);
    setFormError("");
    setLookupError("");
    setScannerOpen(false);
    setOperationError("");
    setIsFormOpen(true);
  };

  const switchAddForm = (type: "product" | "recipe") => {
    if (type === "product") {
      setActiveSection("products");
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
      const { data: catalogProduct, error: catalogError } = await supabase
        .from("produkt_katalog")
        .select("streckkod, namn, brand, image_url, kategori")
        .eq("streckkod", normalizedBarcode)
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

      setLookupError(t.productNotFound);
    } catch (error) {
      console.error("Failed to look up product barcode:", error);
      setLookupError(t.productLookupError);
    } finally {
      setIsLookingUpProduct(false);
    }
  };

  const selectCatalogProduct = (product: ProductCatalogEntry) => {
    setSelectedCatalogName(product.namn);
    setForm((current) => ({
      ...current,
      streckkod: product.streckkod ?? "",
      namn: product.namn,
      varumarke: product.brand ?? "",
      bild_url: product.image_url ?? "",
      kategori: product.kategori ?? current.kategori,
    }));
    setCatalogSearch({ query: "", products: [], isLoading: false, error: "" });
    setSelectedImage(null);
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
      remaining_percent: editingProduct?.remaining_percent ?? 100,
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

    const catalogValues = {
      streckkod: values.streckkod,
      namn: values.namn,
      brand: values.varumarke,
      image_url: values.bild_url,
      kategori: values.kategori,
    };
    let catalogSaveError: { message: string } | null = null;

    if (values.streckkod) {
      const { error } = await supabase
        .from("produkt_katalog")
        .upsert(catalogValues, { onConflict: "streckkod" });
      catalogSaveError = error;
    } else {
      let existingQuery = supabase
        .from("produkt_katalog")
        .select("catalog_id, image_url, kategori")
        .eq("namn", values.namn)
        .is("streckkod", null);
      existingQuery = values.varumarke
        ? existingQuery.eq("brand", values.varumarke)
        : existingQuery.is("brand", null);

      const { data: existingProduct, error: findError } = await existingQuery
        .limit(1)
        .maybeSingle();

      if (findError) {
        catalogSaveError = findError;
      } else {
        const catalogEntry = {
          ...catalogValues,
          image_url: values.bild_url ?? existingProduct?.image_url ?? null,
          kategori: values.kategori ?? existingProduct?.kategori ?? null,
        };
        const result = existingProduct
          ? await supabase
              .from("produkt_katalog")
              .update(catalogEntry)
              .eq("catalog_id", existingProduct.catalog_id)
          : await supabase.from("produkt_katalog").insert(catalogEntry);
        catalogSaveError = result.error;
      }
    }

    if (catalogSaveError) {
      console.error("Failed to save product to catalog:", catalogSaveError);
      setOperationError(t.catalogSaveError);
      setIsSaving(false);
      return;
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
      Pick<
        PantryProduct,
        "status" | "is_favorite" | "kvantitet" | "remaining_percent"
      >
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

  const confirmDiscardProduct = () => {
    if (!pendingDiscardProduct) return;

    const product = pendingDiscardProduct;
    setPendingDiscardProduct(null);
    void updateProduct(product, { status: "kastad" });
  };

  const confirmConsumeProduct = () => {
    if (!pendingConsumedProduct) return;

    const product = pendingConsumedProduct;
    setPendingConsumedProduct(null);
    void updateProduct(product, {
      status: "konsumerad",
      remaining_percent: 0,
    });
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setFavoritesOnly(false);
    setBelowHalfOnly(false);
    setExpiringOnly(false);
  };

  const selectStatFilter = (
    filter: "in-stock" | "expiring" | "below-half" | "favorites" | "recipes",
  ) => {
    if (filter === "recipes") {
      setActiveSection("recipes");
      setFavoritesOnly(false);
      return;
    }

    setActiveSection("products");
    setSearch("");
    setStatusFilter("i_lager");
    setCategoryFilter("all");
    setFavoritesOnly(filter === "favorites");
    setBelowHalfOnly(filter === "below-half");
    setExpiringOnly(filter === "expiring");
  };

  const openProducts = () => {
    setActiveSection("products");
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setFavoritesOnly(false);
    setBelowHalfOnly(false);
    setExpiringOnly(false);
  };

  const navItems = [
    {
      id: "home",
      label: t.inventory,
      icon: House,
      active: activeSection === "home",
      onClick: () => {
        setActiveSection("home");
        setSearch("");
        setStatusFilter("i_lager");
        setCategoryFilter("all");
        setFavoritesOnly(false);
        setBelowHalfOnly(false);
        setExpiringOnly(false);
      },
    },
    {
      id: "products",
      label: t.products,
      icon: Package,
      active: activeSection === "products",
      onClick: openProducts,
    },
    {
      id: "add",
      label: t.addType,
      icon: Plus,
      onClick: () =>
        switchAddForm(activeSection === "recipes" ? "recipe" : "product"),
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
      id: "menu",
      label: sharedT.menu,
      icon: Menu,
      onClick: () => setIsSettingsDrawerOpen(true),
    },
  ];

  return (
    <>
      <main className="min-h-[calc(100dvh-4rem)] bg-background px-4 pb-28 pt-6 text-foreground sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6 animate-view-in">
          {activeSection === "lists" ? (
            <ListsView userId={userId} t={t} />
          ) : activeSection === "recipes" ? (
            <RecipeView
              userId={userId}
              products={products}
              isPantryLoading={isLoading}
              pantryLoadError={Boolean(loadError)}
              addRequest={recipeAddRequest}
              onAddRequestHandled={() => setRecipeAddRequest(0)}
              onRecipeListChange={() =>
                setRecipeCountReloadToken((current) => current + 1)
              }
              onOpenLists={() => setActiveSection("lists")}
              onSwitchForm={switchAddForm}
            />
          ) : activeSection === "catalog" ? (
            <PantryProductCatalog
              userId={userId}
              t={t}
              locale={locale}
              onOpenLists={() => setActiveSection("lists")}
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

              {activeSection === "home" ? (
                loadError ? (
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
                ) : (
                  <>
                    <PantryStats
                      t={t}
                      totalItems={inStockProducts.length}
                      expiring={expiringCount}
                      belowHalf={belowHalfCount}
                      recipeCount={recipeCount}
                      isLoading={isLoading}
                      isRecipeCountLoading={
                        isRecipeCountLoading && recipeCount === null
                      }
                      onSelect={selectStatFilter}
                    />
                    {recipeCountError ? (
                      <div
                        role="alert"
                        className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                      >
                        <p>{t.recipeLoadError}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setReloadToken((current) => current + 1)
                          }
                          className="mt-2 font-semibold text-red-100 underline underline-offset-4"
                        >
                          {t.retry}
                        </button>
                      </div>
                    ) : null}
                    <RecipeCarousel
                      userId={userId}
                      products={products}
                      isPantryLoading={isLoading}
                      pantryLoadError={Boolean(loadError)}
                      onPantryChange={() =>
                        setReloadToken((current) => current + 1)
                      }
                      onOpenRecipes={() => setActiveSection("recipes")}
                      onOpenLists={() => setActiveSection("lists")}
                    />
                  </>
                )
              ) : (
                <>
                  <PantryCategories
                    categories={categoryOptions}
                    categoryFilter={categoryFilter}
                    locale={locale}
                    t={t}
                    totalCount={categoryTotalCount}
                    onCategoryChange={setCategoryFilter}
                  />

                  <section
                    aria-labelledby="pantry-products-heading"
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h2
                        id="pantry-products-heading"
                        className="text-lg font-semibold text-foreground"
                      >
                        {t.products}
                      </h2>
                      {!isLoading && !loadError ? (
                        <span className="text-xs text-muted-foreground">
                          {t.itemsCount(filteredProducts.length)}
                        </span>
                      ) : null}
                    </div>

                    <PantryFilters
                      t={t}
                      search={search}
                      statusFilter={statusFilter}
                      favoritesOnly={favoritesOnly}
                      belowHalfOnly={belowHalfOnly}
                      expiringOnly={expiringOnly}
                      inStockCount={inStockProducts.length}
                      belowHalfCount={belowHalfCount}
                      onSearchChange={setSearch}
                      onStatusChange={setStatusFilter}
                      onFavoritesChange={() =>
                        setFavoritesOnly((current) => !current)
                      }
                      onBelowHalfChange={() =>
                        setBelowHalfOnly((current) => !current)
                      }
                      onExpiringChange={() =>
                        setExpiringOnly((current) => !current)
                      }
                    />

                    {isLoading ? (
                      <div className="rounded-2xl border border-border bg-muted px-5 py-12 text-center text-sm text-muted-foreground">
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
                          onClick={() =>
                            setReloadToken((current) => current + 1)
                          }
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
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                            onDiscard={setPendingDiscardProduct}
                            onConsume={setPendingConsumedProduct}
                            onViewImage={(product) => {
                              if (product.bild_url) {
                                setImagePreview({
                                  name: product.namn,
                                  url: product.bild_url,
                                });
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </>
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
        catalogProducts={
          isFormOpen &&
          !editingProduct &&
          form.namn.trim().length >= 2 &&
          catalogSearch.query === form.namn.trim()
            ? catalogSearch.products
            : []
        }
        isSearchingCatalog={
          isFormOpen &&
          !editingProduct &&
          catalogSearch.query === form.namn.trim() &&
          catalogSearch.isLoading
        }
        catalogSearchError={
          isFormOpen &&
          !editingProduct &&
          catalogSearch.query === form.namn.trim()
            ? catalogSearch.error
            : ""
        }
        scannerOpen={scannerOpen}
        t={t}
        locale={locale}
        onSwitchForm={switchAddForm}
        onLookupProduct={() => {
          void lookupBarcode(form.streckkod);
        }}
        onProductNameChange={(name) => {
          setSelectedCatalogName("");
          setCatalogSearch({ query: "", products: [], isLoading: false, error: "" });
          setForm((current) => ({ ...current, namn: name }));
        }}
        onSelectCatalogProduct={selectCatalogProduct}
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

      <Dialog.Root
        open={imagePreview !== null}
        onOpenChange={(open) => {
          if (!open) setImagePreview(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/80 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <Dialog.Popup className="w-full max-w-[min(90vw,56rem)] rounded-2xl border border-border bg-card p-4 text-foreground shadow-2xl outline-none sm:p-6">
              {imagePreview ? (
                <>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <Dialog.Title className="truncate text-lg font-semibold">
                      {imagePreview.name}
                    </Dialog.Title>
                    <button
                      type="button"
                      aria-label={t.closeImage}
                      onClick={() => setImagePreview(null)}
                      className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    >
                      <X aria-hidden="true" className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="relative mx-auto h-[min(75dvh,50rem)] w-full max-w-[50rem]">
                    <Image
                      unoptimized
                      fill
                      sizes="82vw"
                      src={imagePreview.url}
                      alt={imagePreview.name}
                      className="object-contain"
                    />
                  </div>
                </>
              ) : null}
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>

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

      <AlertDialog.Root
        open={pendingConsumedProduct !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConsumedProduct(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <AlertDialog.Popup className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none transition-[opacity,transform] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <AlertDialog.Title className="text-lg font-semibold">
                {t.consumeItemTitle}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {t.consumeConfirm}
              </AlertDialog.Description>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingConsumedProduct(null)}
                >
                  {t.cancel}
                </Button>
                <Button type="button" onClick={confirmConsumeProduct}>
                  {t.markConsumed}
                </Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={pendingDiscardProduct !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDiscardProduct(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <AlertDialog.Popup className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none transition-[opacity,transform] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <AlertDialog.Title className="text-lg font-semibold">
                {t.discardItemTitle}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {t.discardConfirm}
              </AlertDialog.Description>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingDiscardProduct(null)}
                >
                  {t.cancel}
                </Button>
                <Button type="button" onClick={confirmDiscardProduct}>
                  {t.discardAction}
                </Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <BottomNav items={navItems} />
      <PantrySettingsDrawer
        open={isSettingsDrawerOpen}
        onOpenChange={setIsSettingsDrawerOpen}
        productCatalogLabel={t.productCatalog}
        listsLabel={t.listsTitle}
        onOpenLists={() => {
          setActiveSection("lists");
          setIsSettingsDrawerOpen(false);
        }}
        onOpenProductCatalog={() => {
          setActiveSection("catalog");
          setIsSettingsDrawerOpen(false);
        }}
        theme={theme}
        onThemeChange={onThemeChange}
        onLogout={onLogout}
      />
    </>
  );
}
