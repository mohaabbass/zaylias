import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { PantryAddTypeTabs } from "@/features/pantry/components/PantryAddTypeTabs";
import type { PantryTranslation } from "@/features/pantry/i18n";
import {
  isRecipeMainIngredient,
  type ProductCatalogEntry,
  type Recipe,
  type RecipeFormValues,
} from "@/features/pantry/types";
import { supabase } from "@/lib/supabase";

type IngredientNameInputProps = {
  id: string;
  value: string;
  placeholder: string;
  suggestionsLabel: string;
  loadingLabel: string;
  errorLabel: string;
  onChange: (value: string) => void;
};

function IngredientNameInput({
  id,
  value,
  placeholder,
  suggestionsLabel,
  loadingLabel,
  errorLabel,
  onChange,
}: IngredientNameInputProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<ProductCatalogEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const listboxId = `${id}-options`;
  const isDropdownVisible =
    isDropdownOpen &&
    value.trim().length >= 2 &&
    searchQuery === value.trim() &&
    (isSearching || suggestions.length > 0 || Boolean(searchError));

  useEffect(() => {
    const query = value.trim();
    if (!isDropdownOpen || query.length < 2) return;

    let isCurrent = true;
    const timeout = window.setTimeout(() => {
      const searchCatalog = async () => {
        setSearchQuery(query);
        setSuggestions([]);
        setIsSearching(true);
        setSearchError("");

        const { data, error } = await supabase
          .from("produkt_katalog")
          .select("catalog_id, streckkod, namn, brand, image_url, kategori")
          .ilike("namn", `%${query}%`)
          .order("namn")
          .limit(8);

        if (!isCurrent) return;

        if (error) {
          console.error("Failed to search product catalog for recipe ingredient:", error);
          setSuggestions([]);
          setSearchError(errorLabel);
        } else {
          setSuggestions(data ?? []);
        }
        setIsSearching(false);
      };

      void searchCatalog();
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [errorLabel, isDropdownOpen, value]);

  const selectSuggestion = (product: ProductCatalogEntry) => {
    onChange(product.namn);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative min-w-0">
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isDropdownVisible}
        aria-controls={listboxId}
        aria-activedescendant={
          isDropdownVisible && suggestions.length > 0
            ? `${listboxId}-${suggestions[Math.min(activeIndex, suggestions.length - 1)].catalog_id}`
            : undefined
        }
        value={value}
        onChange={(event) => {
          setIsDropdownOpen(true);
          setActiveIndex(0);
          onChange(event.target.value);
        }}
        onFocus={() => setIsDropdownOpen(true)}
        onBlur={() => setIsDropdownOpen(false)}
        onKeyDown={(event) => {
          if (!isDropdownVisible || suggestions.length === 0) {
            if (event.key === "Escape") setIsDropdownOpen(false);
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) =>
              index >= suggestions.length - 1 ? 0 : index + 1,
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) =>
              index <= 0 ? suggestions.length - 1 : index - 1,
            );
          } else if (event.key === "Enter") {
            event.preventDefault();
            selectSuggestion(
              suggestions[Math.min(activeIndex, suggestions.length - 1)],
            );
          } else if (event.key === "Escape") {
            event.preventDefault();
            setIsDropdownOpen(false);
          }
        }}
        placeholder={placeholder}
        className="h-10 w-full min-w-0 rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60"
      />
      {isDropdownVisible ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
            {suggestionsLabel}
          </p>
          {isSearching ? (
            <p role="status" className="px-3 pb-3 text-xs text-muted-foreground">
              {loadingLabel}
            </p>
          ) : null}
          {searchError ? (
            <p role="alert" className="px-3 pb-3 text-xs text-amber-200">
              {searchError}
            </p>
          ) : null}
          {suggestions.length > 0 ? (
            <ul
              id={listboxId}
              role="listbox"
              aria-label={suggestionsLabel}
              className="max-h-56 overflow-y-auto border-t border-border py-1"
            >
              {suggestions.map((product, index) => (
                <li
                  key={product.catalog_id}
                  id={`${listboxId}-${product.catalog_id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(product)}
                  className={`cursor-pointer px-3 py-2 text-sm text-foreground ${
                    index === activeIndex
                      ? "bg-emerald-400/10"
                      : "hover:bg-muted"
                  }`}
                >
                  {product.namn}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type RecipeFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecipe: Recipe | null;
  form: RecipeFormValues;
  setForm: Dispatch<SetStateAction<RecipeFormValues>>;
  imageUrl: string | null;
  selectedImage: File | null;
  onImageChange: (file: File | null) => void;
  formError: string;
  operationError: string;
  isSaving: boolean;
  t: PantryTranslation;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchForm?: (type: "product" | "recipe") => void;
};

export function RecipeForm({
  open,
  onOpenChange,
  editingRecipe,
  form,
  setForm,
  imageUrl,
  selectedImage,
  onImageChange,
  formError,
  operationError,
  isSaving,
  t,
  onSubmit,
  onSwitchForm,
}: RecipeFormProps) {
  const [tagDraft, setTagDraft] = useState("");

  const addTags = (value: string) => {
    const newTags = value
      .split(",")
      .map((tag) => tag.trim().replace(/^#+/, ""))
      .filter(Boolean);

    if (newTags.length > 0) {
      setForm((current) => {
        const existingTags = new Set(
          current.tags.map((tag) => tag.toLocaleLowerCase()),
        );
        const tagsToAdd = newTags.filter((tag) => {
          const normalizedTag = tag.toLocaleLowerCase();
          if (existingTags.has(normalizedTag)) return false;
          existingTags.add(normalizedTag);
          return true;
        });
        return tagsToAdd.length > 0
          ? { ...current, tags: [...current.tags, ...tagsToAdd] }
          : current;
      });
    }

    setTagDraft("");
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) {
          if (!nextOpen) setTagDraft("");
          onOpenChange(nextOpen);
        }
      }}
    >
      <DrawerContent className="mx-auto h-[calc(100dvh-env(safe-area-inset-top))] max-h-none max-w-xl rounded-t-2xl border border-border bg-background p-0 text-foreground shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-3rem)]">
        <DrawerHeader className="flex items-center justify-between border-b border-border px-5 py-4">
          <DrawerTitle className="text-lg font-semibold">
            {editingRecipe ? t.editRecipe : t.addRecipe}
          </DrawerTitle>
          <DrawerClose
            disabled={isSaving}
            aria-label={t.cancel}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </DrawerClose>
        </DrawerHeader>
        {!editingRecipe && onSwitchForm ? (
          <PantryAddTypeTabs
            activeType="recipe"
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

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted-foreground">{t.recipeImage}</span>
            <input
              type="file"
              accept="image/*"
              required={!imageUrl && !selectedImage}
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
            {imageUrl ? (
              <Image
                unoptimized
                src={imageUrl}
                alt=""
                width={160}
                height={100}
                className="h-24 w-full rounded-lg object-cover"
              />
            ) : null}
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted-foreground">{t.recipeName}</span>
            <input
              required
              autoFocus
              value={form.titel}
              onChange={(event) =>
                setForm((current) => ({ ...current, titel: event.target.value }))
              }
              placeholder={t.recipeNamePlaceholder}
              className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted-foreground">{t.description}</span>
            <textarea
              rows={3}
              value={form.beskrivning}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  beskrivning: event.target.value,
                }))
              }
              placeholder={t.descriptionPlaceholder}
              className="w-full resize-y rounded-xl border border-border bg-muted px-3 py-2.5 text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted-foreground">{t.preparationTime}</span>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.tid}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tid: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-border bg-muted px-3 pr-12 text-foreground outline-none focus:border-emerald-400/60"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {t.minutes}
                </span>
              </div>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-muted-foreground">{t.category}</span>
              <input
                value={form.kategori}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kategori: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none focus:border-emerald-400/60"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-muted-foreground">{t.mainIngredient}</span>
            <select
              required
              value={form.main_ingredient}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  main_ingredient: isRecipeMainIngredient(event.target.value)
                    ? event.target.value
                    : "",
                }))
              }
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-foreground outline-none focus:border-emerald-400/60"
            >
              <option value="">{t.selectMainIngredient}</option>
              <option value="chicken">{t.recipeMainIngredientChicken}</option>
              <option value="meat">{t.recipeMainIngredientMeat}</option>
              <option value="minced_meat">
                {t.recipeMainIngredientMincedMeat}
              </option>
              <option value="sausage">{t.recipeMainIngredientSausage}</option>
              <option value="shrimp">{t.recipeMainIngredientShrimp}</option>
              <option value="fish">{t.recipeMainIngredientFish}</option>
              <option value="vegetarian">
                {t.recipeMainIngredientVegetarian}
              </option>
              <option value="other">{t.recipeMainIngredientOther}</option>
            </select>
          </label>

          <div className="space-y-1.5 text-sm">
            <label htmlFor="recipe-tags" className="block font-medium text-muted-foreground">
              {t.recipeTags}
            </label>
            <input
              id="recipe-tags"
              value={tagDraft}
              onChange={(event) => {
                const value = event.target.value;
                const lastComma = value.lastIndexOf(",");
                if (lastComma >= 0) {
                  addTags(value.slice(0, lastComma));
                  setTagDraft(value.slice(lastComma + 1).trimStart());
                } else {
                  setTagDraft(value);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && tagDraft.trim()) {
                  event.preventDefault();
                  addTags(tagDraft);
                }
              }}
              onBlur={() => {
                if (tagDraft.trim()) addTags(tagDraft);
              }}
              placeholder={t.recipeTagsPlaceholder}
              disabled={isSaving}
              className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
            />
            <p className="text-xs text-muted-foreground">{t.recipeTagsHint}</p>
            {form.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2 pt-1">
                {form.tags.map((tag) => (
                  <li
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-300/10 px-2.5 py-1 text-xs font-medium text-emerald-200"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      disabled={isSaving}
                      aria-label={`${t.removeRecipeTag} ${tag}`}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          tags: current.tags.filter((item) => item !== tag),
                        }))
                      }
                      className="rounded-full p-0.5 hover:bg-emerald-300/15 disabled:opacity-50"
                    >
                      <X aria-hidden="true" className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t.ingredients}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    ingredients: [
                      ...current.ingredients,
                      { ingrediens_namn: "", kvantitet: "", enhet: "" },
                    ],
                  }))
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-emerald-300 hover:bg-emerald-300/10"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t.addIngredient}
              </button>
            </div>
            {form.ingredients.map((ingredient, index) => (
              <div
                key={index}
                className="grid grid-cols-[minmax(0,1fr)_5rem_5rem_2.5rem] gap-2"
              >
                <label className="sr-only" htmlFor={`ingredient-name-${index}`}>
                  {t.ingredientName}
                </label>
                <IngredientNameInput
                  id={`ingredient-name-${index}`}
                  value={ingredient.ingrediens_namn}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      ingredients: current.ingredients.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, ingrediens_namn: value }
                          : item,
                      ),
                    }))
                  }
                  placeholder={t.ingredientNamePlaceholder}
                  suggestionsLabel={t.productSuggestions}
                  loadingLabel={t.catalogSearchLoading}
                  errorLabel={t.catalogSearchError}
                />
                <label className="sr-only" htmlFor={`ingredient-quantity-${index}`}>
                  {t.quantity}
                </label>
                <input
                  id={`ingredient-quantity-${index}`}
                  type="number"
                  min="0.01"
                  step="any"
                  value={ingredient.kvantitet}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ingredients: current.ingredients.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, kvantitet: event.target.value }
                          : item,
                      ),
                    }))
                  }
                  placeholder={t.quantity}
                  className="h-10 min-w-0 rounded-lg border border-border bg-muted px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60"
                />
                <label className="sr-only" htmlFor={`ingredient-unit-${index}`}>
                  {t.unit}
                </label>
                <input
                  id={`ingredient-unit-${index}`}
                  value={ingredient.enhet}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ingredients: current.ingredients.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, enhet: event.target.value }
                          : item,
                      ),
                    }))
                  }
                  placeholder={t.unit}
                  className="h-10 min-w-0 rounded-lg border border-border bg-muted px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-emerald-400/60"
                />
                <button
                  type="button"
                  aria-label={`${t.delete} ${t.ingredientName.toLocaleLowerCase()}`}
                  disabled={form.ingredients.length <= 1}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      ingredients: current.ingredients.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    }))
                  }
                  className="flex h-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </section>

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
              {isSaving ? t.saving : t.saveRecipe}
            </button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
