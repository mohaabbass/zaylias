"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  CircleAlert,
  CircleX,
  Filter,
  Heart,
  ImageIcon,
  LayoutGrid,
  List,
  Pencil,
  Rows3,
  Search,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";

import { useLocale } from "@/components/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { AddToListButton } from "@/features/pantry/components/AddToListButton";
import { RecipeForm } from "@/features/pantry/components/RecipeForm";
import { pantryTranslations } from "@/features/pantry/i18n";
import type {
  Recipe,
  RecipeFormValues,
  RecipeIngredient,
  RecipeMainIngredientFilter,
  PantryProduct,
} from "@/features/pantry/types";
import { recipeMainIngredientValues } from "@/features/pantry/types";
import { compressProductImage } from "@/features/pantry/utils";
import { supabase } from "@/lib/supabase";

const recipeColumns =
  "id, user_id, titel, beskrivning, tid, kategori, main_ingredient, bild_url, is_favorite, created_at";
const recipeImageBucket = "recipe-images";
const maxRecipeImageSize = 5 * 1024 * 1024;
const recipeImageExtensions: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function createEmptyForm(defaultCategory: string): RecipeFormValues {
  return {
    titel: "",
    beskrivning: "",
    tid: "",
    kategori: defaultCategory,
    main_ingredient: "",
    ingredients: [{ ingrediens_namn: "", kvantitet: "", enhet: "" }],
  };
}

function getRecipeImagePath(imageUrl: string, userId: string) {
  try {
    const url = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${recipeImageBucket}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    const path = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    return path.startsWith(`${userId}/`) ? path : null;
  } catch {
    return null;
  }
}

type RecipeRow = Omit<Recipe, "ingredients" | "is_favorited">;

type IngredientAvailability =
  | { status: "enough" | "inPantry" | "low" | "missing" }
  | { status: "partial"; missingQuantity: number; unitFactor: number };

type RecipeAvailabilityFilter = "all" | "ready" | "partial" | "missing";
type RecipeImageDisplay = "large" | "small" | "none";

function normalizeIngredientName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getUnitInfo(unit: string | null) {
  const normalized = (unit ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  if (["g", "gram", "grams"].includes(normalized)) {
    return { dimension: "mass", factor: 1 };
  }
  if (["kg", "kilogram", "kilograms"].includes(normalized)) {
    return { dimension: "mass", factor: 1000 };
  }
  if (["mg", "milligram", "milligrams"].includes(normalized)) {
    return { dimension: "mass", factor: 0.001 };
  }
  if (
    ["ml", "milliliter", "milliliters", "millilitre", "millilitres"].includes(
      normalized,
    )
  ) {
    return { dimension: "volume", factor: 1 };
  }
  if (
    ["cl", "centiliter", "centiliters", "centilitre", "centilitres"].includes(
      normalized,
    )
  ) {
    return { dimension: "volume", factor: 10 };
  }
  if (
    ["dl", "deciliter", "deciliters", "decilitre", "decilitres"].includes(
      normalized,
    )
  ) {
    return { dimension: "volume", factor: 100 };
  }
  if (["l", "liter", "liters", "litre", "litres"].includes(normalized)) {
    return { dimension: "volume", factor: 1000 };
  }
  if (
    [
      "st",
      "styck",
      "stycken",
      "pcs",
      "pc",
      "piece",
      "pieces",
      "unit",
      "units",
      "ea",
      "stk",
    ].includes(normalized)
  ) {
    return { dimension: "count", factor: 1 };
  }

  return {
    dimension: normalized ? `custom:${normalized}` : "unitless",
    factor: 1,
  };
}

function getRemainingPercent(product: PantryProduct) {
  const storedRemaining = Number(product.remaining_percent ?? 100);
  return Number.isFinite(storedRemaining)
    ? Math.max(0, Math.min(100, storedRemaining))
    : 100;
}

function getAvailableProductQuantity(product: PantryProduct) {
  if (product.kvantitet == null) return null;

  const quantity = Number(product.kvantitet);
  if (!Number.isFinite(quantity) || quantity < 0) return null;

  return quantity * (getRemainingPercent(product) / 100);
}

function getIngredientAvailability(
  ingredient: RecipeIngredient,
  products: PantryProduct[],
): IngredientAvailability {
  const ingredientName = normalizeIngredientName(ingredient.ingrediens_namn);
  const matches = products.filter(
    (product) =>
      product.status === "i_lager" &&
      normalizeIngredientName(product.namn) === ingredientName,
  );

  if (matches.length === 0) return { status: "missing" };

  const requiredQuantity =
    ingredient.kvantitet == null ? null : Number(ingredient.kvantitet);
  if (
    requiredQuantity == null ||
    !Number.isFinite(requiredQuantity) ||
    requiredQuantity < 0
  ) {
    return matches.some((product) => {
      const quantity = getAvailableProductQuantity(product);
      return quantity === null || quantity > 0;
    })
      ? { status: "inPantry" }
      : { status: "missing" };
  }

  const recipeUnit = getUnitInfo(ingredient.enhet);
  let comparableProductFound = false;
  let availableQuantity = 0;

  for (const product of matches) {
    const quantity = getAvailableProductQuantity(product);
    if (quantity === null) {
      continue;
    }

    const productUnit = getUnitInfo(product.enhet);
    if (recipeUnit.dimension === productUnit.dimension) {
      comparableProductFound = true;
      availableQuantity += quantity * productUnit.factor;
    }
  }

  const requiredInBaseUnits = requiredQuantity * recipeUnit.factor;
  if (comparableProductFound) {
    if (availableQuantity >= requiredInBaseUnits) {
      return { status: "enough" };
    }
    if (availableQuantity > 0) {
      return {
        status: "partial",
        missingQuantity: requiredInBaseUnits - availableQuantity,
        unitFactor: recipeUnit.factor,
      };
    }
    return { status: "missing" };
  }

  const remainingPercentages = matches.map(getRemainingPercent);
  if (remainingPercentages.some((remaining) => remaining >= 50)) {
    return { status: "inPantry" };
  }
  if (remainingPercentages.some((remaining) => remaining > 0)) {
    return { status: "low" };
  }

  return { status: "missing" };
}

function getRecipeAvailabilitySummary(
  recipe: Recipe,
  products: PantryProduct[],
) {
  const ingredientAvailability = recipe.ingredients.map((ingredient) =>
    getIngredientAvailability(ingredient, products),
  );
  const readyIngredientCount = ingredientAvailability.filter(
    ({ status }) => status === "enough" || status === "inPantry",
  ).length;
  const hasAnyIngredient = ingredientAvailability.some(
    ({ status }) => status !== "missing",
  );

  const status =
    recipe.ingredients.length === 0
      ? "noIngredients"
      : readyIngredientCount === recipe.ingredients.length
        ? "ready"
        : hasAnyIngredient
          ? "partial"
          : "missing";

  return { status, readyIngredientCount, hasAnyIngredient };
}

export function RecipeView({
  userId,
  products,
  isPantryLoading,
  pantryLoadError,
  addRequest,
  onAddRequestHandled,
  onRecipeListChange,
  onOpenLists,
  onSwitchForm,
}: {
  userId: string;
  products: PantryProduct[];
  isPantryLoading: boolean;
  pantryLoadError: boolean;
  addRequest: number;
  onAddRequestHandled: () => void;
  onRecipeListChange: () => void;
  onOpenLists: () => void;
  onSwitchForm: (type: "product" | "recipe") => void;
}) {
  const { locale } = useLocale();
  const t = pantryTranslations[locale];
  const defaultCategory = locale === "sv" ? "Övrigt" : "Other";
  const numberLocale = locale === "sv" ? "sv-SE" : "en-US";
  const isAvailabilityKnown = !isPantryLoading && !pantryLoadError;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [operationError, setOperationError] = useState("");
  const [search, setSearch] = useState("");
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMainIngredient, setSelectedMainIngredient] =
    useState<RecipeMainIngredientFilter | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [availabilityFilter, setAvailabilityFilter] =
    useState<RecipeAvailabilityFilter>("all");
  const [recipeImageDisplay, setRecipeImageDisplay] =
    useState<RecipeImageDisplay>("large");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [openAvailabilityId, setOpenAvailabilityId] = useState<string | null>(
    null,
  );
  const [pendingDeleteRecipe, setPendingDeleteRecipe] = useState<Recipe | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [form, setForm] = useState<RecipeFormValues>(() =>
    createEmptyForm(defaultCategory),
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
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

  const recipeCategories = useMemo(
    () =>
      [
        ...new Set(
          recipes
            .map((recipe) => recipe.kategori?.trim() ?? "")
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, numberLocale)),
    [numberLocale, recipes],
  );
  const availableMainIngredientFilters = useMemo(
    () =>
      recipeMainIngredientValues.filter((value) =>
        recipes.some((recipe) => recipe.main_ingredient === value),
      ),
    [recipes],
  );

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(numberLocale);

    return recipes.filter((recipe) => {
      if (selectedCategory && recipe.kategori?.trim() !== selectedCategory) {
        return false;
      }
      if (selectedMainIngredient && recipe.main_ingredient !== selectedMainIngredient) {
        return false;
      }
      if (favoritesOnly && !recipe.is_favorited) return false;
      if (
        availabilityFilter !== "all" &&
        isAvailabilityKnown &&
        getRecipeAvailabilitySummary(recipe, products).status !==
          availabilityFilter
      ) {
        return false;
      }
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
  }, [
    availabilityFilter,
    favoritesOnly,
    isAvailabilityKnown,
    numberLocale,
    products,
    recipes,
    search,
    selectedCategory,
    selectedMainIngredient,
  ]);
  const selectedRecipe =
    recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null;
  const displayedRecipes = selectedRecipe ? [selectedRecipe] : filteredRecipes;

  const openNewRecipe = useCallback(() => {
    setEditingRecipe(null);
    setForm(createEmptyForm(defaultCategory));
    setSelectedImage(null);
    setFormError("");
    setOperationError("");
    setIsFormOpen(true);
  }, [defaultCategory]);

  useEffect(() => {
    if (addRequest !== previousAddRequest.current) {
      previousAddRequest.current = addRequest;
      openNewRecipe();
      onAddRequestHandled();
    }
  }, [addRequest, onAddRequestHandled, openNewRecipe]);

  const openEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setSelectedImage(null);
    setForm({
      titel: recipe.titel,
      beskrivning: recipe.beskrivning ?? "",
      tid: recipe.tid == null ? "" : String(recipe.tid),
      kategori: recipe.kategori?.trim() || defaultCategory,
      main_ingredient: recipe.main_ingredient,
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
    const mainIngredient = form.main_ingredient;
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
    if (!mainIngredient) {
      setFormError(t.mainIngredientRequired);
      return;
    }
    if (!selectedImage && !editingRecipe?.bild_url) {
      setFormError(t.recipeImageRequired);
      return;
    }
    if (
      selectedImage &&
      (!recipeImageExtensions[selectedImage.type] ||
        selectedImage.size > maxRecipeImageSize)
    ) {
      setFormError(t.imageInvalid);
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
    setIsSaving(true);

    let uploadedImagePath: string | null = null;
    let imageUrl = editingRecipe?.bild_url ?? null;
    if (selectedImage) {
      let uploadImage: Blob;
      try {
        uploadImage = await compressProductImage(selectedImage);
      } catch (error) {
        console.error("Failed to compress recipe image:", error);
        setOperationError(t.imageUploadError);
        setIsSaving(false);
        return;
      }

      const extension = recipeImageExtensions[uploadImage.type];
      if (!extension) {
        console.error(
          "Recipe image compression returned an unsupported image type:",
          uploadImage.type,
        );
        setOperationError(t.imageUploadError);
        setIsSaving(false);
        return;
      }

      uploadedImagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(recipeImageBucket)
        .upload(uploadedImagePath, uploadImage, {
          contentType: uploadImage.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Failed to upload recipe image:", uploadError);
        setOperationError(t.imageUploadError);
        setIsSaving(false);
        return;
      }

      imageUrl = supabase.storage
        .from(recipeImageBucket)
        .getPublicUrl(uploadedImagePath).data.publicUrl;
    }

    const values = {
      titel: form.titel.trim(),
      beskrivning: form.beskrivning.trim() || null,
      tid: time,
      kategori: form.kategori.trim() || defaultCategory,
      main_ingredient: mainIngredient,
      bild_url: imageUrl,
    };

    if (editingRecipe) {
      const { error: updateError } = await supabase
        .from("recept")
        .update(values)
        .eq("id", editingRecipe.id)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Failed to update recipe:", updateError);
        if (uploadedImagePath) {
          const { error: cleanupError } = await supabase.storage
            .from(recipeImageBucket)
            .remove([uploadedImagePath]);
          if (cleanupError) {
            console.error("Failed to clean up uploaded recipe image:", cleanupError);
          }
        }
        setOperationError(t.recipeUpdateError);
        setIsSaving(false);
        return;
      }

      if (selectedImage && editingRecipe.bild_url) {
        const oldImagePath = getRecipeImagePath(editingRecipe.bild_url, userId);
        if (oldImagePath) {
          const { error: cleanupError } = await supabase.storage
            .from(recipeImageBucket)
            .remove([oldImagePath]);
          if (cleanupError) {
            console.error(
              "Failed to remove replaced recipe image:",
              cleanupError,
            );
          }
        }
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
        if (uploadedImagePath) {
          const { error: cleanupError } = await supabase.storage
            .from(recipeImageBucket)
            .remove([uploadedImagePath]);
          if (cleanupError) {
            console.error("Failed to clean up uploaded recipe image:", cleanupError);
          }
        }
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
    setSelectedImage(null);
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
      if (selectedRecipeId === recipe.id) setSelectedRecipeId(null);
      onRecipeListChange();
      const imagePath = getRecipeImagePath(recipe.bild_url ?? "", userId);
      if (imagePath) {
        const { error: imageDeleteError } = await supabase.storage
          .from(recipeImageBucket)
          .remove([imagePath]);
        if (imageDeleteError) {
          console.error("Failed to remove deleted recipe image:", imageDeleteError);
        }
      }
    }
    setBusyRecipeId(null);
  };

  const confirmDeleteRecipe = () => {
    if (!pendingDeleteRecipe) return;

    const recipe = pendingDeleteRecipe;
    setPendingDeleteRecipe(null);
    void deleteRecipe(recipe);
  };

  const availabilityFilters: {
    value: Exclude<RecipeAvailabilityFilter, "all">;
    label: string;
    activeClass: string;
  }[] = [
    {
      value: "ready",
      label: t.recipesReadyToMake,
      activeClass: "bg-emerald-300/15 text-emerald-200",
    },
    {
      value: "partial",
      label: t.recipesMissingParts,
      activeClass: "bg-amber-300/15 text-amber-200",
    },
    {
      value: "missing",
      label: t.recipesMissingEverything,
      activeClass: "bg-rose-300/15 text-rose-200",
    },
  ];
  const mainIngredientFilterLabels: Record<
    RecipeMainIngredientFilter,
    string
  > = {
    chicken: t.recipeMainIngredientChicken,
    meat: t.recipeMainIngredientMeat,
    minced_meat: t.recipeMainIngredientMincedMeat,
    sausage: t.recipeMainIngredientSausage,
    shrimp: t.recipeMainIngredientShrimp,
    fish: t.recipeMainIngredientFish,
    vegetarian: t.recipeMainIngredientVegetarian,
    other: t.recipeMainIngredientOther,
  };
  const activeRecipeFilterCount =
    Number(selectedCategory !== null) +
    Number(selectedMainIngredient !== null);
  const recipeImageDisplayOptions = [
    { value: "large", label: t.recipeImageDisplayLarge, Icon: LayoutGrid },
    { value: "small", label: t.recipeImageDisplaySmall, Icon: Rows3 },
    { value: "none", label: t.recipeImageDisplayNone, Icon: List },
  ] as const;

  return (
    <>
      <section className="space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            {selectedRecipe ? (
              <button
                type="button"
                onClick={() => setSelectedRecipeId(null)}
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/15"
              >
                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                {t.backToRecipes}
              </button>
            ) : (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
                <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
                {t.recipes}
              </div>
            )}
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {selectedRecipe?.titel ?? t.recipesTitle}
            </h2>
            {!selectedRecipe ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t.recipesSubtitle}
              </p>
            ) : null}
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

        {!selectedRecipe ? (
          <>
            <div className="space-y-3">
          <div>
            <label className="relative block min-w-0">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <span className="sr-only">{t.searchRecipes}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.searchRecipes}
                className="h-11 w-full rounded-xl border border-border bg-muted pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60"
              />
            </label>
          </div>
          {areFiltersOpen ? (
            <div
              id="recipe-filters"
              className="space-y-4 rounded-xl border border-border bg-muted p-4"
            >
              <div className="flex flex-col gap-2 sm:max-w-xs">
                <label
                  htmlFor="recipe-category-filter"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t.filterCategory}
                </label>
                <select
                  id="recipe-category-filter"
                  value={selectedCategory ?? ""}
                  onChange={(event) =>
                    setSelectedCategory(event.target.value || null)
                  }
                  className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-emerald-400/60"
                >
                  <option value="">{t.allRecipeCategories}</option>
                  {recipeCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              {availableMainIngredientFilters.length > 0 ? (
                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium text-muted-foreground">
                    {t.mainIngredient}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {availableMainIngredientFilters.map((mainIngredient) => (
                      <button
                        key={mainIngredient}
                        type="button"
                        aria-pressed={selectedMainIngredient === mainIngredient}
                        onClick={() =>
                          setSelectedMainIngredient((current) =>
                            current === mainIngredient ? null : mainIngredient,
                          )
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          selectedMainIngredient === mainIngredient
                            ? "bg-emerald-300/15 text-emerald-200"
                            : "bg-muted text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {mainIngredientFilterLabels[mainIngredient]}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              {activeRecipeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedMainIngredient(null);
                  }}
                  className="text-xs font-medium text-emerald-200 underline underline-offset-4"
                >
                  {t.clearRecipeFilters}
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly((current) => !current)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                favoritesOnly
                  ? "bg-rose-300/15 text-rose-200"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }`}
            >
              <Heart
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill={favoritesOnly ? "currentColor" : "none"}
              />
              {favoritesOnly ? t.allRecipes : t.favoriteRecipes}
            </button>
            {availabilityFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={
                  isAvailabilityKnown && availabilityFilter === filter.value
                }
                disabled={isPantryLoading || pantryLoadError}
                onClick={() =>
                  setAvailabilityFilter((current) =>
                    current === filter.value ? "all" : filter.value,
                  )
                }
                className={`inline-flex shrink-0 items-center rounded-full px-3.5 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isAvailabilityKnown && availabilityFilter === filter.value
                    ? filter.activeClass
                    : "bg-muted text-muted-foreground hover:bg-muted"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
            </div>

            <div className="flex items-center justify-between">
          <div
            role="group"
            aria-label={t.recipeImageDisplay}
            className="inline-flex rounded-lg border border-border bg-muted p-1"
          >
            {recipeImageDisplayOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={recipeImageDisplay === value}
                title={label}
                onClick={() => setRecipeImageDisplay(value)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition ${
                  recipeImageDisplay === value
                    ? "bg-emerald-300/15 text-emerald-200"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label={t.filters}
            aria-controls="recipe-filters"
            aria-expanded={areFiltersOpen}
            onClick={() => setAreFiltersOpen((current) => !current)}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm transition ${
              areFiltersOpen || activeRecipeFilterCount > 0
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                : "border-border bg-muted text-muted-foreground hover:bg-muted"
            }`}
          >
            <Filter aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">{t.filters}</span>
            {activeRecipeFilterCount > 0 ? (
              <span className="text-xs">{activeRecipeFilterCount}</span>
            ) : null}
          </button>
        </div>
          </>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-border bg-muted px-5 py-12 text-center text-sm text-muted-foreground">
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
        ) : displayedRecipes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted px-5 py-12 text-center">
            <p className="font-medium text-foreground">
              {recipes.length === 0 &&
              !favoritesOnly &&
              availabilityFilter === "all" &&
              !search &&
              selectedCategory === null &&
              selectedMainIngredient === null
                ? t.noRecipes
                : t.noMatchingRecipes}
            </p>
            {recipes.length === 0 &&
            !favoritesOnly &&
            availabilityFilter === "all" &&
            !search &&
            selectedCategory === null &&
            selectedMainIngredient === null ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t.noRecipesDescription}
              </p>
            ) : null}
          </div>
        ) : (
          <div
            className={
              selectedRecipe
                ? "w-full"
                : recipeImageDisplay === "large"
                  ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  : "space-y-3"
            }
          >
            {displayedRecipes.map((recipe) => {
              const isOwner = recipe.user_id === userId;
              const isBusy = busyRecipeId === recipe.id;
              const isDetailView = selectedRecipe?.id === recipe.id;
              const detailsId = `recipe-details-${recipe.id}`;
              const availabilitySummary = getRecipeAvailabilitySummary(
                recipe,
                products,
              );
              const isRecipeReady = availabilitySummary.status === "ready";
              const isAvailabilityPartial =
                availabilitySummary.status === "partial";
              const RecipeAvailabilityIcon = !isAvailabilityKnown
                ? CircleAlert
                : isRecipeReady
                  ? Check
                  : isAvailabilityPartial
                    ? CircleAlert
                    : CircleX;
              const availableIngredientCount = recipe.ingredients.filter(
                (ingredient) =>
                  getIngredientAvailability(ingredient, products).status !==
                  "missing",
              ).length;
              const availabilityLabel = isAvailabilityKnown
                ? isRecipeReady
                  ? t.recipeReady(
                      availableIngredientCount,
                      recipe.ingredients.length,
                    )
                  : isAvailabilityPartial
                    ? t.recipeIngredientsIncomplete(
                        availableIngredientCount,
                        recipe.ingredients.length,
                      )
                    : t.recipeNoIngredientsAvailable(recipe.ingredients.length)
                : pantryLoadError
                  ? t.pantryAvailabilityError
                  : t.checkingAvailability;
              const availabilityClass = isAvailabilityKnown
                ? isRecipeReady
                  ? "text-emerald-300"
                  : isAvailabilityPartial
                    ? "text-amber-300"
                    : "text-rose-300"
                : "text-muted-foreground";

              return (
                <article
                  key={recipe.id}
                  className={`rounded-2xl border border-border bg-muted p-4 ${
                    isDetailView
                      ? "mx-auto w-full max-w-3xl"
                      : recipeImageDisplay === "large"
                        ? ""
                        : "flex items-start gap-3"
                  }`}
                >
                  {(isDetailView || recipeImageDisplay === "large") &&
                  recipe.bild_url ? (
                    isDetailView ? (
                      <Image
                        unoptimized
                        src={recipe.bild_url}
                        alt={recipe.titel}
                        width={960}
                        height={540}
                        className="mb-4 aspect-video w-full rounded-xl object-cover"
                      />
                    ) : (
                      <button
                        type="button"
                        aria-label={recipe.titel}
                        onClick={() => setSelectedRecipeId(recipe.id)}
                        className="mb-4 block w-full rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <Image
                          unoptimized
                          src={recipe.bild_url}
                          alt=""
                          width={640}
                          height={360}
                          className="aspect-video w-full rounded-xl object-cover"
                        />
                      </button>
                    )
                  ) : isDetailView || recipeImageDisplay === "large" ? (
                    isDetailView ? (
                      <div className="mb-4 flex aspect-video items-center justify-center gap-2 rounded-xl border border-border bg-muted text-sm text-muted-foreground">
                        <ImageIcon aria-hidden="true" className="h-4 w-4" />
                        {t.recipeImageMissing}
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={recipe.titel}
                        onClick={() => setSelectedRecipeId(recipe.id)}
                        className="mb-4 flex aspect-video w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted text-sm text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <ImageIcon aria-hidden="true" className="h-4 w-4" />
                        {t.recipeImageMissing}
                      </button>
                    )
                  ) : null}
                  {!isDetailView && recipeImageDisplay === "small" ? (
                    recipe.bild_url ? (
                      <button
                        type="button"
                        aria-label={recipe.titel}
                        onClick={() => setSelectedRecipeId(recipe.id)}
                        className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <Image
                          unoptimized
                          src={recipe.bild_url}
                          alt=""
                          width={128}
                          height={128}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={recipe.titel}
                        onClick={() => setSelectedRecipeId(recipe.id)}
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <ImageIcon aria-hidden="true" className="h-4 w-4" />
                      </button>
                    )
                  ) : null}
                  <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    {isDetailView ? (
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-lg font-semibold text-foreground">
                          {recipe.titel}
                        </h3>
                        {recipe.kategori ? (
                          <span className="mt-1 block text-xs font-medium text-emerald-300">
                            {recipe.kategori}
                          </span>
                        ) : null}
                        {recipe.ingredients.length > 0 ? (
                          <span
                            aria-live="polite"
                            className={`mt-2 inline-flex max-w-full items-start gap-1.5 text-xs font-medium ${availabilityClass}`}
                          >
                            <RecipeAvailabilityIcon
                              aria-hidden="true"
                              className="mt-0.5 h-3.5 w-3.5 shrink-0"
                              strokeWidth={2.5}
                            />
                            <span className="break-words">
                              {availabilityLabel}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedRecipeId(recipe.id)}
                        className="flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                      <span className="min-w-0">
                        <span className="block break-words text-lg font-semibold text-foreground">
                          {recipe.titel}
                        </span>
                        {recipe.kategori ? (
                          <span className="mt-1 block text-xs font-medium text-emerald-300">
                            {recipe.kategori}
                          </span>
                        ) : null}
                        {recipe.ingredients.length > 0 ? (
                          <span
                            aria-live="polite"
                            className={`mt-2 inline-flex max-w-full items-start gap-1.5 text-xs font-medium ${availabilityClass}`}
                          >
                            <RecipeAvailabilityIcon
                              aria-hidden="true"
                              className="mt-0.5 h-3.5 w-3.5 shrink-0"
                              strokeWidth={2.5}
                            />
                            <span className="break-words">
                              {availabilityLabel}
                            </span>
                          </span>
                        ) : null}
                      </span>
                      </button>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      <AddToListButton
                        userId={userId}
                        itemId={recipe.id}
                        itemName={recipe.titel}
                        source="recipe_id"
                        t={t}
                        onOpenLists={onOpenLists}
                      />
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
                  </div>

                  <div id={detailsId} hidden={!isDetailView}>
                    {recipe.beskrivning ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {recipe.beskrivning}
                      </p>
                    ) : null}

                    {recipe.tid ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                        {recipe.tid} {t.minutes}
                      </p>
                    ) : null}

                    {recipe.ingredients.length > 0 ? (
                      <div className="mt-4 border-t border-border pt-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t.ingredients}
                        </h4>
                        {!isPantryLoading && !pantryLoadError ? (
                          <p
                            aria-live="polite"
                            className="mt-2 text-xs text-muted-foreground"
                          >
                            {t.recipeIngredientsMatched(
                              recipe.ingredients.filter(
                                (ingredient) =>
                                  getIngredientAvailability(
                                    ingredient,
                                    products,
                                  ).status !== "missing",
                              ).length,
                              recipe.ingredients.length,
                            )}
                          </p>
                        ) : null}
                        {pantryLoadError ? (
                          <p
                            role="status"
                            className="mt-2 text-xs text-amber-200"
                          >
                            {t.pantryAvailabilityError}
                          </p>
                        ) : null}
                        <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                          {recipe.ingredients.map((ingredient) => {
                            const availability =
                              isPantryLoading || pantryLoadError
                                ? null
                                : getIngredientAvailability(
                                    ingredient,
                                    products,
                                  );
                            const statusLabel =
                              availability?.status === "enough"
                                ? t.ingredientEnough
                                : availability?.status === "inPantry"
                                  ? t.ingredientInPantry
                                  : availability?.status === "partial"
                                    ? t.ingredientNotEnough
                                    : availability?.status === "missing"
                                      ? t.ingredientMissing
                                      : "";
                            const statusClass =
                              availability?.status === "enough" ||
                              availability?.status === "inPantry"
                                ? "text-emerald-300"
                                : availability?.status === "partial" ||
                                    availability?.status === "low"
                                  ? "text-amber-300"
                                  : availability?.status === "missing"
                                    ? "text-rose-300"
                                    : "text-muted-foreground";
                            const StatusIcon =
                              availability?.status === "partial"
                                ? CircleAlert
                                : availability?.status === "missing"
                                  ? CircleX
                                  : availability?.status === "low"
                                    ? CircleAlert
                                    : Check;
                            const shortage =
                              availability?.status === "partial"
                                ? t.ingredientNeedMore(
                                    new Intl.NumberFormat(numberLocale, {
                                      maximumFractionDigits: 2,
                                    }).format(
                                      availability.missingQuantity /
                                        availability.unitFactor,
                                    ),
                                    ingredient.enhet ?? "",
                                  )
                                : null;
                            const tooltip = shortage
                              ? `${statusLabel}: ${shortage}`
                              : availability?.status === "low"
                                ? t.ingredientLowStock
                                : statusLabel;

                            return (
                              <li
                                key={ingredient.id}
                                className="relative flex items-start justify-between gap-2"
                              >
                                <span className="min-w-0 break-words">
                                  {ingredient.kvantitet != null
                                    ? `${ingredient.kvantitet}${ingredient.enhet ? ` ${ingredient.enhet}` : ""} `
                                    : ""}
                                  {ingredient.ingrediens_namn}
                                </span>
                                {pantryLoadError || !availability ? null : (
                                  <span className="group relative mt-0.5 inline-flex shrink-0">
                                    <button
                                      type="button"
                                      aria-label={tooltip}
                                      aria-expanded={
                                        openAvailabilityId ===
                                        `ingredient-${ingredient.id}`
                                      }
                                      aria-describedby={`ingredient-status-${ingredient.id}`}
                                      title={tooltip}
                                      onClick={() =>
                                        setOpenAvailabilityId((current) =>
                                          current ===
                                          `ingredient-${ingredient.id}`
                                            ? null
                                            : `ingredient-${ingredient.id}`,
                                        )
                                      }
                                      className={`inline-flex rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${statusClass}`}
                                    >
                                      <StatusIcon
                                        aria-hidden="true"
                                        className="h-4 w-4"
                                      />
                                    </button>
                                    <span
                                      id={`ingredient-status-${ingredient.id}`}
                                      role="tooltip"
                                      className={`absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground shadow-lg transition-opacity ${
                                        openAvailabilityId ===
                                        `ingredient-${ingredient.id}`
                                          ? "visible opacity-100"
                                          : "invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                                      }`}
                                    >
                                      {tooltip}
                                    </span>
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}

                    {isOwner ? (
                      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => openEditRecipe(recipe)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
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
        imageUrl={editingRecipe?.bild_url ?? null}
        selectedImage={selectedImage}
        onImageChange={(file) => {
          setFormError("");
          if (
            file &&
            (!recipeImageExtensions[file.type] || file.size > maxRecipeImageSize)
          ) {
            setSelectedImage(null);
            setFormError(t.imageInvalid);
            return;
          }
          setSelectedImage(file);
        }}
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
