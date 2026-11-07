export type StoredBudgetPeriod = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type BudgetPeriod = {
  id: string;
  name: string;
  start: Date;
  endExclusive: Date;
};

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
    ? date
    : null;
}

export function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseStoredBudgetPeriods(value: unknown): StoredBudgetPeriod[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is Record<string, unknown> => {
      if (typeof entry !== "object" || entry === null) return false;
      const period = entry as Record<string, unknown>;
      return (
        typeof period.id === "string" &&
        typeof period.name === "string" &&
        period.name.trim().length > 0 &&
        typeof period.startDate === "string" &&
        typeof period.endDate === "string" &&
        parseDate(period.startDate) !== null &&
        parseDate(period.endDate) !== null &&
        period.startDate <= period.endDate
      );
    })
    .map((period) => ({
      id: period.id as string,
      name: (period.name as string).trim(),
      startDate: period.startDate as string,
      endDate: period.endDate as string,
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function toBudgetPeriod(period: StoredBudgetPeriod): BudgetPeriod {
  const start = parseDate(period.startDate);
  const end = parseDate(period.endDate);
  if (!start || !end) {
    throw new Error("Budget period contains an invalid date.");
  }

  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return {
    id: period.id,
    name: period.name,
    start,
    endExclusive,
  };
}

export function getCalendarBudgetPeriod(date: Date): BudgetPeriod {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const endExclusive = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    id: `calendar-${getDateKey(start)}`,
    name: "",
    start,
    endExclusive,
  };
}

export function getBudgetPeriodForDate(
  date: Date,
  periods: StoredBudgetPeriod[],
): BudgetPeriod {
  const dateKey = getDateKey(date);
  const matchingPeriod = periods.find(
    (period) => period.startDate <= dateKey && period.endDate >= dateKey,
  );
  return matchingPeriod
    ? toBudgetPeriod(matchingPeriod)
    : getCalendarBudgetPeriod(date);
}

export function getPreviousBudgetPeriod(
  period: BudgetPeriod,
  periods: StoredBudgetPeriod[],
): BudgetPeriod {
  const previous = [...periods]
    .filter((candidate) => candidate.endDate < getDateKey(period.start))
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

  if (previous) return toBudgetPeriod(previous);

  const previousDate = new Date(period.start);
  previousDate.setDate(previousDate.getDate() - 1);
  return getCalendarBudgetPeriod(previousDate);
}
