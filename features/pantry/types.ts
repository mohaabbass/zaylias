export type ProductStatus = "i_lager" | "konsumerad" | "kastad";
export type StatusFilter = "all" | ProductStatus;

export type PantryProduct = {
  id: string;
  user_id: string;
  namn: string;
  kategori: string | null;
  kvantitet: number | string | null;
  remaining_percent: number | string | null;
  enhet: string | null;
  pris: number | string | null;
  kopdatum: string | null;
  sista_forbrukningsdag: string | null;
  ar_oppnad: boolean;
  oppnad_datum: string | null;
  butik: string | null;
  streckkod: string | null;
  varumarke: string | null;
  bild_url: string | null;
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
  varumarke: string;
  bild_url: string;
};

export type RecipeIngredient = {
  id: string;
  recept_id: string;
  ingrediens_namn: string;
  kvantitet: number | string | null;
  enhet: string | null;
};

export type Recipe = {
  id: string;
  user_id: string | null;
  titel: string;
  beskrivning: string | null;
  tid: number | null;
  kategori: string | null;
  is_favorite: boolean;
  created_at: string;
  ingredients: RecipeIngredient[];
  is_favorited: boolean;
};

export type RecipeIngredientFormValues = {
  ingrediens_namn: string;
  kvantitet: string;
  enhet: string;
};

export type RecipeFormValues = {
  titel: string;
  beskrivning: string;
  tid: string;
  kategori: string;
  ingredients: RecipeIngredientFormValues[];
};
