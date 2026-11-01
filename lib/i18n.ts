export type Locale = "sv" | "en";

export const locales: Locale[] = ["sv", "en"];

export const localeLabels: Record<Locale, string> = {
  sv: "Svenska",
  en: "English",
};

export const sharedTranslations = {
  sv: {
    appTitle: "Zaylias",
    chooseApp: "Välj en app",
    chooseAppDescription: "Vad vill du öppna?",
    economyApp: "Ekonomi",
    economyAppDescription: "Budget, transaktioner och konton",
    pantryApp: "Skafferi",
    pantryAppDescription: "Håll koll på matvaror hemma",
    switchApps: "Byt app",
    loading: "Laddar...",
    login: "Logga in",
    createAccount: "Skapa konto",
    email: "E-post",
    password: "Lösenord",
    emailPlaceholder: "din.epost@example.com",
    passwordPlaceholder: "••••••••",
    alreadyHaveAccount: "Har du redan ett konto?",
    noAccount: "Har du inget konto?",
    toggleLogin: "Logga in",
    toggleCreate: "Skapa ett",
    logout: "Logga ut",
    accountCreated:
      "Konto skapat! Kolla din e-post för bekräftelselänk om det krävs, eller logga in.",
    close: "Stäng",
    cancel: "Avbryt",
    currency: "kr",
    language: "Språk",
    appearance: "Utseende",
    light: "Ljus",
    dark: "Mörkt",
  },
  en: {
    appTitle: "Zaylias",
    chooseApp: "Choose an app",
    chooseAppDescription: "What would you like to open?",
    economyApp: "Economy",
    economyAppDescription: "Budget, transactions, and accounts",
    pantryApp: "Pantry",
    pantryAppDescription: "Keep track of food at home",
    switchApps: "Switch app",
    loading: "Loading...",
    login: "Log in",
    createAccount: "Create account",
    email: "Email",
    password: "Password",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "••••••••",
    alreadyHaveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    toggleLogin: "Log in",
    toggleCreate: "Create one",
    logout: "Log out",
    accountCreated:
      "Account created! Check your email for a confirmation link if required, or log in.",
    close: "Close",
    cancel: "Cancel",
    currency: "kr",
    language: "Language",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
  },
} as const;

export type SharedTranslation = (typeof sharedTranslations)[Locale];
