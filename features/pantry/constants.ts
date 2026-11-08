import type { Locale } from "@/lib/i18n";

export const categoryOptions = [
  { value: "Produce", sv: "Frukt & grönt", en: "Produce" },
  { value: "Dairy", sv: "Mejeri & Ägg", en: "Dairy & Eggs" },
  { value: "Meat & Chark", sv: "Kött & Chark", en: "Meat & Deli" },
  { value: "Fish & Seafood", sv: "Fisk & Skaldjur", en: "Fish & Seafood" },
  { value: "Bakery & Bread", sv: "Bageri & Bröd", en: "Bakery & Bread" },
  { value: "Pantry", sv: "Skafferi", en: "Pantry" },
  { value: "Freezer", sv: "Frys", en: "Freezer" },
  { value: "Drinks", sv: "Dryck", en: "Drinks" },
  { value: "Coffee & Tea", sv: "Kaffe & Te", en: "Coffee & Tea" },
  { value: "Spices", sv: "Kryddor", en: "Spices" },
  { value: "Snacks & Candy", sv: "Snacks & Godis", en: "Snacks & Candy" },
  {
    value: "Cleaning & Household",
    sv: "Städ & Hushåll",
    en: "Cleaning & Household",
  },
  {
    value: "Personal Care & Bathroom",
    sv: "Hygien & Badrum",
    en: "Personal Care & Bathroom",
  },
  { value: "Kids & Baby", sv: "Barn & Baby", en: "Kids & Baby" },
  { value: "Pets", sv: "Husdjur", en: "Pets" },
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
