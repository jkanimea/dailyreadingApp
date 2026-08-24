// Cross-checks the frontend OAuth client IDs against the GOOGLE_SERVICES_JSON
// secret, so a Firebase project migration or drift between the secret and the
// code is caught in CI before it ships.
//
// The GOOGLE_WEB_CLIENT_ID in src/app/core/oauth.config.ts must be one of the
// `client_type: 3` (web) client IDs in google-services.json. A previous
// regression shipped a stale client ID from the pre-migration Firebase project,
// which broke native Android Google Sign-In with "cancelled by user".

import { readFileSync } from 'node:fs';

const gsJson = process.env.GOOGLE_SERVICES_JSON;
if (!gsJson) {
  console.warn('GOOGLE_SERVICES_JSON not set — skipping OAuth config cross-check.');
  process.exit(0);
}

let parsed;
try {
  parsed = JSON.parse(gsJson);
} catch (e) {
  console.error('GOOGLE_SERVICES_JSON is not valid JSON:', e.message);
  process.exit(1);
}

const webClientIds = [];
for (const client of parsed.client ?? []) {
  for (const oauth of client.oauth_client ?? []) {
    if (oauth.client_type === 3) {
      webClientIds.push(oauth.client_id);
    }
  }
}

if (webClientIds.length === 0) {
  console.error('No client_type: 3 (web) client found in GOOGLE_SERVICES_JSON.');
  process.exit(1);
}

const configPath = new URL('../src/app/core/oauth.config.ts', import.meta.url);
const config = readFileSync(configPath, 'utf8');
const match = config.match(/GOOGLE_WEB_CLIENT_ID\s*=\s*'([^']+)'/);
if (!match) {
  console.error('Could not find GOOGLE_WEB_CLIENT_ID in src/app/core/oauth.config.ts');
  process.exit(1);
}

const configured = match[1];
if (!webClientIds.includes(configured)) {
  console.error('OAuth config drift detected!');
  console.error(`  oauth.config.ts GOOGLE_WEB_CLIENT_ID = ${configured}`);
  console.error(`  GOOGLE_SERVICES_JSON web client ids  = ${webClientIds.join(', ')}`);
  console.error('  The web client ID must be one of the client_type: 3 entries in google-services.json.');
  process.exit(1);
}

console.log(`OK: GOOGLE_WEB_CLIENT_ID (${configured}) matches GOOGLE_SERVICES_JSON web client.`);
