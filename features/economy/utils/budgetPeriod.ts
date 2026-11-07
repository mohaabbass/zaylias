import { isHoliday } from "swedish-holidays";

export type BudgetPeriod = {
  start: Date;
  endExclusive: Date;
};

function getMonthStart(year: number, month: number, startDay: number) {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const start = new Date(year, month, Math.min(startDay, lastDayOfMonth));

  while (
    start.getDay() === 0 ||
    start.getDay() === 6 ||
    isHoliday(start)
  ) {
    start.setDate(start.getDate() - 1);
  }

  return start;
}

export function getBudgetPeriod(
  startDay: number,
  date = new Date(),
): BudgetPeriod {
  const currentMonthStart = getMonthStart(
    date.getFullYear(),
    date.getMonth(),
    startDay,
  );
  const start =
    date >= currentMonthStart
      ? currentMonthStart
      : getMonthStart(date.getFullYear(), date.getMonth() - 1, startDay);
  const endExclusive = getMonthStart(
    start.getFullYear(),
    start.getMonth() + 1,
    startDay,
  );

  return { start, endExclusive };
}
