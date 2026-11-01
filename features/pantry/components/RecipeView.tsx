"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Clock3,
  Heart,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";

import { useLocale } from "@/components/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { RecipeForm } from "@/features/pantry/components/RecipeForm";
import { pantryTranslations } from "@/features/pantry/i18n";
import type {
  Recipe,
  RecipeFormValues,
  RecipeIngredient,
} from "@/features/pantry/types";
import { supabase } from "@/lib/supabase";

const recipeColumns =
  "id, user_id, titel, beskrivning, tid, kategori, is_favorite, created_at";

function createEmptyForm(): RecipeFormValues {
  return {
    titel: "",
    beskrivning: "",
    tid: "",
    kategori: "",
    ingredients: [{ ingrediens_namn: "", kvantitet: "", enhet: "" }],
  };
}

type RecipeRow = Omit<Recipe, "ingredients" | "is_favorited">;

export function RecipeView({
  userId,
  addRequest,
  onAddRequestHandled,
  onRecipeListChange,
  onSwitchForm,
}: {
  userId: string;
  addRequest: number;
  onAddRequestHandled: () => void;
  onRecipeListChange: () => void;
  onSwitchForm: (type: "product" | "recipe") => void;
}) {
  const { locale } = useLocale();
  const t = pantryTranslations[locale];
  const numberLocale = locale === "sv" ? "sv-SE" : "en-US";
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [operationError, setOperationError] = useState("");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [pendingDeleteRecipe, setPendingDeleteRecipe] = useState<Recipe | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [form, setForm] = useState<RecipeFormValues>(createEmptyForm);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [busyRecipeId, setBusyRecipeId] = useState<string | null>(null);
  const previousAddRequest = useRef(0);

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
        console.error("Failed to load recipes:", recipeError);
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

        if (ingredientResult.error) {
          console.error(
            "Failed to load recipe ingredients:",
            ingredientResult.error,
          );
          setLoadError(true);
          setRecipes([]);
          setIsLoading(false);
          return;
        }

        if (favoriteResult.error) {
          console.error(
            "Failed to load recipe favorites:",
            favoriteResult.error,
          );
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

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(numberLocale);

    return recipes.filter((recipe) => {
      if (favoritesOnly && !recipe.is_favorited) return false;
      if (!normalizedSearch) return true;

      return [
        recipe.titel,
        recipe.beskrivning,
        recipe.kategori,
        ...recipe.ingredients.map((ingredient) => ingredient.ingrediens_namn),
      ]
        .filter(Boolean)
        .some((value) =>
          value!.toLocaleLowerCase(numberLocale).includes(normalizedSearch),
        );
    });
  }, [favoritesOnly, numberLocale, recipes, search]);

  const openNewRecipe = useCallback(() => {
    setEditingRecipe(null);
    setForm(createEmptyForm());
    setFormError("");
    setOperationError("");
    setIsFormOpen(true);
  }, []);

  useEffect(() => {
    if (addRequest !== previousAddRequest.current) {
      previousAddRequest.current = addRequest;
      openNewRecipe();
      onAddRequestHandled();
    }
  }, [addRequest, onAddRequestHandled, openNewRecipe]);

  const openEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setForm({
      titel: recipe.titel,
      beskrivning: recipe.beskrivning ?? "",
      tid: recipe.tid == null ? "" : String(recipe.tid),
      kategori: recipe.kategori ?? "",
      ingredients:
        recipe.ingredients.length > 0
          ? recipe.ingredients.map((ingredient) => ({
              ingrediens_namn: ingredient.ingrediens_namn,
              kvantitet:
                ingredient.kvantitet == null
                  ? ""
                  : String(ingredient.kvantitet),
              enhet: ingredient.enhet ?? "",
            }))
          : [{ ingrediens_namn: "", kvantitet: "", enhet: "" }],
    });
    setFormError("");
    setOperationError("");
    setIsFormOpen(true);
  };

  const saveRecipe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setOperationError("");

    const time = form.tid.trim() ? Number(form.tid) : null;
    const hasInvalidTime =
      time !== null && (!Number.isInteger(time) || time <= 0);
    const hasInvalidIngredient = form.ingredients.some((ingredient) => {
      const hasAnyValue = Boolean(
        ingredient.ingrediens_namn.trim() ||
        ingredient.kvantitet.trim() ||
        ingredient.enhet.trim(),
      );
      if (!hasAnyValue) return false;
      if (!ingredient.ingrediens_namn.trim()) return true;
      if (!ingredient.kvantitet.trim()) return false;
      const quantity = Number(ingredient.kvantitet);
      return !Number.isFinite(quantity) || quantity <= 0;
    });

    if (!form.titel.trim() || hasInvalidTime || hasInvalidIngredient) {
      setFormError(t.recipeValidationError);
      return;
    }

    const ingredientValues = form.ingredients
      .filter((ingredient) => ingredient.ingrediens_namn.trim())
      .map((ingredient) => ({
        ingrediens_namn: ingredient.ingrediens_namn.trim(),
        kvantitet: ingredient.kvantitet.trim()
          ? Number(ingredient.kvantitet)
          : null,
        enhet: ingredient.enhet.trim() || null,
      }));
    const values = {
      titel: form.titel.trim(),
      beskrivning: form.beskrivning.trim() || null,
      tid: time,
      kategori: form.kategori.trim() || null,
    };

    setIsSaving(true);

    if (editingRecipe) {
      const { error: updateError } = await supabase
        .from("recept")
        .update(values)
        .eq("id", editingRecipe.id)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Failed to update recipe:", updateError);
        setOperationError(t.recipeUpdateError);
        setIsSaving(false);
        return;
      }

      const { error: deleteIngredientsError } = await supabase
        .from("recept_ingredienser")
        .delete()
        .eq("recept_id", editingRecipe.id);

      if (deleteIngredientsError) {
        console.error(
          "Failed to replace recipe ingredients:",
          deleteIngredientsError,
        );
        setOperationError(t.recipeUpdateError);
        setIsSaving(false);
        return;
      }

      if (ingredientValues.length > 0) {
        const { error: insertIngredientsError } = await supabase
          .from("recept_ingredienser")
          .insert(
            ingredientValues.map((ingredient) => ({
              ...ingredient,
              recept_id: editingRecipe.id,
            })),
          );

        if (insertIngredientsError) {
          console.error(
            "Failed to save recipe ingredients:",
            insertIngredientsError,
          );
          setOperationError(t.ingredientSaveError);
          setReloadToken((current) => current + 1);
          setIsSaving(false);
          return;
        }
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("recept")
        .insert({ ...values, user_id: userId })
        .select(recipeColumns)
        .single();

      if (insertError) {
        console.error("Failed to save recipe:", insertError);
        setOperationError(t.recipeSaveError);
        setIsSaving(false);
        return;
      }

      const createdRecipe = data as RecipeRow;
      onRecipeListChange();
      if (ingredientValues.length > 0) {
        const { error: insertIngredientsError } = await supabase
          .from("recept_ingredienser")
          .insert(
            ingredientValues.map((ingredient) => ({
              ...ingredient,
              recept_id: createdRecipe.id,
            })),
          );

        if (insertIngredientsError) {
          console.error(
            "Failed to save recipe ingredients:",
            insertIngredientsError,
          );
          setOperationError(t.ingredientSaveError);
          setReloadToken((current) => current + 1);
          setIsSaving(false);
          setIsFormOpen(false);
          return;
        }
      }
    }

    setIsSaving(false);
    setIsFormOpen(false);
    setReloadToken((current) => current + 1);
  };

  const toggleFavorite = async (recipe: Recipe) => {
    setBusyRecipeId(recipe.id);
    setOperationError("");

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
      console.error("Failed to update recipe favorite:", result.error);
      setOperationError(t.recipeFavoriteError);
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

    setBusyRecipeId(null);
  };

  const deleteRecipe = async (recipe: Recipe) => {
    setBusyRecipeId(recipe.id);
    setOperationError("");
    const { error } = await supabase
      .from("recept")
      .delete()
      .eq("id", recipe.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to delete recipe:", error);
      setOperationError(t.recipeDeleteError);
    } else {
      setRecipes((current) => current.filter((item) => item.id !== recipe.id));
      onRecipeListChange();
    }
    setBusyRecipeId(null);
  };

  const confirmDeleteRecipe = () => {
    if (!pendingDeleteRecipe) return;

    const recipe = pendingDeleteRecipe;
    setPendingDeleteRecipe(null);
    void deleteRecipe(recipe);
  };

  return (
    <>
      <section className="space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
              {t.recipes}
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {t.recipesTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-400">{t.recipesSubtitle}</p>
          </div>
        </header>

        {operationError ? (
          <div
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {operationError}
          </div>
        ) : null}

        <div className="space-y-3">
          <label className="relative block min-w-0">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <span className="sr-only">{t.searchRecipes}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.searchRecipes}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
            />
          </label>
          <div className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly((current) => !current)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                favoritesOnly
                  ? "bg-rose-300/15 text-rose-200"
                  : "bg-white/[0.06] text-slate-300 hover:bg-white/10"
              }`}
            >
              <Heart
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill={favoritesOnly ? "currentColor" : "none"}
              />
              {favoritesOnly ? t.allRecipes : t.favoriteRecipes}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-12 text-center text-sm text-slate-400">
            {t.loading}
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-8 text-center"
          >
            <p className="text-sm text-red-200">{t.recipeLoadError}</p>
            <button
              type="button"
              onClick={() => setReloadToken((current) => current + 1)}
              className="mt-3 text-sm font-semibold text-red-100 underline underline-offset-4"
            >
              {t.retry}
            </button>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-12 text-center">
            <p className="font-medium text-white">
              {recipes.length === 0 && !favoritesOnly && !search
                ? t.noRecipes
                : t.noMatchingRecipes}
            </p>
            {recipes.length === 0 && !favoritesOnly && !search ? (
              <p className="mt-2 text-sm text-slate-400">
                {t.noRecipesDescription}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRecipes.map((recipe) => {
              const isOwner = recipe.user_id === userId;
              const isBusy = busyRecipeId === recipe.id;
              const isExpanded = expandedRecipeId === recipe.id;
              const detailsId = `recipe-details-${recipe.id}`;

              return (
                <article
                  key={recipe.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={detailsId}
                      onClick={() =>
                        setExpandedRecipeId((current) =>
                          current === recipe.id ? null : recipe.id,
                        )
                      }
                      className="group flex min-w-0 flex-1 items-start justify-between gap-2 rounded-lg text-left"
                    >
                      <span className="min-w-0">
                        <span className="block break-words text-lg font-semibold text-white">
                          {recipe.titel}
                        </span>
                        {recipe.kategori ? (
                          <span className="mt-1 block text-xs font-medium text-emerald-300">
                            {recipe.kategori}
                          </span>
                        ) : null}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-white ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      aria-label={
                        recipe.is_favorited
                          ? t.unfavoriteRecipe
                          : t.favoriteRecipe
                      }
                      disabled={isBusy}
                      onClick={() => void toggleFavorite(recipe)}
                      className="rounded-lg p-2 text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-50"
                    >
                      <Heart
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill={recipe.is_favorited ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  <div id={detailsId} hidden={!isExpanded}>
                    {recipe.beskrivning ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {recipe.beskrivning}
                      </p>
                    ) : null}

                    {recipe.tid ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                        {recipe.tid} {t.minutes}
                      </p>
                    ) : null}

                    {recipe.ingredients.length > 0 ? (
                      <div className="mt-4 border-t border-white/10 pt-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {t.ingredients}
                        </h4>
                        <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
                          {recipe.ingredients.map((ingredient) => (
                            <li key={ingredient.id}>
                              {ingredient.kvantitet != null
                                ? `${ingredient.kvantitet}${ingredient.enhet ? ` ${ingredient.enhet}` : ""} `
                                : ""}
                              {ingredient.ingrediens_namn}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {isOwner ? (
                      <div className="mt-4 flex justify-end gap-2 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => openEditRecipe(recipe)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
                        >
                          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                          {t.edit}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setPendingDeleteRecipe(recipe)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          {t.deleteRecipe}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <RecipeForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingRecipe={editingRecipe}
        form={form}
        setForm={setForm}
        formError={formError}
        operationError={operationError}
        isSaving={isSaving}
        t={t}
        onSwitchForm={onSwitchForm}
        onSubmit={(event) => void saveRecipe(event)}
      />
      <AlertDialog.Root
        open={pendingDeleteRecipe !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteRecipe(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <AlertDialog.Popup className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none transition-[opacity,transform] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
              <AlertDialog.Title className="text-lg font-semibold">
                {t.deleteRecipe}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {t.deleteRecipeConfirm}
              </AlertDialog.Description>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingDeleteRecipe(null)}
                >
                  {t.cancel}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmDeleteRecipe}
                >
                  {t.deleteRecipe}
                </Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
