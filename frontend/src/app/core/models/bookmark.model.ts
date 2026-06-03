export interface BookmarkDto {
  id: number;
  readingId: number;
  seriesId: number;
  bookmarkedAt: string;
  month: number;
  day: number;
  bibleReading: string;
}

export function isBookmarkDto(value: unknown): value is BookmarkDto {
  return typeof value === 'object' && value !== null
    && typeof (value as BookmarkDto).readingId === 'number'
    && typeof (value as BookmarkDto).bibleReading === 'string';
}

export function isBookmarkDtoArray(value: unknown): value is BookmarkDto[] {
  return Array.isArray(value) && value.every(isBookmarkDto);
}
