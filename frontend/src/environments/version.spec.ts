import { appVersion } from './version';

describe('appVersion', () => {
  it('should be a non-empty string', () => {
    expect(appVersion).toBeTruthy();
    expect(typeof appVersion).toBe('string');
  });

  it('should start with v prefix', () => {
    expect(appVersion).toMatch(/^v/);
  });

  it('should not be dev', () => {
    expect(appVersion).not.toBe('dev');
  });
});
