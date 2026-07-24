# Project Guidelines

## Testing Requirements
- Every fix or new feature MUST include tests that verify the code works.
- Run `npm test` (all suites) before pushing to ensure nothing is broken.
- After pushing, check GitHub Actions CI build logs. If they fail, fix the issues immediately.

## CI Maintenance
- After each successful CI run, review the full log for deprecation warnings (Node.js, actions, etc.) and fix them immediately by updating to the latest major version of the affected action.

## Last CI trigger
- 2026-07-24 11:59 - Test SSH_KEY fix via REST API
- 2026-07-24 12:12 - Add CI public key to VPS2 authorized_keys
