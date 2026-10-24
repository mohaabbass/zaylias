export { cn } from "cn";

export const formatCurrency = (value: number, locale: string = "sv-SE") => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
};
