export interface ReadingDate {
  month: number;
  day: number;
}

export function shiftReadingDate(month: number, day: number, delta: number): ReadingDate {
  const d = new Date(2020, month - 1, day);
  d.setDate(d.getDate() + delta);
  return { month: d.getMonth() + 1, day: d.getDate() };
}