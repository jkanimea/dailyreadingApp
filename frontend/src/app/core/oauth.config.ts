// Single source of truth for OAuth client identifiers.
//
// IMPORTANT: keep these in sync with the Firebase project configured in the
// GOOGLE_SERVICES_JSON secret (project number 868571551367). The Google web
// client ID below must match the `client_type: 3` entry in that file. A prior
// regression shipped a stale client ID from the pre-migration Firebase project
// (126956037492…), which made native Android sign-in fail with
// "Google Sign-In cancelled by user". oauth.config.spec.ts asserts these exact
// values so any drift fails CI.

export const GOOGLE_WEB_CLIENT_ID = '868571551367-kkm4ggn0d9cc457k6s0p9rhoipq1bkio.apps.googleusercontent.com';

export const FACEBOOK_APP_ID = '1510105297476514';

export const FACEBOOK_CLIENT_TOKEN = '5ebf47a6cc789c1e3e02f964739e1e58';

// Android key hash of the release keystore, registered in the Facebook developer
// console (Settings → Basic → Android → Key Hashes). Native Facebook login fails
// with "This app has no Android key hashes configured" when this hash is missing
// from the console, or when the keystore is rotated and the hash drifts.
// entrypoint.sh fails the Android build if the keystore's computed hash no longer
// matches this value, so a rotation cannot silently break Facebook login.
export const FACEBOOK_KEY_HASH = 'c3wOsuGwYemOTZ4xCPatTYtcGJw=';