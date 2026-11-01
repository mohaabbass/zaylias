export const categoryOptions = [
  { value: "Dairy", sv: "Mejeri", en: "Dairy" },
  { value: "Produce", sv: "Frukt & grönt", en: "Produce" },
  { value: "Meat & seafood", sv: "Kött & fisk", en: "Meat & seafood" },
  { value: "Pantry", sv: "Skafferi", en: "Pantry" },
  { value: "Freezer", sv: "Frys", en: "Freezer" },
  { value: "Bakery", sv: "Bageri", en: "Bakery" },
  { value: "Other", sv: "Övrigt", en: "Other" },
] as const;

export const productColumns =
  "id, user_id, namn, kategori, kvantitet, enhet, pris, kopdatum, sista_forbrukningsdag, ar_oppnad, oppnad_datum, butik, streckkod, status, is_favorite, created_at";
