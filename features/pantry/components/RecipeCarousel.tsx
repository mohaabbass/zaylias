"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChefHat,
  Clock3,
  Heart,
  ImageIcon,
  LoaderCircle,
  Plus,
  ShoppingBasket,
  Sparkles,
  Timer,
} from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";

import { useLocale } from "@/components/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { pantryTranslations } from "@/features/pantry/i18n";
import {
  getIngredientAvailability,
  getRecipeAvailabilitySummary,
  getRecipeConsumptionUpdates,
  normalizeIngredientName,
} from "@/features/pantry/recipe-matching";
import type {
  PantryProduct,
  Recipe,
  RecipeIngredient,
} from "@/features/pantry/types";
import { dateDifference } from "@/features/pantry/utils";
import { supabase } from "@/lib/supabase";

type RecipeRow = Omit<Recipe, "ingredients" | "is_favorited">;
type RecipeFilter = "all" | "ready" | "useSoon" | "quick";
type PantryList = { id: string; name: string };

const recipeColumns =
  "id, user_id, titel, beskrivning, tid, kategori, tags, main_ingredient, bild_url, is_favorite, created_at";

export function RecipeCarousel({
  userId,
  products,
  isPantryLoading,
  pantryLoadError,
  onPantryChange,
  onOpenRecipes,
  onOpenLists,
}: {
  userId: string;
  products: PantryProduct[];
  isPantryLoading: boolean;
  pantryLoadError: boolean;
  onPantryChange: () => void;
  onOpenRecipes: () => void;
  onOpenLists: () => void;
}) {
  const { locale } = useLocale();
  const t = pantryTranslations[locale];
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [filter, setFilter] = useState<RecipeFilter>("all");
  const [busyRecipeId, setBusyRecipeId] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [lists, setLists] = useState<PantryList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listsError, setListsError] = useState("");
  const [addingToListId, setAddingToListId] = useState("");

  useEffect(() => {
    let isCurrent = true;

    const loadRecipes = async () => {
      setIsLoading(true);
      setLoadError(false);
      const { data: recipeData, error: recipeError } = await supabase
        .from("recept")
        .select(recipeColumns)
        .or(`user_id.is.null,user_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (!isCurrent) return;
      if (recipeError) {
        console.error("Failed to load homepage recipes:", recipeError);
        setLoadError(true);
        setRecipes([]);
        setIsLoading(false);
        return;
      }

      const recipeRows = (recipeData ?? []) as RecipeRow[];
      const recipeIds = recipeRows.map((recipe) => recipe.id);
      let ingredients: RecipeIngredient[] = [];
      let favoriteIds = new Set<string>();

      if (recipeIds.length > 0) {
        const [ingredientResult, favoriteResult] = await Promise.all([
          supabase
            .from("recept_ingredienser")
            .select("id, recept_id, ingrediens_namn, kvantitet, enhet")
            .in("recept_id", recipeIds)
            .order("id"),
          supabase
            .from("favoritrecept")
            .select("recept_id")
            .eq("user_id", userId)
            .in("recept_id", recipeIds),
        ]);

        if (!isCurrent) return;
        if (ingredientResult.error || favoriteResult.error) {
          if (ingredientResult.error) {
            console.error(
              "Failed to load homepage recipe ingredients:",
              ingredientResult.error,
            );
          }
          if (favoriteResult.error) {
            console.error(
              "Failed to load homepage recipe favorites:",
              favoriteResult.error,
            );
          }
          setLoadError(true);
          setRecipes([]);
          setIsLoading(false);
          return;
        }

        ingredients = (ingredientResult.data ?? []) as RecipeIngredient[];
        favoriteIds = new Set(
          (favoriteResult.data ?? []).map(
            (favorite: { recept_id: string }) => favorite.recept_id,
          ),
        );
      }

      const ingredientsByRecipe = new Map<string, RecipeIngredient[]>();
      for (const ingredient of ingredients) {
        const items = ingredientsByRecipe.get(ingredient.recept_id) ?? [];
        items.push(ingredient);
        ingredientsByRecipe.set(ingredient.recept_id, items);
      }

      setRecipes(
        recipeRows.map((recipe) => ({
          ...recipe,
          ingredients: ingredientsByRecipe.get(recipe.id) ?? [],
          is_favorited:
            recipe.user_id === null
              ? favoriteIds.has(recipe.id)
              : recipe.is_favorite,
        })),
      );
      setIsLoading(false);
    };

    void loadRecipes();
    return () => {
      isCurrent = false;
    };
  }, [reloadToken, userId]);

  useEffect(() => {
    if (!selectedRecipe) return;

    let isCurrent = true;
    const loadLists = async () => {
      setListsLoading(true);
      setListsError("");
      const { data, error } = await supabase
        .from("pantry_lists")
        .select("id, name")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (!isCurrent) return;
      if (error) {
        console.error("Failed to load shopping lists:", error);
        setListsError(t.listsLoadError);
        setLists([]);
      } else {
        setLists(data ?? []);
      }
      setListsLoading(false);
    };

    void loadLists();
    return () => {
      isCurrent = false;
    };
  }, [selectedRecipe, t.listsLoadError, userId]);

  const filteredRecipes = useMemo(() => {
    const items = recipes.map((recipe) => {
      const availability = getRecipeAvailabilitySummary(recipe, products);
      const matchedIngredients = recipe.ingredients.filter((ingredient) => {
        const status = getIngredientAvailability(ingredient, products).status;
        return status === "enough" || status === "inPantry";
      }).length;
      const missingCount = recipe.ingredients.filter((ingredient) => {
        const status = getIngredientAvailability(ingredient, products).status;
        return status === "missing" || status === "partial" || status === "low";
      }).length;
      const unknownCount = recipe.ingredients.filter(
        (ingredient) =>
          getIngredientAvailability(ingredient, products).status === "unknown",
      ).length;
      const nearestExpiry = recipe.ingredients
        .flatMap((ingredient) =>
          products
            .filter(
              (product) =>
                product.status === "i_lager" &&
                normalizeIngredientName(product.namn) ===
                  normalizeIngredientName(ingredient.ingrediens_namn) &&
                product.sista_forbrukningsdag,
            )
            .map((product) => dateDifference(product.sista_forbrukningsdag!)),
        )
        .filter((days) => days >= 0 && days <= 7)
        .sort((left, right) => left - right)[0];

      return {
        recipe,
        availability,
        matchedIngredients,
        missingCount,
        unknownCount,
        unmatchedCount: recipe.ingredients.length - matchedIngredients,
        nearestExpiry,
      };
    });

    return items
      .filter(({ recipe, availability, nearestExpiry, matchedIngredients }) => {
        if (filter === "ready") return availability.status === "ready";
        if (filter === "useSoon") return nearestExpiry !== undefined;
        if (filter === "quick") {
          return (
            recipe.tid !== null && recipe.tid < 20 && matchedIngredients > 0
          );
        }
        return true;
      })
      .sort((left, right) => {
        if (
          left.availability.status === "ready" &&
          right.availability.status !== "ready"
        ) {
          return -1;
        }
        if (
          right.availability.status === "ready" &&
          left.availability.status !== "ready"
        ) {
          return 1;
        }
        const leftExpiry = left.nearestExpiry ?? Number.POSITIVE_INFINITY;
        const rightExpiry = right.nearestExpiry ?? Number.POSITIVE_INFINITY;
        if (leftExpiry !== rightExpiry) return leftExpiry - rightExpiry;
        if (left.unmatchedCount !== right.unmatchedCount) {
          return left.unmatchedCount - right.unmatchedCount;
        }
        return (
          (left.recipe.tid ?? Number.POSITIVE_INFINITY) -
          (right.recipe.tid ?? Number.POSITIVE_INFINITY)
        );
      });
  }, [filter, products, recipes]);

  const toggleFavorite = async (recipe: Recipe) => {
    if (busyRecipeId) return;
    setBusyRecipeId(recipe.id);
    setActionError("");
    const nextFavorite = !recipe.is_favorited;
    const result =
      recipe.user_id === null
        ? nextFavorite
          ? await supabase
              .from("favoritrecept")
              .insert({ user_id: userId, recept_id: recipe.id })
          : await supabase
              .from("favoritrecept")
              .delete()
              .eq("user_id", userId)
              .eq("recept_id", recipe.id)
        : await supabase
            .from("recept")
            .update({ is_favorite: nextFavorite })
            .eq("id", recipe.id)
            .eq("user_id", userId);

    if (result.error) {
      console.error("Failed to update homepage recipe favorite:", result.error);
      setActionError(t.recipeFavoriteError);
    } else {
      setRecipes((current) =>
        current.map((item) =>
          item.id === recipe.id
            ? {
                ...item,
                is_favorited: nextFavorite,
                ...(item.user_id === userId
                  ? { is_favorite: nextFavorite }
                  : {}),
              }
            : item,
        ),
      );
    }
    setBusyRecipeId("");
  };

  const cookRecipe = async (recipe: Recipe) => {
    if (busyRecipeId || isPantryLoading || pantryLoadError) return;
    const updates = getRecipeConsumptionUpdates(recipe, products);
    if (!updates) {
      setActionError(t.recipeCookUnavailable);
      return;
    }

    setBusyRecipeId(recipe.id);
    setActionError("");
    for (const update of updates) {
      const { data, error } = await supabase
        .from("produkter")
        .update({
          remaining_percent: update.remaining_percent,
          status: update.status,
        })
        .eq("id", update.id)
        .eq("user_id", userId)
        .select("id")
        .single();

      if (error || !data) {
        console.error(
          "Failed to deduct recipe ingredients:",
          error ?? new Error("Pantry product was not updated."),
        );
        setActionError(t.recipeCookError);
        onPantryChange();
        setBusyRecipeId("");
        return;
      }
    }

    onPantryChange();
    setBusyRecipeId("");
  };

  const addMissingItems = async (list: PantryList) => {
    if (!selectedRecipe || addingToListId) return;
    setAddingToListId(list.id);
    setListsError("");

    const missingItems = selectedRecipe.ingredients
      .filter((ingredient) => {
        const status = getIngredientAvailability(ingredient, products).status;
        return status === "missing" || status === "partial" || status === "low";
      })
      .filter(
        (ingredient, index, ingredients) =>
          ingredients.findIndex(
            (candidate) =>
              normalizeIngredientName(candidate.ingrediens_namn) ===
              normalizeIngredientName(ingredient.ingrediens_namn),
          ) === index,
      )
      .map((ingredient) => {
        const availability = getIngredientAvailability(ingredient, products);
        const quantity =
          availability.status === "partial"
            ? availability.missingQuantity / availability.unitFactor
            : ingredient.kvantitet == null
              ? null
              : Number(ingredient.kvantitet);

        return {
          list_id: list.id,
          item_name: ingredient.ingrediens_namn,
          item_quantity:
            quantity !== null && Number.isFinite(quantity) ? quantity : null,
          item_unit: ingredient.enhet,
        };
      });

    const { data: existingItems, error: existingError } = await supabase
      .from("pantry_list_items")
      .select("item_name")
      .eq("list_id", list.id)
      .not("item_name", "is", null);

    if (existingError) {
      console.error("Failed to check existing shopping items:", existingError);
      setListsError(t.listsItemsLoadError);
      setAddingToListId("");
      return;
    }

    const existingNames = new Set(
      (existingItems ?? []).map((item) =>
        normalizeIngredientName(item.item_name ?? ""),
      ),
    );
    const itemsToInsert = missingItems.filter(
      (item) => !existingNames.has(normalizeIngredientName(item.item_name)),
    );

    if (itemsToInsert.length > 0) {
      const { error } = await supabase
        .from("pantry_list_items")
        .insert(itemsToInsert);
      if (error) {
        console.error("Failed to add missing recipe ingredients:", error);
        setListsError(t.listsAddError);
        setAddingToListId("");
        return;
      }
    }

    setSelectedRecipe(null);
    setAddingToListId("");
  };

  return (
    <section aria-labelledby="recipe-carousel-heading" className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            {t.homeRecipeEyebrow}
          </p>
          <h2
            id="recipe-carousel-heading"
            className="mt-1 text-xl font-semibold text-foreground sm:text-2xl"
          >
            {t.homeRecipeHeading}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.homeRecipeDescription}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenRecipes}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          <span className="hidden sm:inline">{t.homeAllRecipes}</span>
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div
        role="group"
        aria-label={t.homeRecipeFilters}
        className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1"
      >
        {(
          [
            ["all", t.homeFilterAll],
            ["ready", t.homeFilterReady],
            ["useSoon", t.homeFilterUseSoon],
            ["quick", t.homeFilterQuick],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
              filter === value
                ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-300 dark:bg-emerald-300 dark:text-emerald-950"
                : "border-border bg-card text-muted-foreground hover:border-emerald-500 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError ? (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-200"
        >
          {actionError}
        </p>
      ) : null}
      {isPantryLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t.checkingAvailability}
        </p>
      ) : pantryLoadError ? (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">
          {t.pantryAvailabilityError}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden" aria-label={t.loading}>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-80 w-[min(82vw,19rem)] shrink-0 animate-pulse rounded-3xl bg-muted sm:w-72"
            />
          ))}
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="rounded-2xl border border-border bg-card p-6 text-center"
        >
          <p className="text-sm text-muted-foreground">{t.recipeLoadError}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => setReloadToken((current) => current + 1)}
          >
            {t.retry}
          </Button>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-9 text-center">
          <ChefHat
            aria-hidden="true"
            className="mx-auto h-7 w-7 text-emerald-600 dark:text-emerald-400"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {recipes.length === 0
              ? t.noRecipesDescription
              : t.homeNoFilteredRecipes}
          </p>
        </div>
      ) : (
        <div className="scrollbar-hidden flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
          {filteredRecipes.map(
            ({
              recipe,
              availability,
              matchedIngredients,
              missingCount,
              unknownCount,
              nearestExpiry,
            }) => {
              const isReady = availability.status === "ready";
              const consumptionUpdates = getRecipeConsumptionUpdates(
                recipe,
                products,
              );
              const isBusy = busyRecipeId === recipe.id;

              return (
                <article
                  key={recipe.id}
                  className="group w-[min(82vw,20rem)] shrink-0 snap-start overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-72"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-emerald-100 via-lime-50 to-amber-100 dark:from-emerald-950 dark:via-emerald-900 dark:to-amber-950">
                    {recipe.bild_url ? (
                      <Image
                        unoptimized
                        src={recipe.bild_url}
                        alt={recipe.titel}
                        fill
                        sizes="(max-width: 640px) 82vw, 288px"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon
                          aria-hidden="true"
                          className="h-10 w-10 text-emerald-800/35 dark:text-emerald-200/50"
                        />
                      </div>
                    )}
                    <span
                      className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur ${
                        isReady
                          ? "bg-emerald-50/95 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-200"
                          : "bg-amber-50/95 text-amber-900 dark:bg-amber-950/90 dark:text-amber-200"
                      }`}
                    >
                      {isReady ? (
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : (
                        <ShoppingBasket
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                      )}
                      {isReady
                        ? t.homeMatchAll
                        : t.homeMatchPartial(
                            matchedIngredients,
                            recipe.ingredients.length,
                          )}
                    </span>
                    {nearestExpiry !== undefined ? (
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-sm dark:bg-black/65 dark:text-amber-200">
                        <Timer aria-hidden="true" className="h-3.5 w-3.5" />
                        {t.homeUseSoon(nearestExpiry)}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      aria-label={
                        recipe.is_favorited
                          ? t.unfavoriteRecipe
                          : t.favoriteRecipe
                      }
                      disabled={Boolean(busyRecipeId)}
                      onClick={() => void toggleFavorite(recipe)}
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm transition hover:scale-105 disabled:opacity-50 dark:bg-black/65 dark:text-rose-300"
                    >
                      {recipe.is_favorited ? (
                        <Heart
                          aria-hidden="true"
                          className="h-4.5 w-4.5"
                          fill="currentColor"
                        />
                      ) : (
                        <Heart aria-hidden="true" className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="min-h-16">
                      <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
                        {recipe.titel}
                      </h3>
                      {recipe.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {recipe.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-xs font-medium text-emerald-200"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                          {recipe.tid
                            ? `${recipe.tid} ${t.minutes}`
                            : t.homeTimeUnknown}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ChefHat aria-hidden="true" className="h-3.5 w-3.5" />
                          {recipe.ingredients.length <= 5
                            ? t.homeDifficultyEasy
                            : recipe.ingredients.length <= 9
                              ? t.homeDifficultyMedium
                              : t.homeDifficultyHard}
                        </span>
                        {!isReady && missingCount <= 2 ? (
                          <span>{t.homeMissingCount(missingCount)}</span>
                        ) : null}
                        {unknownCount > 0 ? (
                          <span>
                            {t.homeQuantityUnknownCount(unknownCount)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {isReady ? (
                      <Button
                        type="button"
                        className="w-full"
                        disabled={
                          isBusy ||
                          isPantryLoading ||
                          pantryLoadError ||
                          !consumptionUpdates
                        }
                        onClick={() => void cookRecipe(recipe)}
                      >
                        {isBusy ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="animate-spin"
                          />
                        ) : (
                          <Check aria-hidden="true" />
                        )}
                        {t.homeCookNow}
                      </Button>
                    ) : missingCount > 0 && missingCount <= 2 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isPantryLoading || pantryLoadError}
                        onClick={() => {
                          setSelectedRecipe(recipe);
                          setListsLoading(true);
                          setListsError("");
                        }}
                      >
                        <Plus aria-hidden="true" />
                        {t.homeAddMissingItems}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={onOpenRecipes}
                      >
                        {t.homeViewRecipe}
                        <ArrowRight aria-hidden="true" />
                      </Button>
                    )}
                    {isReady && !consumptionUpdates ? (
                      <p className="-mt-2 text-center text-xs text-muted-foreground">
                        {t.recipeCookUnavailable}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}

      <Dialog.Root
        open={selectedRecipe !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRecipe(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl outline-none">
            <Dialog.Title className="text-lg font-semibold">
              {t.homeAddMissingHeading}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted-foreground">
              {selectedRecipe?.titel}
            </Dialog.Description>
            {listsError ? (
              <p
                role="alert"
                className="mt-3 text-sm text-red-600 dark:text-red-200"
              >
                {listsError}
              </p>
            ) : null}
            <div className="mt-4 space-y-2">
              {listsLoading ? (
                <p className="py-5 text-center text-sm text-muted-foreground">
                  {t.listsLoading}
                </p>
              ) : lists.length === 0 && !listsError ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t.listsEmptyDescription}
                  </p>
                  <Button
                    type="button"
                    className="mt-3"
                    onClick={() => {
                      setSelectedRecipe(null);
                      onOpenLists();
                    }}
                  >
                    {t.listsCreate}
                  </Button>
                </div>
              ) : (
                lists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    disabled={Boolean(addingToListId)}
                    onClick={() => void addMissingItems(list)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left transition hover:border-emerald-500 disabled:opacity-60"
                  >
                    <span className="truncate text-sm font-medium">
                      {list.name}
                    </span>
                    {addingToListId === list.id ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    ) : (
                      <Plus aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <Dialog.Close render={<Button type="button" variant="outline" />}>
                {t.cancel}
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
