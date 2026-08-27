import { createBibleRefRegex } from './bible-refs';

describe('createBibleRefRegex', () => {
  it('matches verse references', () => {
    expect(createBibleRefRegex().test('John 3:16')).toBe(true);
    expect(createBibleRefRegex().test('Matt. 11:1-2')).toBe(true);
    expect(createBibleRefRegex().test('1 John 1:9')).toBe(true);
  });

  it('captures comma and semicolon separated references', () => {
    const matches = 'Acts 17:26, 27; Mark 6:17'.match(createBibleRefRegex());
    expect(matches).not.toBeNull();
  });

  it('does not match non-reference text', () => {
    expect(createBibleRefRegex().test('just some words')).toBe(false);
  });

  it('returns a fresh instance so lastIndex does not leak', () => {
    expect(createBibleRefRegex()).not.toBe(createBibleRefRegex());
  });
});