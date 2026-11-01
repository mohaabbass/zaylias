import {
  economyTranslations,
  type EconomyTranslation,
} from "@/features/economy/i18n";
import {
  sharedTranslations,
  type Locale,
  type SharedTranslation,
} from "@/lib/i18n";

export const translations = {
  sv: { ...sharedTranslations.sv, ...economyTranslations.sv },
  en: { ...sharedTranslations.en, ...economyTranslations.en },
} satisfies Record<Locale, SharedTranslation & EconomyTranslation>;

export type Translation = SharedTranslation & EconomyTranslation;
