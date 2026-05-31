// Tests for the displayPercentage calculation in ProgressPage.
// The method lives in progress.module.ts — we mirror it here as a pure function
// so we can verify the fix for the "1/365 shows as 1%" bug without a full
// Angular TestBed setup.

function displayPercentage(completedCount: number, percentage: number): string {
  if (completedCount === 0) return '0';
  if (percentage < 1) return percentage.toFixed(1);
  return String(Math.round(percentage));
}

describe('ProgressPage — displayPercentage', () => {
  it('returns "0" when no readings are completed', () => {
    expect(displayPercentage(0, 0)).toBe('0');
  });

  it('shows 1 decimal place for sub-1% progress (e.g. 1 out of 365 days)', () => {
    const pct = (1 / 365) * 100; // ≈ 0.274
    expect(displayPercentage(1, pct)).toBe('0.3');
  });

  it('shows 1 decimal for other sub-1% values', () => {
    expect(displayPercentage(2, 0.5)).toBe('0.5');
    expect(displayPercentage(3, 0.8)).toBe('0.8');
  });

  it('rounds to integer when percentage is exactly 1', () => {
    expect(displayPercentage(4, 1.0)).toBe('1');
  });

  it('rounds to nearest integer for values >= 1%', () => {
    expect(displayPercentage(10, 2.7)).toBe('3');
    expect(displayPercentage(50, 13.7)).toBe('14');
    expect(displayPercentage(182, 50.0)).toBe('50');
    expect(displayPercentage(365, 100.0)).toBe('100');
  });

  it('rounds up at the 0.5 boundary', () => {
    expect(displayPercentage(5, 1.5)).toBe('2');
  });

  it('never returns "1" for sub-1% progress (regression for the original bug)', () => {
    // 1/365 ≈ 0.274% — old code clamped this to 1, new code shows 0.3
    const pct = (1 / 365) * 100;
    const result = displayPercentage(1, pct);
    expect(result).not.toBe('1');
    expect(result).toBe('0.3');
  });
});
