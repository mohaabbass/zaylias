"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Archive,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Heart,
  Milk,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBasket,
  Snowflake,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useLocale } from "@/components/providers/LocaleProvider";
import { supabase } from "@/lib/supabase";

type ProductStatus = "i_lager" | "konsumerad" | "kastad";
type StatusFilter = "all" | ProductStatus;

type PantryProduct = {
  id: string;
  user_id: string;
  namn: string;
  kategori: string | null;
  kvantitet: number | string | null;
  enhet: string | null;
  pris: number | string | null;
  kopdatum: string | null;
  sista_forbrukningsdag: string | null;
  ar_oppnad: boolean;
  oppnad_datum: string | null;
  butik: string | null;
  streckkod: string | null;
  status: ProductStatus;
  is_favorite: boolean;
  created_at: string;
};

type ProductForm = {
  namn: string;
  kategori: string;
  kvantitet: string;
  enhet: string;
  pris: string;
  kopdatum: string;
  sista_forbrukningsdag: string;
  ar_oppnad: boolean;
  oppnad_datum: string;
  butik: string;
  streckkod: string;
};

const productColumns =
  "id, user_id, namn, kategori, kvantitet, enhet, pris, kopdatum, sista_forbrukningsdag, ar_oppnad, oppnad_datum, butik, streckkod, status, is_favorite, created_at";

const categoryOptions = [
  { value: "Dairy", sv: "Mejeri", en: "Dairy" },
  { value: "Produce", sv: "Frukt & grönt", en: "Produce" },
  { value: "Meat & seafood", sv: "Kött & fisk", en: "Meat & seafood" },
  { value: "Pantry", sv: "Skafferi", en: "Pantry" },
  { value: "Freezer", sv: "Frys", en: "Freezer" },
  { value: "Bakery", sv: "Bageri", en: "Bakery" },
  { value: "Other", sv: "Övrigt", en: "Other" },
] as const;

const copy = {
  sv: {
    title: "Mitt skafferi",
    subtitle: "Håll koll på vad du har hemma.",
    inStockProducts: "Ditt lager",
    addItem: "Lägg till vara",
    search: "Sök varor",
    all: "Alla",
    inStock: "I lager",
    consumed: "Förbrukade",
    discarded: "Slängda",
    totalItems: "Varor i lager",
    expiring: "Går snart ut",
    opened: "Öppnade",
    favorites: "Favoriter",
    noItems: "Ditt skafferi är tomt",
    noItemsDescription: "Lägg till din första vara för att komma igång.",
    noResults: "Inga varor hittades",
    noResultsDescription: "Prova en annan sökning eller filter.",
    clearSearch: "Rensa sökning",
    name: "Namn",
    namePlaceholder: "t.ex. Havremjölk",
    category: "Kategori",
    quantity: "Antal",
    unit: "Enhet",
    price: "Pris",
    purchaseDate: "Inköpsdatum",
    expiryDate: "Bäst före",
    store: "Butik",
    storePlaceholder: "Valfritt",
    barcode: "Streckkod",
    openedItem: "Varan är öppnad",
    openedDate: "Öppnad datum",
    save: "Spara vara",
    saveChanges: "Spara ändringar",
    cancel: "Avbryt",
    edit: "Redigera",
    delete: "Ta bort",
    deleteConfirm: "Vill du ta bort den här varan?",
    favorite: "Lägg till favorit",
    unfavorite: "Ta bort favorit",
    markConsumed: "Markera som förbrukad",
    markDiscarded: "Markera som slängd",
    returnToStock: "Flytta till lager",
    statusInStock: "I lager",
    statusConsumed: "Förbrukad",
    statusDiscarded: "Slängd",
    expiresToday: "Går ut idag",
    expired: "Utgången",
    expiresIn: (days: number) => `Går ut om ${days} dagar`,
    openedLabel: "Öppnad",
    boughtAt: (store: string) => `Köpt på ${store}`,
    quantityRequired: "Ange ett giltigt namn och ett antal större än noll.",
    invalidPrice: "Ange ett giltigt pris, eller lämna fältet tomt.",
    loadError: "Varorna kunde inte hämtas. Försök igen.",
    saveError: "Varan kunde inte sparas. Försök igen.",
    updateError: "Varan kunde inte uppdateras. Försök igen.",
    deleteError: "Varan kunde inte tas bort. Försök igen.",
    retry: "Försök igen",
    saving: "Sparar...",
    loading: "Hämtar skafferiet...",
    editItem: "Redigera vara",
    newItem: "Ny vara",
    quantityUnit: "st",
    unitOptions: ["st", "g", "kg", "ml", "dl", "l"],
    currency: "kr",
  },
  en: {
    title: "My pantry",
    subtitle: "Keep track of what you have at home.",
    inStockProducts: "Your inventory",
    addItem: "Add item",
    search: "Search items",
    all: "All",
    inStock: "In stock",
    consumed: "Consumed",
    discarded: "Discarded",
    totalItems: "Items in stock",
    expiring: "Expiring soon",
    opened: "Opened",
    favorites: "Favorites",
    noItems: "Your pantry is empty",
    noItemsDescription: "Add your first item to get started.",
    noResults: "No items found",
    noResultsDescription: "Try a different search or filter.",
    clearSearch: "Clear search",
    name: "Name",
    namePlaceholder: "e.g. Oat milk",
    category: "Category",
    quantity: "Quantity",
    unit: "Unit",
    price: "Price",
    purchaseDate: "Purchase date",
    expiryDate: "Best before",
    store: "Store",
    storePlaceholder: "Optional",
    barcode: "Barcode",
    openedItem: "This item is opened",
    openedDate: "Opened date",
    save: "Save item",
    saveChanges: "Save changes",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    deleteConfirm: "Remove this item from your pantry?",
    favorite: "Add to favorites",
    unfavorite: "Remove from favorites",
    markConsumed: "Mark as consumed",
    markDiscarded: "Mark as discarded",
    returnToStock: "Move to in stock",
    statusInStock: "In stock",
    statusConsumed: "Consumed",
    statusDiscarded: "Discarded",
    expiresToday: "Expires today",
    expired: "Expired",
    expiresIn: (days: number) => `Expires in ${days} days`,
    openedLabel: "Opened",
    boughtAt: (store: string) => `Bought at ${store}`,
    quantityRequired: "Enter a valid name and a quantity greater than zero.",
    invalidPrice: "Enter a valid price, or leave the field empty.",
    loadError: "Could not load pantry items. Please try again.",
    saveError: "Could not save this item. Please try again.",
    updateError: "Could not update this item. Please try again.",
    deleteError: "Could not remove this item. Please try again.",
    retry: "Retry",
    saving: "Saving...",
    loading: "Loading your pantry...",
    editItem: "Edit item",
    newItem: "New item",
    quantityUnit: "pcs",
    unitOptions: ["pcs", "g", "kg", "ml", "dl", "l"],
    currency: "kr",
  },
} as const;

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyForm(locale: "sv" | "en"): ProductForm {
  const today = getLocalDateString(new Date());

  return {
    namn: "",
    kategori: "Pantry",
    kvantitet: "1",
    enhet: locale === "sv" ? "st" : "pcs",
    pris: "",
    kopdatum: today,
    sista_forbrukningsdag: "",
    ar_oppnad: false,
    oppnad_datum: "",
    butik: "",
    streckkod: "",
  };
}

function dateDifference(date: string) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function CategoryIcon({ category }: { category: string | null }) {
  const value = category?.toLowerCase();
  const Icon: LucideIcon =
    value === "dairy" ? Milk : value === "produce" ? Apple : value === "freezer" ? Snowflake : Package;

  return <Icon aria-hidden="true" className="h-5 w-5" />;
}

export function PantryView({ userId }: { userId: string }) {
  const { locale } = useLocale();
  const t = copy[locale];
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
  const [form, setForm] = useState<ProductForm>(() => createEmptyForm(locale));
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

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
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

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: "i_lager", label: t.inStock },
    { value: "all", label: t.all },
    { value: "konsumerad", label: t.consumed },
    { value: "kastad", label: t.discarded },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
            <ShoppingBasket aria-hidden="true" className="h-3.5 w-3.5" />
            {t.inStockProducts}
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t.title}
          </h2>
          <p className="mt-2 text-sm text-slate-400">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/30"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t.addItem}
        </button>
      </header>

      {operationError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {operationError}
        </div>
      ) : null}

      <section
        aria-label={t.title}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          {
            label: t.totalItems,
            value: inStockProducts.length,
            icon: Archive,
            color: "text-emerald-300",
          },
          {
            label: t.expiring,
            value: expiringCount,
            icon: CircleAlert,
            color: "text-amber-300",
          },
          {
            label: t.opened,
            value: openedCount,
            icon: Clock3,
            color: "text-sky-300",
          },
          {
            label: t.favorites,
            value: favoriteCount,
            icon: Heart,
            color: "text-rose-300",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-400 sm:text-sm">
                  {stat.label}
                </span>
                <Icon
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 ${stat.color}`}
                />
              </div>
              <p className="mt-3 text-2xl font-semibold text-white">
                {stat.value}
              </p>
            </div>
          );
        })}
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
            />
          </label>
          <button
            type="button"
            onClick={() => setFavoritesOnly((current) => !current)}
            aria-pressed={favoritesOnly}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${
              favoritesOnly
                ? "border-rose-300/40 bg-rose-300/10 text-rose-200"
                : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-white/5"
            }`}
          >
            <Heart
              aria-hidden="true"
              className={`h-4 w-4 ${favoritesOnly ? "fill-current" : ""}`}
            />
            {t.favorites}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              aria-pressed={statusFilter === tab.value}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                statusFilter === tab.value
                  ? "bg-emerald-400 text-slate-950"
                  : "bg-white/[0.06] text-slate-300 hover:bg-white/10"
              }`}
            >
              {tab.label}
              {tab.value === "i_lager" ? (
                <span className="ml-1.5 opacity-70">
                  {inStockProducts.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {categories.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto border-t border-white/[0.07] pt-3">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              aria-pressed={categoryFilter === "all"}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
                categoryFilter === "all"
                  ? "bg-white/15 text-white"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {t.all}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                aria-pressed={categoryFilter === category}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
                  categoryFilter === category
                    ? "bg-white/15 text-white"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        ) : null}
      </section>

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
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-5 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
            <ShoppingBasket aria-hidden="true" className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-white">
            {products.length === 0 ? t.noItems : t.noResults}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {products.length === 0 ? t.noItemsDescription : t.noResultsDescription}
          </p>
          {products.length === 0 ? (
            <button
              type="button"
              onClick={openNewForm}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t.addItem}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setCategoryFilter("all");
                setFavoritesOnly(false);
              }}
              className="mt-4 text-sm font-medium text-emerald-200 underline underline-offset-4"
            >
              {t.clearSearch}
            </button>
          )}
        </div>
      ) : (
        <section
          aria-label={t.inStock}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {filteredProducts.map((product) => {
            const isBusy = busyProductId === product.id;
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
                      : formatDate(
                          product.sista_forbrukningsdag!,
                          numberLocale,
                        );
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

            return (
              <article
                key={product.id}
                className="flex min-h-52 flex-col rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-white/20"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200">
                    <CategoryIcon category={product.kategori} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-white">
                      {product.namn}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {product.kategori ?? t.category}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void updateProduct(product, {
                        is_favorite: !product.is_favorite,
                      })
                    }
                    disabled={isBusy}
                    aria-label={
                      product.is_favorite ? t.unfavorite : t.favorite
                    }
                    aria-pressed={product.is_favorite}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-rose-300 disabled:opacity-50"
                  >
                    <Heart
                      aria-hidden="true"
                      className={`h-4 w-4 ${
                        product.is_favorite
                          ? "fill-rose-400 text-rose-400"
                          : ""
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
                      <Clock3
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0"
                      />
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
                          onClick={() =>
                            void updateProduct(product, {
                              status: "konsumerad",
                            })
                          }
                          disabled={isBusy}
                          aria-label={t.markConsumed}
                          title={t.markConsumed}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-300/10 hover:text-emerald-200 disabled:opacity-50"
                        >
                          <Check
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void updateProduct(product, { status: "kastad" })
                          }
                          disabled={isBusy}
                          aria-label={t.markDiscarded}
                          title={t.markDiscarded}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-300/10 hover:text-amber-200 disabled:opacity-50"
                        >
                          <Trash2
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          void updateProduct(product, { status: "i_lager" })
                        }
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
                      onClick={() => openEditForm(product)}
                      aria-label={t.edit}
                      title={t.edit}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteProduct(product)}
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
          })}
        </section>
      )}

      <Drawer
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!isSaving) setIsFormOpen(open);
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
          <form
            onSubmit={saveProduct}
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

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-200">{t.name}</span>
              <input
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

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-slate-200">{t.store}</span>
                <input
                  value={form.butik}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      butik: event.target.value,
                    }))
                  }
                  placeholder={t.storePlaceholder}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
                />
              </label>
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
            </div>

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
                  <span className="font-medium text-slate-300">
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
    </div>
  );
}
