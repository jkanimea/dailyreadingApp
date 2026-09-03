import { dayNumberSinceLocal, daysSinceLocal } from './local-date';

describe('local date helpers', () => {
  it('counts local calendar days and starts at day one', () => {
    expect(daysSinceLocal('2026-09-01', '2026-09-03')).toBe(2);
    expect(dayNumberSinceLocal('2026-09-03', undefined, '2026-09-03')).toBe(1);
  });

  it('caps elapsed day numbers at the series length', () => {
    expect(dayNumberSinceLocal('2026-01-01', 10, '2026-02-01')).toBe(10);
  });
});
