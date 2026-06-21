import { execSync } from 'child_process';
import { appVersion } from './version';

describe('appVersion', () => {
  it('should match git commit count', () => {
    const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    expect(appVersion).toBe(`v${commitCount}`);
  });

  it('should not be dev', () => {
    expect(appVersion).not.toBe('dev');
  });
});
