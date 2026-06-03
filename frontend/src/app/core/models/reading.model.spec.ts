import { isReadingDetail, isReadingSummary, isDailyReadingArray, ReadingSummary } from './reading.model';

describe('ReadingSummary', () => {
  it('should create a valid summary', () => {
    const summary: ReadingSummary = { id: 1, summaryPoints: 'Test summary' };
    expect(summary.id).toBe(1);
    expect(summary.summaryPoints).toBe('Test summary');
  });

  it('should allow null summaryPoints', () => {
    const summary: ReadingSummary = { id: 2 };
    expect(summary.summaryPoints).toBeUndefined();
  });
});

describe('isReadingDetail', () => {
  it('should return true for a valid ReadingDetail', () => {
    expect(isReadingDetail({ id: 1, seriesId: 2, seriesName: 'Test', month: 5, day: 1, bibleReading: 'Gen 1', primaryBookPageRange: 'p1', hasSecondaryReading: false, sortOrder: 1 })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isReadingDetail(null)).toBe(false);
  });

  it('should return false when id is missing', () => {
    expect(isReadingDetail({ seriesId: 2 })).toBe(false);
  });

  it('should return false for a string', () => {
    expect(isReadingDetail('reading')).toBe(false);
  });
});

describe('isReadingSummary', () => {
  it('should return true for a valid ReadingSummary', () => {
    expect(isReadingSummary({ id: 5, summaryPoints: '- Point 1' })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isReadingSummary(null)).toBe(false);
  });

  it('should return false when id is not a number', () => {
    expect(isReadingSummary({ id: '5' })).toBe(false);
  });
});

describe('isDailyReadingArray', () => {
  it('should return true for an array of readings', () => {
    expect(isDailyReadingArray([{ id: 1 }, { id: 2 }])).toBe(true);
  });

  it('should return true for an empty array', () => {
    expect(isDailyReadingArray([])).toBe(true);
  });

  it('should return false for non-array', () => {
    expect(isDailyReadingArray({ id: 1 })).toBe(false);
  });

  it('should return false when an element has no id', () => {
    expect(isDailyReadingArray([{ id: 1 }, { name: 'bad' }])).toBe(false);
  });
});
