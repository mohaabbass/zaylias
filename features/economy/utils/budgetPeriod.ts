export type BudgetPeriod = {
  start: Date;
  endExclusive: Date;
};

function getMonthStart(year: number, month: number, startDay: number) {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(startDay, lastDayOfMonth));
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
