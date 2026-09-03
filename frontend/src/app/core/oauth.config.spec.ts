import { GOOGLE_WEB_CLIENT_ID, FACEBOOK_APP_ID, FACEBOOK_CLIENT_TOKEN, FACEBOOK_KEY_HASH } from './oauth.config';

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

  it('should match the release keystore Facebook key hash (registered in the console)', () => {
    // Native Android Facebook login fails with "This app has no Android key
    // hashes configured" if this drifts (e.g. keystore rotation) and is not
    // re-registered. entrypoint.sh also fails the build on drift.
    expect(FACEBOOK_KEY_HASH).toBe('c3wOsuGwYemOTZ4xCPatTYtcGJw=');
    expect(FACEBOOK_KEY_HASH).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });
});