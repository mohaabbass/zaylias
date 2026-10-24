import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CircleAlert,
  Frame,
  LogOut,
  Wallet,
  X,
} from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { BrandMark } from "@/components/ui/BrandMark";
import { useLocale } from "@/components/providers/LocaleProvider";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type AppHeaderProps = {
  title: string;
  userId: string;
  paymentsRefreshToken: number;
  onLogout: () => void;
  onOpenPayments: () => void;
};

type DuePayment = {
  id: string;
  title: string;
  amount: number | string;
  due_date: string;
};

const localeMap = {
  sv: "sv-SE",
  en: "en-US",
  ar: "ar-EG",
} as const;

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function AppHeader({
  title,
  userId,
  paymentsRefreshToken,
  onLogout,
  onOpenPayments,
}: AppHeaderProps) {
  const { t, locale } = useLocale();
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState(true);
  const [reminderError, setReminderError] = useState("");
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  const loadDuePayments = useCallback(async () => {
    setReminderError("");
    const today = getLocalDateString(new Date());
    const { data, error } = await supabase
      .from("payments")
      .select("id, title, amount, due_date")
      .eq("user_id", userId)
      .lte("due_date", today)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Failed to load payment reminders:", error);
      setReminderError(error.message);
      setIsLoadingReminders(false);
      return;
    }

    setDuePayments(data ?? []);
    setIsLoadingReminders(false);
  }, [userId]);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadDuePayments();
    }, 0);

    const intervalId = window.setInterval(() => {
      void loadDuePayments();
    }, 60_000);
    window.addEventListener("focus", loadDuePayments);

    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadDuePayments);
    };
  }, [loadDuePayments, paymentsRefreshToken]);

  const openPayments = () => {
    setIsReminderOpen(false);
    onOpenPayments();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 pb-3 pt-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />

          <div>
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReminderOpen(true)}
            aria-label={`${t.paymentReminders}${duePayments.length > 0 ? `, ${duePayments.length}` : ""}`}
            aria-haspopup="dialog"
            aria-expanded={isReminderOpen}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition hover:border-ring hover:bg-accent"
          >
            <Bell className="h-4 w-4" strokeWidth={2.2} />
            {duePayments.length > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {duePayments.length > 99 ? "99+" : duePayments.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label={t.logout}
            title={t.logout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground transition hover:border-ring hover:bg-accent"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <Drawer open={isReminderOpen} onOpenChange={setIsReminderOpen}>
        <DrawerContent className="mx-auto max-w-md rounded-t-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl">
          <DrawerHeader className="border-b border-border px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <DrawerTitle className="text-lg font-semibold text-foreground">
                {t.paymentReminders}
              </DrawerTitle>
              <DrawerClose
                type="button"
                aria-label={t.close}
                className="rounded-full border border-border bg-muted p-2 text-muted-foreground transition hover:border-ring hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-6 pt-4">
            {isLoadingReminders ? (
              <p className="text-sm text-muted-foreground">{t.loading}</p>
            ) : reminderError ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-300"
              >
                <CircleAlert aria-hidden="true" className="h-5 w-5 shrink-0" />
                <p className="break-words">{reminderError}</p>
              </div>
            ) : duePayments.length === 0 ? (
              <p className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                {t.noDuePayments}
              </p>
            ) : (
              <ul className="max-h-[50dvh] space-y-2 overflow-y-auto">
                {duePayments.map((payment) => {
                  const isOverdue =
                    payment.due_date < getLocalDateString(new Date());
                  return (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {payment.title}
                        </p>
                        <p
                          className={`mt-1 flex items-center gap-1.5 text-xs ${
                            isOverdue ? "text-red-500" : "text-amber-500"
                          }`}
                        >
                          <CalendarDays
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                          {isOverdue ? t.paymentOverdue : t.paymentDueToday}
                          {" · "}
                          {formatDueDate(payment.due_date, localeMap[locale])}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-foreground">
                        {formatCurrency(
                          Number(payment.amount),
                          localeMap[locale],
                        )}{" "}
                        {t.currency}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={openPayments}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              {t.viewPayments}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </header>
  );
}
