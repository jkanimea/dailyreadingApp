/** Calendar-day arithmetic using local midnight (never UTC timestamps). */
export function daysSinceLocal(startDate: string | Date, endDate: string | Date = new Date()): number {
  const start = localMidnight(startDate);
  const end = localMidnight(endDate);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function dayNumberSinceLocal(startDate: string | Date, totalReadings?: number, date: string | Date = new Date()): number {
  const day = Math.max(1, daysSinceLocal(startDate, date) + 1);
  return totalReadings === undefined ? day : Math.min(day, Math.max(1, totalReadings));
}

function localMidnight(value: string | Date): Date {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}
