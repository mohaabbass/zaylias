export { cn } from "cn";

export function sortAccountsByFavorite<T extends {
  name: string;
  is_favorite: boolean;
}>(accounts: T[], locale: string): T[] {
  return [...accounts].sort((first, second) => {
    if (first.is_favorite !== second.is_favorite) {
      return first.is_favorite ? -1 : 1;
    }
    return first.name.localeCompare(second.name, locale, {
      sensitivity: "base",
    });
  });
}

export const formatCurrency = (value: number, locale: string = "sv-SE") => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
};
