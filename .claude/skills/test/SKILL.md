---
name: test
description: Run the full Vitest test suite on the VPS. Use before deploying or after making changes.
---

Run the full test suite on the VPS.

## Steps

1. **Run tests:**
   ```
   ssh LIF "cd /home/armarserver/LIF-Website && npx vitest run"
   ```

2. **Report results** — show the summary (number of tests passed/failed/skipped).

3. **If any tests fail**, show the full failure output so the user can see what broke.

## Test Files

| File | What it covers |
|---|---|
| `tests/constants.test.ts` | Label maps, formatDuration, lexical utilities, serialize |
| `tests/session.test.ts` | HMAC signing, verification, tamper detection |
| `tests/moderation.test.ts` | Warn escalation ladder, getNextSanctionInfo |
| `tests/api-auth.test.ts` | isErrorResponse type guard |
| `tests/security.test.ts` | Collection access control, no hardcoded secrets, cron auth, admin defaults, SVG rejection |
| `tests/imports.test.ts` | No duplicate utilities, no JSON.parse anti-pattern, shared auth, component size limits |

## Important
- Every new feature MUST have tests added before deploying
- Currently 68 tests across 6 files
- If the user asks to test on dev, use `/home/armarserver/LIF-Website-Dev` instead
