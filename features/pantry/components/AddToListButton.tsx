"use client";

import { useEffect, useState } from "react";
import { Check, ListPlus, Plus } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";

import { Button } from "@/components/ui/button";
import type { PantryTranslation } from "@/features/pantry/i18n";
import { supabase } from "@/lib/supabase";

type PantryList = { id: string; name: string };
type ListItemSource = "catalog_product_id" | "recipe_id";

type AddToListButtonProps = {
  userId: string;
  itemId: string;
  itemName: string;
  source: ListItemSource;
  t: PantryTranslation;
  onOpenLists: () => void;
};

export function AddToListButton({
  userId,
  itemId,
  itemName,
  source,
  t,
  onOpenLists,
}: AddToListButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lists, setLists] = useState<PantryList[]>([]);
  const [addedListIds, setAddedListIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [savingListId, setSavingListId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let isCurrent = true;
    const loadLists = async () => {
      setIsLoading(true);
      setErrorMessage("");
      const { data: listData, error: listsError } = await supabase
        .from("pantry_lists")
        .select("id, name")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (!isCurrent) return;
      if (listsError) {
        console.error("Failed to load lists for adding an item:", listsError);
        setErrorMessage(t.listsLoadError);
        setLists([]);
        setIsLoading(false);
        return;
      }

      const loadedLists = listData ?? [];
      setLists(loadedLists);
      if (loadedLists.length === 0) {
        setAddedListIds(new Set());
        setIsLoading(false);
        return;
      }

      const sourceColumn =
        source === "catalog_product_id" ? "catalog_product_id" : "recipe_id";
      const { data: itemData, error: itemsError } = await supabase
        .from("pantry_list_items")
        .select(`list_id, ${sourceColumn}`)
        .in(
          "list_id",
          loadedLists.map((list) => list.id),
        )
        .eq(sourceColumn, itemId);

      if (!isCurrent) return;
      if (itemsError) {
        console.error("Failed to load existing list entries:", itemsError);
        setErrorMessage(t.listsItemsLoadError);
      } else {
        setAddedListIds(new Set((itemData ?? []).map((item) => item.list_id)));
      }
      setIsLoading(false);
    };

    void loadLists();
    return () => {
      isCurrent = false;
    };
  }, [isOpen, itemId, source, t.listsItemsLoadError, t.listsLoadError, userId]);

  const addToList = async (list: PantryList) => {
    if (savingListId || addedListIds.has(list.id)) return;
    setSavingListId(list.id);
    setErrorMessage("");
    const { error } = await supabase.from("pantry_list_items").insert({
      list_id: list.id,
      [source]: itemId,
    });

    if (error) {
      console.error("Failed to add item to pantry list:", error);
      setErrorMessage(t.listsAddError);
    } else {
      setAddedListIds((current) => new Set(current).add(list.id));
    }
    setSavingListId("");
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger
        render={
          <button
            type="button"
            aria-label={`${t.listsAddTo} ${itemName}`}
            title={t.listsAddTo}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-300"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
        }
      />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl outline-none">
          <Dialog.Title className="text-lg font-semibold">
            {t.listsAddTo}
          </Dialog.Title>
          <Dialog.Description className="mt-1 truncate text-sm text-muted-foreground">
            {itemName}
          </Dialog.Description>

          {errorMessage ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-500 dark:text-red-200"
            >
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-4 space-y-2">
            {isLoading ? (
              <p className="py-5 text-center text-sm text-muted-foreground">
                {t.listsLoading}
              </p>
            ) : lists.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t.listsEmptyDescription}
                </p>
                <Button
                  type="button"
                  className="mt-3"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenLists();
                  }}
                >
                  {t.listsCreate}
                </Button>
              </div>
            ) : (
              lists.map((list) => {
                const isAdded = addedListIds.has(list.id);
                const isSaving = savingListId === list.id;
                return (
                  <button
                    key={list.id}
                    type="button"
                    disabled={isAdded || Boolean(savingListId)}
                    onClick={() => void addToList(list)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <ListPlus
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                      />
                      <span className="truncate text-sm font-medium">
                        {list.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {isSaving
                        ? t.saving
                        : isAdded
                          ? <Check aria-label={t.listsAdded} className="h-4 w-4 text-emerald-600" />
                          : <Plus aria-hidden="true" className="h-4 w-4" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <Dialog.Close
              render={<Button type="button" variant="outline" />}
            >
              {t.cancel}
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
