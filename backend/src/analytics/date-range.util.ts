/** Defaults to the last 7 days (inclusive of today) when no range is given. */
export function resolveRange(from?: string, to?: string): { from: Date; to: Date } {
  const end = to ? endOfDay(new Date(to)) : endOfDay(new Date());
  const start = from ? startOfDay(new Date(from)) : startOfDay(addDays(end, -6));

  return { from: start, to: end };
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * better-sqlite3 can't bind JS Date objects as query parameters, and TypeORM
 * only converts Dates automatically for entity columns, not raw query
 * builder params. Format to the same "YYYY-MM-DD HH:MM:SS.mmm" (UTC) string
 * TypeORM uses when persisting datetime columns, so BETWEEN comparisons
 * stay consistent with the stored values.
 */
export function toSqliteDatetime(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}
