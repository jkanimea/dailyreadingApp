import { isBookmarkDto, isBookmarkDtoArray } from './bookmark.model';

describe('isBookmarkDto', () => {
  it('should return true for a valid BookmarkDto', () => {
    expect(isBookmarkDto({ id: 1, readingId: 5, seriesId: 2, bookmarkedAt: '2026-01-01', month: 1, day: 1, bibleReading: 'Gen 1' })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isBookmarkDto(null)).toBe(false);
  });

  it('should return false when readingId is missing', () => {
    expect(isBookmarkDto({ bibleReading: 'Gen 1' })).toBe(false);
  });

  it('should return false when bibleReading is not a string', () => {
    expect(isBookmarkDto({ readingId: 1, bibleReading: 42 })).toBe(false);
  });
});

describe('isBookmarkDtoArray', () => {
  it('should return true for an array of valid BookmarkDtos', () => {
    expect(isBookmarkDtoArray([
      { id: 1, readingId: 1, seriesId: 1, bookmarkedAt: '2026-01-01', month: 1, day: 1, bibleReading: 'Gen 1' }
    ])).toBe(true);
  });

  it('should return true for an empty array', () => {
    expect(isBookmarkDtoArray([])).toBe(true);
  });

  it('should return false for non-array', () => {
    expect(isBookmarkDtoArray('not-array')).toBe(false);
  });

  it('should return false when an element is invalid', () => {
    expect(isBookmarkDtoArray([{ readingId: 1, bibleReading: 'Gen 1' }, { bad: true }])).toBe(false);
  });
});
