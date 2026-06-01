/** Returns YYYY-MM-DD in UTC — the only "today" the server uses. */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Extracts YYYY-MM-DD (UTC) from a Date object or ISO string. */
export function dateOnly(d: Date | string): string {
  const iso = d instanceof Date ? d.toISOString() : d
  return iso.slice(0, 10)
}

/** True if the due date (date-only, UTC) is strictly before today. */
export function isPast(dataScadenza: Date): boolean {
  return dateOnly(dataScadenza) < todayUTC()
}
