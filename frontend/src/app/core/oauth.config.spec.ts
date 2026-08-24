import { GOOGLE_WEB_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_CLIENT_TOKEN } from './oauth.config';

describe('oauth.config', () => {
  it('should use the current Firebase project web client ID (not a stale migrated one)', () => {
    expect(GOOGLE_WEB_CLIENT_ID).toBe(
      '868571551367-kkm4ggn0d9cc457k6s0p9rhoipq1bkio.apps.googleusercontent.com'
    );
    // The project-number prefix must match the GOOGLE_SERVICES_JSON project
    // (868571551367). A different prefix means the client ID belongs to another
    // project and native Android Google Sign-In will fail.
    expect(GOOGLE_WEB_CLIENT_ID.startsWith('868571551367-')).toBe(true);
    expect(GOOGLE_WEB_CLIENT_ID.endsWith('.apps.googleusercontent.com')).toBe(true);
  });

  it('should match the current Facebook app ID', () => {
    expect(FACEBOOK_APP_ID).toBe('1510105297476514');
    expect(FACEBOOK_APP_ID).toMatch(/^\d+$/);
  });

  it('should match the current Facebook client token', () => {
    expect(FACEBOOK_CLIENT_TOKEN).toBe('5ebf47a6cc789c1e3e02f964739e1e58');
  });
});