import { shiftReadingDate } from './reading-nav';

describe('shiftReadingDate', () => {
  it('should move forward one day', () => {
    expect(shiftReadingDate(6, 14, 1)).toEqual({ month: 6, day: 15 });
  });

  it('should move backward one day', () => {
    expect(shiftReadingDate(6, 14, -1)).toEqual({ month: 6, day: 13 });
  });

  it('should cross month boundaries forward', () => {
    expect(shiftReadingDate(1, 31, 1)).toEqual({ month: 2, day: 1 });
    expect(shiftReadingDate(3, 31, 1)).toEqual({ month: 4, day: 1 });
  });

  it('should cross month boundaries backward', () => {
    expect(shiftReadingDate(3, 1, -1)).toEqual({ month: 2, day: 29 });
  });

  it('should cross year boundaries', () => {
    expect(shiftReadingDate(12, 31, 1)).toEqual({ month: 1, day: 1 });
    expect(shiftReadingDate(1, 1, -1)).toEqual({ month: 12, day: 31 });
  });
});