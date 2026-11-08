"use client";

import { useEffect, useState } from "react";
import { List, Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PantryTranslation } from "@/features/pantry/i18n";
import { supabase } from "@/lib/supabase";

type PantryList = {
  id: string;
  name: string;
  created_at: string;
};

type ListItem = {
  id: string;
  list_id: string;
  catalog_product_id: string | null;
  recipe_id: string | null;
};

type SourceType = "catalog" | "recipe";

type ListsViewProps = {
  userId: string;
  t: PantryTranslation;
};

export function ListsView({ userId, t }: ListsViewProps) {
  const [lists, setLists] = useState<PantryList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [newListName, setNewListName] = useState("");
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [listToDelete, setListToDelete] = useState<PantryList | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const selectedList = lists.find((list) => list.id === selectedListId) ?? null;

  useEffect(() => {
    let isCurrent = true;

    const loadLists = async () => {
      setIsLoadingLists(true);
      setLoadError("");
      const { data, error } = await supabase
        .from("pantry_lists")
        .select("id, name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (!isCurrent) return;
      if (error) {
        console.error("Failed to load pantry lists:", error);
        setLoadError(t.listsLoadError);
        setLists([]);
      } else {
        const loadedLists = data ?? [];
        setLists(loadedLists);
        setSelectedListId((current) =>
          loadedLists.some((list) => list.id === current)
            ? current
            : (loadedLists[0]?.id ?? ""),
        );
      }
      setIsLoadingLists(false);
    };

    void loadLists();
    return () => {
      isCurrent = false;
    };
  }, [reloadToken, t.listsLoadError, userId]);

  useEffect(() => {
    let isCurrent = true;

    const loadItems = async () => {
      if (!selectedListId) {
        setItems([]);
        setItemNames({});
        setIsLoadingItems(false);
        return;
      }

      setIsLoadingItems(true);
      const { data, error } = await supabase
        .from("pantry_list_items")
        .select("id, list_id, catalog_product_id, recipe_id")
        .eq("list_id", selectedListId)
        .order("created_at", { ascending: true });

      if (!isCurrent) return;
      if (error) {
        console.error("Failed to load pantry list items:", error);
        setOperationError(t.listsItemsLoadError);
        setItems([]);
        setItemNames({});
      } else {
        setOperationError("");
        const loadedItems = data ?? [];
        setItems(loadedItems);
        const catalogIds = loadedItems.flatMap((item) =>
          item.catalog_product_id ? [item.catalog_product_id] : [],
        );
        const recipeIds = loadedItems.flatMap((item) =>
          item.recipe_id ? [item.recipe_id] : [],
        );
        const [catalogProducts, recipes] = await Promise.all([
          catalogIds.length
            ? supabase
                .from("produkt_katalog")
                .select("catalog_id, namn")
                .in("catalog_id", catalogIds)
            : Promise.resolve({ data: [], error: null }),
          recipeIds.length
            ? supabase
                .from("recept")
                .select("id, titel")
                .in("id", recipeIds)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (!isCurrent) return;
        const nameMap: Record<string, string> = {};
        for (const product of catalogProducts.data ?? []) {
          nameMap[`catalog:${product.catalog_id}`] = product.namn;
        }
        for (const recipe of recipes.data ?? []) {
          nameMap[`recipe:${recipe.id}`] = recipe.titel;
        }
        setItemNames(nameMap);
        for (const result of [catalogProducts, recipes]) {
          if (result.error) {
            console.error(
              "Failed to load pantry list item names:",
              result.error,
            );
            setOperationError(t.listsItemNamesError);
            break;
          }
        }
      }
      setIsLoadingItems(false);
    };

    void loadItems();
    return () => {
      isCurrent = false;
    };
  }, [
    selectedListId,
    reloadToken,
    t.listsItemsLoadError,
    t.listsItemNamesError,
  ]);

  const submitList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newListName.trim();
    if (!name || isSaving) return;

    setIsSaving(true);
    setOperationError("");
    const { data, error } = await supabase
      .from("pantry_lists")
      .insert({ user_id: userId, name })
      .select("id, name, created_at")
      .single();

    if (error) {
      console.error("Failed to create pantry list:", error);
      setOperationError(t.listsCreateError);
    } else {
      setLists((current) => [...current, data]);
      setSelectedListId(data.id);
      setNewListName("");
    }
    setIsSaving(false);
  };

  const removeItem = async (itemId: string) => {
    if (isSaving) return;
    setIsSaving(true);
    setOperationError("");
    const { error } = await supabase
      .from("pantry_list_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("Failed to remove pantry list item:", error);
      setOperationError(t.listsRemoveError);
    } else {
      setItems((current) => current.filter((item) => item.id !== itemId));
    }
    setIsSaving(false);
  };

  const deleteList = async () => {
    if (!listToDelete || isSaving) return;
    setIsSaving(true);
    setOperationError("");
    const { error } = await supabase
      .from("pantry_lists")
      .delete()
      .eq("id", listToDelete.id);

    if (error) {
      console.error("Failed to delete pantry list:", error);
      setOperationError(t.listsDeleteError);
    } else {
      setLists((current) =>
        current.filter((list) => list.id !== listToDelete.id),
      );
      if (selectedListId === listToDelete.id) {
        setSelectedListId(
          lists.find((list) => list.id !== listToDelete.id)?.id ?? "",
        );
      }
    }
    setListToDelete(null);
    setIsSaving(false);
  };

  const getItemSource = (item: ListItem) => {
    if (item.catalog_product_id) {
      return { type: "catalog" as const, id: item.catalog_product_id };
    }
    return { type: "recipe" as const, id: item.recipe_id ?? "" };
  };

  const sourceLabel = (type: SourceType) =>
    type === "catalog" ? t.listsCatalogProducts : t.listsRecipes;

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
          {t.listsTitle}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">
          {t.listsHeading}
        </h1>
        <p className="text-sm text-muted-foreground">{t.listsDescription}</p>
      </header>

      {operationError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-200"
        >
          {operationError}
        </div>
      ) : null}

      <form
        onSubmit={submitList}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row"
      >
        <Input
          value={newListName}
          onChange={(event) => setNewListName(event.target.value)}
          placeholder={t.listsNamePlaceholder}
          aria-label={t.listsNamePlaceholder}
          maxLength={100}
          required
        />
        <Button type="submit" disabled={isSaving || !newListName.trim()}>
          <Plus aria-hidden="true" />
          {isSaving ? t.saving : t.listsCreate}
        </Button>
      </form>

      {loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-red-500 dark:text-red-200"
        >
          <p>{loadError}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => setReloadToken((current) => current + 1)}
          >
            {t.retry}
          </Button>
        </div>
      ) : isLoadingLists ? (
        <div className="rounded-2xl border border-border bg-muted px-5 py-10 text-center text-sm text-muted-foreground">
          {t.listsLoading}
        </div>
      ) : lists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
          <List className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          <p className="mt-3 font-medium text-foreground">{t.listsEmpty}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.listsEmptyDescription}
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => setSelectedListId(list.id)}
                aria-pressed={selectedListId === list.id}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  selectedListId === list.id
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-border bg-card text-foreground hover:border-emerald-500"
                }`}
              >
                {list.name}
              </button>
            ))}
          </div>

          {selectedList ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedList.name}
                </h2>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setListToDelete(selectedList)}
                >
                  <Trash2 aria-hidden="true" />
                  {t.listsDelete}
                </Button>
              </div>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    {t.listsContents}
                  </h3>
                  {!isLoadingItems ? (
                    <span className="text-xs text-muted-foreground">
                      {t.itemsCount(items.length)}
                    </span>
                  ) : null}
                </div>
                {isLoadingItems ? (
                  <p className="rounded-xl border border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                    {t.listsLoading}
                  </p>
                ) : items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    {t.listsItemsEmpty}
                  </p>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {items.map((item) => {
                      const source = getItemSource(item);
                      const name =
                        itemNames[`${source.type}:${source.id}`] ??
                        `${sourceLabel(source.type)} (${source.id.slice(0, 8)})`;
                      return (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sourceLabel(source.type)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`${t.listsRemove} ${name}`}
                            disabled={isSaving}
                            onClick={() => void removeItem(item.id)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
        </>
      )}

      <AlertDialog.Root
        open={listToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setListToDelete(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
            <AlertDialog.Popup className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none">
              <AlertDialog.Title className="text-lg font-semibold">
                {t.listsDeleteTitle}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
                {t.listsDeleteConfirm}
              </AlertDialog.Description>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setListToDelete(null)}
                >
                  {t.cancel}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSaving}
                  onClick={() => void deleteList()}
                >
                  {t.listsDelete}
                </Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
