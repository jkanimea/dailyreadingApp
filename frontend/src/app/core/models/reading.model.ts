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
