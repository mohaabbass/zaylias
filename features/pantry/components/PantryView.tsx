"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, House, LayoutGrid, Plus } from "lucide-react";
import type { FormEvent } from "react";

import { BottomNav } from "@/components/layout/BottomNav";
import { useLocale } from "@/components/providers/LocaleProvider";
import { PantryEmptyState } from "@/features/pantry/components/PantryEmptyState";
import { PantryFilters } from "@/features/pantry/components/PantryFilters";
import { PantryPageHeader } from "@/features/pantry/components/PantryPageHeader";
import { PantryProductCard } from "@/features/pantry/components/PantryProductCard";
import { PantryProductForm } from "@/features/pantry/components/PantryProductForm";
import { PantryStats } from "@/features/pantry/components/PantryStats";
import { productColumns } from "@/features/pantry/constants";
import { pantryTranslations } from "@/features/pantry/i18n";
import type {
  PantryProduct,
  ProductFormValues,
  StatusFilter,
} from "@/features/pantry/types";
import { dateDifference, getLocalDateString } from "@/features/pantry/utils";
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
  };
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PantryProduct | null>(
    null,
  );
  const [form, setForm] = useState<ProductFormValues>(() =>
    createEmptyForm(locale),
  );
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

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
        [product.namn, product.kategori, product.butik, product.streckkod]
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
    setFormError("");
    setOperationError("");
    setIsFormOpen(true);
  };

  const openEditForm = (product: PantryProduct) => {
    setEditingProduct(product);
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
    });
    setFormError("");
    setOperationError("");
    setIsFormOpen(true);
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
    };

    setIsSaving(true);

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
    setIsFormOpen(false);
  };

  const updateProduct = async (
    product: PantryProduct,
    values: Partial<Pick<PantryProduct, "status" | "is_favorite">>,
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
    if (!window.confirm(t.deleteConfirm)) return;

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
      active: !favoritesOnly,
      onClick: () => {
        setStatusFilter("i_lager");
        setFavoritesOnly(false);
      },
    },
    {
      id: "favorites",
      label: t.favorites,
      icon: Heart,
      active: favoritesOnly,
      onClick: () => {
        setStatusFilter("i_lager");
        setFavoritesOnly(true);
      },
    },
    { id: "add", label: t.addItem, icon: Plus, onClick: openNewForm },
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
          <PantryPageHeader t={t} onAddItem={openNewForm} />

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
              onAddItem={openNewForm}
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
                  numberLocale={numberLocale}
                  isBusy={busyProductId === product.id}
                  onUpdate={(target, values) => {
                    void updateProduct(target, values);
                  }}
                  onEdit={openEditForm}
                  onDelete={(target) => {
                    void deleteProduct(target);
                  }}
                />
              ))}
            </section>
          )}
        </div>
      </main>

      <PantryProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingProduct={editingProduct}
        form={form}
        setForm={setForm}
        formError={formError}
        operationError={operationError}
        isSaving={isSaving}
        t={t}
        locale={locale}
        onSubmit={(event) => {
          void saveProduct(event);
        }}
      />

      <BottomNav items={navItems} />
    </>
  );
}
