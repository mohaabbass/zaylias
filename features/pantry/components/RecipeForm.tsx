import type { Dispatch, FormEvent, SetStateAction } from "react";
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
import type { Recipe, RecipeFormValues } from "@/features/pantry/types";

type RecipeFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecipe: Recipe | null;
  form: RecipeFormValues;
  setForm: Dispatch<SetStateAction<RecipeFormValues>>;
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
  formError,
  operationError,
  isSaving,
  t,
  onSubmit,
  onSwitchForm,
}: RecipeFormProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen);
      }}
    >
      <DrawerContent className="mx-auto h-[calc(100dvh-env(safe-area-inset-top))] max-h-none max-w-xl rounded-t-2xl border border-white/10 bg-slate-950 p-0 text-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-3rem)]">
        <DrawerHeader className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <DrawerTitle className="text-lg font-semibold">
            {editingRecipe ? t.editRecipe : t.addRecipe}
          </DrawerTitle>
          <DrawerClose
            disabled={isSaving}
            aria-label={t.cancel}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
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
            <span className="font-medium text-slate-200">{t.recipeName}</span>
            <input
              required
              autoFocus
              value={form.titel}
              onChange={(event) =>
                setForm((current) => ({ ...current, titel: event.target.value }))
              }
              placeholder={t.recipeNamePlaceholder}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-slate-200">{t.description}</span>
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
              className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-200">{t.preparationTime}</span>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.tid}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tid: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 pr-12 text-white outline-none focus:border-emerald-400/60"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  {t.minutes}
                </span>
              </div>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-slate-200">{t.category}</span>
              <input
                value={form.kategori}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kategori: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-white outline-none focus:border-emerald-400/60"
              />
            </label>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-200">
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
                <input
                  id={`ingredient-name-${index}`}
                  value={ingredient.ingrediens_namn}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      ingredients: current.ingredients.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, ingrediens_namn: event.target.value }
                          : item,
                      ),
                    }))
                  }
                  placeholder={t.ingredientNamePlaceholder}
                  className="h-10 min-w-0 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
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
                  className="h-10 min-w-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
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
                  className="h-10 min-w-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
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
                  className="flex h-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </section>

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
              {isSaving ? t.saving : t.saveRecipe}
            </button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
