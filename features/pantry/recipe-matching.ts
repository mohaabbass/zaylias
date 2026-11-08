import type {
  PantryProduct,
  Recipe,
  RecipeIngredient,
} from "@/features/pantry/types";

export type IngredientAvailability =
  | { status: "enough" | "inPantry" | "low" | "missing" | "unknown" }
  | { status: "partial"; missingQuantity: number; unitFactor: number };

export function normalizeIngredientName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getUnitInfo(unit: string | null) {
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

export function getAvailableProductQuantity(product: PantryProduct) {
  if (product.kvantitet == null) return null;

  const quantity = Number(product.kvantitet);
  if (!Number.isFinite(quantity) || quantity < 0) return null;

  return quantity * (getRemainingPercent(product) / 100);
}

export function getIngredientAvailability(
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
      ? { status: "unknown" }
      : { status: "missing" };
  }

  const recipeUnit = getUnitInfo(ingredient.enhet);
  let comparableProductFound = false;
  let availableQuantity = 0;

  for (const product of matches) {
    const quantity = getAvailableProductQuantity(product);
    if (quantity === null) continue;

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

  if (matches.some((product) => getAvailableProductQuantity(product) === null)) {
    return matches.some((product) => getRemainingPercent(product) > 0)
      ? { status: "unknown" }
      : { status: "missing" };
  }
  if (matches.some((product) => getRemainingPercent(product) > 0)) {
    return { status: "unknown" };
  }

  return { status: "missing" };
}

export function getRecipeAvailabilitySummary(
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

export type PantryConsumptionUpdate = {
  id: string;
  remaining_percent: number;
  status: "i_lager" | "konsumerad";
};

export function getRecipeConsumptionUpdates(
  recipe: Recipe,
  products: PantryProduct[],
): PantryConsumptionUpdate[] | null {
  const remainingByProduct = new Map<string, number>();
  const productById = new Map<string, PantryProduct>();

  for (const ingredient of recipe.ingredients) {
    const requiredQuantity =
      ingredient.kvantitet == null ? NaN : Number(ingredient.kvantitet);
    if (!Number.isFinite(requiredQuantity) || requiredQuantity <= 0) {
      return null;
    }

    const ingredientName = normalizeIngredientName(ingredient.ingrediens_namn);
    const recipeUnit = getUnitInfo(ingredient.enhet);
    const matches = products
      .filter(
        (product) =>
          product.status === "i_lager" &&
          normalizeIngredientName(product.namn) === ingredientName &&
          getUnitInfo(product.enhet).dimension === recipeUnit.dimension &&
          getAvailableProductQuantity(product) !== null,
      )
      .sort((left, right) => {
        if (!left.sista_forbrukningsdag && !right.sista_forbrukningsdag) {
          return 0;
        }
        if (!left.sista_forbrukningsdag) return 1;
        if (!right.sista_forbrukningsdag) return -1;
        return left.sista_forbrukningsdag.localeCompare(
          right.sista_forbrukningsdag,
        );
      });

    let remainingRequired = requiredQuantity * recipeUnit.factor;
    for (const product of matches) {
      const productUnit = getUnitInfo(product.enhet);
      const storedAvailable = getAvailableProductQuantity(product);
      const availableInBaseUnits =
        remainingByProduct.get(product.id) ??
        (storedAvailable ?? 0) * productUnit.factor;
      const usedInBaseUnits = Math.min(
        remainingRequired,
        availableInBaseUnits,
      );

      if (usedInBaseUnits <= 0) continue;
      remainingByProduct.set(
        product.id,
        availableInBaseUnits - usedInBaseUnits,
      );
      productById.set(product.id, product);
      remainingRequired -= usedInBaseUnits;
      if (remainingRequired <= 0.0000001) break;
    }

    if (remainingRequired > 0.0000001) return null;
  }

  return [...remainingByProduct].map(([id, remainingBaseUnits]) => {
    const product = productById.get(id)!;
    const totalBaseUnits =
      Number(product.kvantitet) * getUnitInfo(product.enhet).factor;
    const remainingPercent =
      totalBaseUnits > 0
        ? Math.max(0, Math.min(100, (remainingBaseUnits / totalBaseUnits) * 100))
        : 0;

    return {
      id,
      remaining_percent: remainingPercent,
      status: remainingPercent === 0 ? "konsumerad" : "i_lager",
    };
  });
}
