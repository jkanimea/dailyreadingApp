export interface JournalEntryDto {
  readingId: number;
  seriesId: number;
  seriesName: string;
  month: number;
  day: number;
  bibleReading: string;
  primaryBookPageRange: string;
  secondaryBookPageRange?: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}
