export type ProductStatus = "i_lager" | "konsumerad" | "kastad";
export type StatusFilter = "all" | ProductStatus;

export type PantryProduct = {
  id: string;
  user_id: string;
  namn: string;
  kategori: string | null;
  kvantitet: number | string | null;
  enhet: string | null;
  pris: number | string | null;
  kopdatum: string | null;
  sista_forbrukningsdag: string | null;
  ar_oppnad: boolean;
  oppnad_datum: string | null;
  butik: string | null;
  streckkod: string | null;
  status: ProductStatus;
  is_favorite: boolean;
  created_at: string;
};

export type ProductFormValues = {
  namn: string;
  kategori: string;
  kvantitet: string;
  enhet: string;
  pris: string;
  kopdatum: string;
  sista_forbrukningsdag: string;
  ar_oppnad: boolean;
  oppnad_datum: string;
  butik: string;
  streckkod: string;
};
