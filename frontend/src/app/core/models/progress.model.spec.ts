import { isProgressDto, isProgressDtoArray } from './progress.model';

describe('isProgressDto', () => {
  it('should return true for a valid ProgressDto', () => {
    expect(isProgressDto({ readingId: 1, seriesId: 2, isCompleted: true, month: 5, day: 1, bibleReading: 'Gen 1' })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isProgressDto(null)).toBe(false);
  });

  it('should return false when readingId is missing', () => {
    expect(isProgressDto({ isCompleted: false })).toBe(false);
  });

  it('should return false when isCompleted is not boolean', () => {
    expect(isProgressDto({ readingId: 1, isCompleted: 'yes' })).toBe(false);
  });
});

describe('isProgressDtoArray', () => {
  it('should return true for an array of valid ProgressDtos', () => {
    expect(isProgressDtoArray([
      { readingId: 1, seriesId: 1, isCompleted: true, month: 5, day: 1, bibleReading: 'Gen 1' },
      { readingId: 2, seriesId: 1, isCompleted: false, month: 5, day: 2, bibleReading: 'Gen 2' }
    ])).toBe(true);
  });

  it('should return true for an empty array', () => {
    expect(isProgressDtoArray([])).toBe(true);
  });

  it('should return false for non-array', () => {
    expect(isProgressDtoArray({ readingId: 1 })).toBe(false);
  });

  it('should return false when an element is invalid', () => {
    expect(isProgressDtoArray([{ readingId: 1, isCompleted: true }, { bad: true }])).toBe(false);
  });
});
