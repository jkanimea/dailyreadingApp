export interface ProgressDto {
  readingId: number;
  seriesId: number;
  isCompleted: boolean;
  completedAt?: string;
  month: number;
  day: number;
  bibleReading: string;
  notes?: string;
}
