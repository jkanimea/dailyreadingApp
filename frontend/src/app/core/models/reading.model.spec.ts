import { ReadingSummary } from './reading.model';

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
