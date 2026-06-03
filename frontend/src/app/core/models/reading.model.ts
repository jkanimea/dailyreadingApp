export interface DailyReading {
  id: number;
  seriesId: number;
  seriesName: string;
  month: number;
  day: number;
  bibleReading: string;
  primaryBookPageRange: string;
  secondaryBookPageRange?: string;
  hasSecondaryReading: boolean;
  sortOrder: number;
}

export interface ReadingDetail extends DailyReading {
  fullTextBible?: string;
  fullTextPrimary?: string;
  fullTextSecondary?: string;
}

export interface ReadingSummary {
  id: number;
  summaryPoints?: string;
}

export function isReadingDetail(value: unknown): value is ReadingDetail {
  return typeof value === 'object' && value !== null
    && typeof (value as ReadingDetail).id === 'number'
    && typeof (value as ReadingDetail).seriesId === 'number';
}

export function isReadingSummary(value: unknown): value is ReadingSummary {
  return typeof value === 'object' && value !== null
    && typeof (value as ReadingSummary).id === 'number';
}

export function isDailyReadingArray(value: unknown): value is DailyReading[] {
  return Array.isArray(value) && value.every(r =>
    typeof r === 'object' && r !== null && typeof r.id === 'number'
  );
}
