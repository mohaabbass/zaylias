import type { Locale } from "@/lib/i18n";

export const categoryOptions = [
  { value: "Dairy", sv: "Mejeri", en: "Dairy" },
  { value: "Produce", sv: "Frukt & grönt", en: "Produce" },
  { value: "Meat & seafood", sv: "Kött & fisk", en: "Meat & seafood" },
  { value: "Pantry", sv: "Skafferi", en: "Pantry" },
  { value: "Freezer", sv: "Frys", en: "Freezer" },
  { value: "Bakery", sv: "Bageri", en: "Bakery" },
  { value: "Other", sv: "Övrigt", en: "Other" },
] as const;

export function getCategoryLabel(category: string, locale: Locale): string {
  return (
    categoryOptions.find((option) => option.value === category)?.[locale] ??
    category
  );
}

export const productColumns =
  "id, user_id, namn, kategori, kvantitet, remaining_percent, enhet, pris, kopdatum, sista_forbrukningsdag, ar_oppnad, oppnad_datum, butik, streckkod, varumarke, bild_url, status, is_favorite, created_at";
