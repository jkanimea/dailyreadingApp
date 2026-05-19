export interface SearchResultDto {
  id: number;
  seriesId: number;
  seriesName: string;
  month: number;
  day: number;
  bibleReading: string;
  fullTextPrimary?: string;
  fullTextSecondary?: string;
  summaryPoints?: string;
  sortOrder: number;
}
