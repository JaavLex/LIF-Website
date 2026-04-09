# NPC Tab + GameMaster Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split NPCs from player characters on the `/roleplay` personnel page (admin-only tab), and add a server-enforced GameMaster mode in comms that lets admins impersonate NPCs/targets and ghost-post in any faction/unit/group channel with a hidden audit tag.

**Architecture:** Feature 1 is a pure UI filter (derivation rule `!discordId && !isTarget`, zero schema change). Feature 2 adds one nullable column (`posted_as_gm`) via Payload migration, three server endpoints gain a GM branch (channels list, messages POST, messages GET), one new NPC picker endpoint, a React context (`GmModeProvider`) for ephemeral client state, a new `AdminBar` component, and composer/list UI tweaks. GM mode is re-validated server-side on every request — no persistent session state.

**Tech Stack:** Next.js 15 App Router, Payload CMS 3, React 19, Vitest, PostgreSQL.

**Reference spec:** `docs/superpowers/specs/2026-04-09-npc-tab-and-gm-mode-design.md`

---

## File Structure

**New files:**
- `src/components/comms/useGmMode.tsx` — React context + hook for ephemeral GM state (provider, state shape, actions, NPC list cache).
- `src/components/comms/AdminBar.tsx` — admin-only strip rendered above the profile bar, hosts the MJ toggle and active-character picker.
- `src/app/api/roleplay/characters/npcs/route.ts` — admin-only GET returning NPC/target characters for the GM picker.
- `src/migrations/20260409_180000_comms_messages_posted_as_gm.ts` — Payload migration adding `posted_as_gm` boolean column.

**Modified files:**
- `src/components/roleplay/PersonnelFilters.tsx` — add `'npcs'` tab, derivation bucketing, admin gate.
- `src/collections/CommsMessages.ts` — add `postedAsGm` field.
- `src/lib/api-auth.ts` — add `requireGmAdmin` helper.
- `src/lib/comms.ts` — add `listAllNonDmChannels()` helper used by the `?gm=1` bypass.
- `src/app/api/comms/channels/route.ts` — branch on `?gm=1` to include bypass channels with `viewerIsGhost: true`.
- `src/app/api/comms/channels/[id]/messages/route.ts` — GET: admin+`?gm=1` read bypass, conditional `postedAsGm` strip. POST: admin+`gmMode` body → membership bypass + impersonation + `postedAsGm: true` write.
- `src/app/api/roleplay/notifications/pending/route.ts` — strip `postedAsGm` from notification payload (mod audience is non-admin).
- `src/components/comms/CommsLayout.tsx` — wrap return in `<GmModeProvider>`, mount `<AdminBar />`, thread GM state into `loadChannels` + `handleSend`.
- `src/components/comms/ChannelList.tsx` — render a small amber dot when `channel.viewerIsGhost === true`.
- `src/components/comms/MessageList.tsx` — render `[MJ]` badge next to the sender name when `message.postedAsGm === true`.
- `src/components/comms/MessageComposer.tsx` — when GM is enabled, render a compact "puppet chip" showing the effective impersonated character with a click-to-override mini picker.
- `src/app/(frontend)/roleplay/comms/comms.css` — styles for admin bar, ghost channel dot, MJ tag, puppet chip.
- `src/lib/version.ts` — bump version + French changelog entry.
- `tests/comms.test.ts` — add coverage for NPC bucketing, admin gate strings, `postedAsGm` strip pattern, ghost-post membership protection.

---

## Part A — NPC Tab (Feature 1)

### Task 1: Add `npcs` tab to PersonnelFilters

**Files:**
- Modify: `src/components/roleplay/PersonnelFilters.tsx` (TabType at line 98, bucketing loop at lines 139-152, tab list at lines 308-321)
- Test: `tests/comms.test.ts` (new `describe` block)

- [ ] **Step 1: Write the failing test**

Append at the end of `tests/comms.test.ts`:
```typescript
describe('PersonnelFilters NPC tab', () => {
  it('bucketing logic separates npcs from personnel and targets', () => {
    const content = readSrc('components/roleplay/PersonnelFilters.tsx');
    // Derivation rule: NPC = !discordId && !isTarget
    expect(content).toMatch(/else if \(!c\.discordId\)\s*{?\s*npcs\.push\(c\)/);
    // Tab union includes 'npcs'
    expect(content).toMatch(/'personnel'\s*\|\s*'targets'\s*\|\s*'npcs'/);
    // Tab is admin-gated
    expect(content).toMatch(/if \(isAdmin\)[\s\S]{0,200}npcs[\s\S]{0,200}label:\s*'PNJ'/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "NPC tab"`
Expected: FAIL (the file has no `npcs` bucket, no `'PNJ'` label, no derivation rule).

- [ ] **Step 3: Update the TabType union**

At line 98 of `src/components/roleplay/PersonnelFilters.tsx`, replace:
```typescript
type TabType = 'personnel' | 'targets' | 'my-characters' | 'archives';
```
with:
```typescript
type TabType = 'personnel' | 'targets' | 'npcs' | 'my-characters' | 'archives';
```

- [ ] **Step 4: Add the `npcs` bucket declaration**

Locate the declarations above the bucketing loop (look for `const personnel: ... = []` and `const targets: ... = []`). Add after the `targets` declaration:
```typescript
const npcs: typeof characters = [];
```
(Match whatever types the existing `personnel`/`targets`/`archives` bucket arrays use in this file — they are typed identically.)

- [ ] **Step 5: Update the bucketing loop**

At lines 139-152, replace the inner `if (c.isTarget)` branch:
```typescript
if (c.isTarget) {
    targets.push(c);
} else {
    personnel.push(c);
}
```
with:
```typescript
if (c.isTarget) {
    targets.push(c);
} else if (!c.discordId) {
    npcs.push(c);
} else {
    personnel.push(c);
}
```

- [ ] **Step 6: Add the tab to the tab list**

At lines 308-321, extend the tab list. The current code ends with:
```typescript
if (isAdmin) {
    tabs.push({ key: 'archives', label: 'Archives', count: archives.length });
}
```
Insert the NPC tab **before** the archives tab (admin-only):
```typescript
if (isAdmin) {
    tabs.push({ key: 'npcs', label: 'PNJ', count: npcs.length });
    tabs.push({ key: 'archives', label: 'Archives', count: archives.length });
}
```

- [ ] **Step 7: Add the list rendering for the `npcs` tab**

Find the block that renders the filtered list per `activeTab` (it will be a switch / conditional on `activeTab === 'personnel'` etc.). Add a parallel branch for `activeTab === 'npcs'` that renders the `npcs` array. Mirror whatever wrapper the other branches use — if `personnel` maps through `<CharacterCard>` or similar, use the identical mapping for `npcs`.

Example pattern if the file uses an inline ternary chain or `const activeList` variable:
```typescript
const activeList =
    activeTab === 'personnel' ? personnel
    : activeTab === 'targets' ? targets
    : activeTab === 'npcs' ? npcs
    : activeTab === 'my-characters' ? myCharacters
    : activeTab === 'archives' ? archives
    : [];
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "NPC tab"`
Expected: PASS

- [ ] **Step 9: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass (no regressions).

- [ ] **Step 10: Commit**

```bash
git add src/components/roleplay/PersonnelFilters.tsx tests/comms.test.ts
git commit -m "feat(roleplay): separate NPCs from players on personnel page

NPCs (characters with no discordId and not flagged as target) now
live on their own admin-only 'PNJ' tab instead of showing up in the
Personnel tab alongside real players.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Part B — Data Model & Shared Helpers

### Task 2: Add `postedAsGm` field to the CommsMessages collection + migration

**Files:**
- Modify: `src/collections/CommsMessages.ts` (fields array at lines 24-55)
- Create: `src/migrations/20260409_180000_comms_messages_posted_as_gm.ts`
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/comms.test.ts`:
```typescript
describe('CommsMessages postedAsGm field', () => {
  it('defines a postedAsGm checkbox field', () => {
    const content = readSrc('collections/CommsMessages.ts');
    expect(content).toMatch(/name:\s*'postedAsGm'/);
    expect(content).toMatch(/postedAsGm'[^}]*type:\s*'checkbox'/);
  });

  it('has a migration for posted_as_gm column', () => {
    const content = readSrc('migrations/20260409_180000_comms_messages_posted_as_gm.ts');
    expect(content).toContain('ALTER TABLE "comms_messages"');
    expect(content).toContain('"posted_as_gm" boolean');
    expect(content).toContain('DEFAULT false');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "postedAsGm"`
Expected: FAIL (field does not exist, migration file does not exist).

- [ ] **Step 3: Add the field to the collection**

In `src/collections/CommsMessages.ts`, inside the `fields` array, insert **after** the `senderDiscordId` field:
```typescript
{
    name: 'postedAsGm',
    type: 'checkbox',
    defaultValue: false,
    admin: {
        description: 'Écrit par un admin en mode MJ (impersonation NPC/cible). Flag d\'audit masqué aux non-admins.',
    },
},
```

- [ ] **Step 4: Create the migration file**

Write `src/migrations/20260409_180000_comms_messages_posted_as_gm.ts`:
```typescript
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "comms_messages" ADD COLUMN IF NOT EXISTS "posted_as_gm" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "comms_messages" DROP COLUMN IF EXISTS "posted_as_gm";
  `)
}
```

- [ ] **Step 5: Register the migration in the index**

Check `src/migrations/index.ts` (if it exists — Payload usually auto-loads, but some repos maintain an explicit index). If present, add an import/export for the new file following the existing pattern. If `src/migrations/index.ts` does NOT exist, skip this step — Payload auto-discovers migrations by filename.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "postedAsGm"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/collections/CommsMessages.ts src/migrations/20260409_180000_comms_messages_posted_as_gm.ts tests/comms.test.ts
git commit -m "feat(comms): add postedAsGm field to comms-messages

Flag for GameMaster impersonation audit trail. Stripped server-side
from non-admin responses so players cannot detect it. Migration adds
a nullable boolean column default false so existing messages are
unaffected.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Add `requireGmAdmin` helper to api-auth

**Files:**
- Modify: `src/lib/api-auth.ts`
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/comms.test.ts`:
```typescript
describe('api-auth requireGmAdmin', () => {
  it('exports a requireGmAdmin helper that returns AdminContext or NextResponse', () => {
    const content = readSrc('lib/api-auth.ts');
    expect(content).toMatch(/export async function requireGmAdmin/);
    // Must call checkAdminPermissions and gate on isAdmin
    expect(content).toMatch(/requireGmAdmin[\s\S]{0,500}checkAdminPermissions/);
    expect(content).toMatch(/requireGmAdmin[\s\S]{0,500}isAdmin/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "requireGmAdmin"`
Expected: FAIL.

- [ ] **Step 3: Add the helper**

In `src/lib/api-auth.ts`, immediately after the existing `requireAdmin` function, add:
```typescript
/**
 * Session + admin gate specifically for GameMaster-mode endpoints.
 * Identical to requireAdmin but lets callers distinguish GM paths in
 * logs/audit. Returns the admin context or a 401/403 NextResponse.
 */
export async function requireGmAdmin(
    request?: NextRequest,
): Promise<AdminContext | NextResponse> {
    const session = await getSession(request);
    if (!session) return unauthorized();

    const permissions = await checkAdminPermissions(session);
    if (!permissions.isAdmin) {
        return NextResponse.json(
            { error: 'Mode MJ réservé aux administrateurs' },
            { status: 403 },
        );
    }

    return { session, permissions };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "requireGmAdmin"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api-auth.ts tests/comms.test.ts
git commit -m "feat(api-auth): add requireGmAdmin helper

Shared gate for GameMaster-mode endpoints. Same semantics as
requireAdmin but returns a GM-specific French error so clients can
distinguish and surface appropriately.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Create NPC picker endpoint

**Files:**
- Create: `src/app/api/roleplay/characters/npcs/route.ts`
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('GET /api/roleplay/characters/npcs', () => {
  it('is admin-gated via requireGmAdmin', () => {
    const content = readSrc('app/api/roleplay/characters/npcs/route.ts');
    expect(content).toContain("from '@/lib/api-auth'");
    expect(content).toContain('requireGmAdmin');
    expect(content).toContain('isErrorResponse');
  });

  it('filters non-archived characters with no discordId', () => {
    const content = readSrc('app/api/roleplay/characters/npcs/route.ts');
    expect(content).toMatch(/discordId[\s\S]{0,80}exists:\s*false/);
    expect(content).toMatch(/isArchived[\s\S]{0,80}not_equals:\s*true/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "characters/npcs"`
Expected: FAIL (route does not exist).

- [ ] **Step 3: Create the route**

Write `src/app/api/roleplay/characters/npcs/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireGmAdmin, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';

export async function GET(request: NextRequest) {
    const authResult = await requireGmAdmin(request);
    if (isErrorResponse(authResult)) return authResult;

    const payload = await getPayloadClient();
    const result = await payload.find({
        collection: 'characters',
        where: {
            and: [
                { discordId: { exists: false } },
                { isArchived: { not_equals: true } },
            ],
        },
        sort: 'lastName',
        limit: 500,
        depth: 1,
    });

    const npcs = result.docs.map((c: any) => ({
        id: c.id,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        fullName: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        callsign: c.callsign || null,
        avatarUrl: c.avatarUrl || null,
        rankAbbreviation:
            c.rank && typeof c.rank === 'object' && c.rank.abbreviation
                ? c.rank.abbreviation
                : null,
        isTarget: !!c.isTarget,
    }));

    return NextResponse.json({ npcs });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "characters/npcs"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/roleplay/characters/npcs/route.ts tests/comms.test.ts
git commit -m "feat(api): GET /api/roleplay/characters/npcs

Admin-only picker feed for GameMaster mode. Returns all non-archived
characters with no Discord link (NPCs + targets), shaped for the
composer/admin-bar dropdown.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Extend `listChannelsForCharacter` with a GM bypass helper

**Files:**
- Modify: `src/lib/comms.ts` (around lines 436-449)
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('comms.ts listChannelsForGmAdmin', () => {
  it('exports listChannelsForGmAdmin that merges member channels and non-DM bypass channels', () => {
    const content = readSrc('lib/comms.ts');
    expect(content).toMatch(/export async function listChannelsForGmAdmin/);
    // Must exclude DMs
    expect(content).toMatch(/listChannelsForGmAdmin[\s\S]{0,600}'dm'/);
    // Must tag bypass channels with viewerIsGhost
    expect(content).toMatch(/viewerIsGhost/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "listChannelsForGmAdmin"`
Expected: FAIL.

- [ ] **Step 3: Add the helper**

In `src/lib/comms.ts`, immediately after the existing `listChannelsForCharacter` function (around line 449), add:
```typescript
/**
 * GM-mode channel list: returns every channel the character is a member
 * of (tagged viewerIsGhost: false) PLUS every non-DM channel the character
 * is NOT a member of (tagged viewerIsGhost: true). DMs are never included
 * via the bypass — private 1-on-1 conversations stay private even under
 * GM mode. Caller must enforce admin gating before invoking.
 */
export async function listChannelsForGmAdmin(characterId: number) {
    const payload = await getPayloadClient();
    const all = await payload.find({
        collection: 'comms-channels',
        limit: 500,
        sort: '-lastMessageAt',
    });

    const rows = all.docs as any[];
    const out: any[] = [];
    for (const ch of rows) {
        const members: number[] = Array.isArray(ch.members) ? ch.members : [];
        const isMember = members.map(Number).includes(Number(characterId));
        if (isMember) {
            out.push({ ...ch, viewerIsGhost: false });
        } else if (ch.type !== 'dm') {
            out.push({ ...ch, viewerIsGhost: true });
        }
    }
    return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "listChannelsForGmAdmin"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/comms.ts tests/comms.test.ts
git commit -m "feat(comms): add listChannelsForGmAdmin bypass helper

Returns member channels plus every non-DM channel, tagging bypass
entries with viewerIsGhost: true. DMs are never included in the
bypass. Caller is responsible for admin gating.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Wire `?gm=1` into `GET /api/comms/channels`

**Files:**
- Modify: `src/app/api/comms/channels/route.ts` (GET handler, lines 13-59)
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('GET /api/comms/channels ?gm=1', () => {
  it('branches on gm=1 query param using listChannelsForGmAdmin', () => {
    const content = readSrc('app/api/comms/channels/route.ts');
    expect(content).toMatch(/searchParams\.get\(['"]gm['"]\)/);
    expect(content).toContain('listChannelsForGmAdmin');
    expect(content).toContain('requireGmAdmin');
  });

  it('preserves viewerIsGhost on enriched channels', () => {
    const content = readSrc('app/api/comms/channels/route.ts');
    expect(content).toMatch(/viewerIsGhost/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "GET /api/comms/channels ?gm"`
Expected: FAIL.

- [ ] **Step 3: Modify the GET handler**

In `src/app/api/comms/channels/route.ts`, update the imports and the GET handler. The current handler calls `listChannelsForCharacter(eligibility.character.id)`. Replace that single call with a branch.

Add to the imports block at the top:
```typescript
import { requireGmAdmin, isErrorResponse } from '@/lib/api-auth';
import {
    listChannelsForCharacter,
    listChannelsForGmAdmin,
    // (keep existing imports)
} from '@/lib/comms';
```
(Merge with what is already imported from `@/lib/comms`; do not duplicate.)

Inside the GET handler, after `await syncAllAutoChannels();` and BEFORE the existing `const channels = await listChannelsForCharacter(...)` call, insert:
```typescript
const gmMode = request.nextUrl.searchParams.get('gm') === '1';
if (gmMode) {
    const authResult = await requireGmAdmin(request);
    if (isErrorResponse(authResult)) return authResult;
}
```

Then replace the existing `const channels = await listChannelsForCharacter(eligibility.character.id);` line with:
```typescript
const channels = gmMode
    ? await listChannelsForGmAdmin(eligibility.character.id)
    : await listChannelsForCharacter(eligibility.character.id);
```

- [ ] **Step 4: Thread `viewerIsGhost` through enrichment**

The existing code calls `enrichChannelsForDisplay(channels, eligibility.character.id, lastMessageMap)`. The enrichment function in `src/lib/comms.ts` currently builds an `EnrichedChannel` that does not carry `viewerIsGhost`. Extend it minimally.

In `src/lib/comms.ts`, update the `EnrichedChannel` interface (lines 460-483) to add:
```typescript
viewerIsGhost?: boolean;
```
as an optional field at the end of the interface.

Then in the `enrichChannelsForDisplay` implementation (search for the function in the same file), where each channel object is built, copy `viewerIsGhost` through from the source:
```typescript
viewerIsGhost: !!(ch as any).viewerIsGhost,
```
Add this line alongside the other field assignments in the enriched channel literal.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "GET /api/comms/channels ?gm"`
Expected: PASS

- [ ] **Step 6: Full suite regression check**

Run: `npx vitest run`
Expected: PASS (the existing API-auth assertion tests should still match because `requireGmAdmin` also imports from `@/lib/api-auth`).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/comms/channels/route.ts src/lib/comms.ts tests/comms.test.ts
git commit -m "feat(comms): ?gm=1 query bypass on channels list

Admins with ?gm=1 receive every non-DM channel on the site in addition
to their own member channels. Bypass-added channels are tagged
viewerIsGhost: true for UI differentiation. DMs stay strictly private.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Admin read bypass + conditional `postedAsGm` strip on messages GET

**Files:**
- Modify: `src/app/api/comms/channels/[id]/messages/route.ts` (GET handler; membership check near line 38; response mapping at lines 162-194)
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('GET /api/comms/channels/[id]/messages GM read bypass', () => {
  it('admins with gm=1 bypass the membership 403', () => {
    const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
    expect(content).toMatch(/searchParams\.get\(['"]gm['"]\)/);
    expect(content).toContain('checkAdminPermissions');
  });

  it('strips postedAsGm from response when viewer is not admin', () => {
    const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
    // Admin check before attaching postedAsGm to response items
    expect(content).toMatch(/postedAsGm[\s\S]{0,200}isAdmin/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "GM read bypass"`
Expected: FAIL.

- [ ] **Step 3: Add admin context to the GET handler**

In the GET handler of `src/app/api/comms/channels/[id]/messages/route.ts`, after the existing `const session = await getSession(request);` (or wherever the session is obtained), add:
```typescript
const { checkAdminPermissions } = await import('@/lib/admin');
const adminPermissions = session ? await checkAdminPermissions(session) : { isAdmin: false };
const isAdminViewer = !!adminPermissions.isAdmin;
const gmQuery = request.nextUrl.searchParams.get('gm') === '1';
```
If there is already an `import { checkAdminPermissions }` at the top of the file, skip the dynamic import and use the top-level one instead.

- [ ] **Step 4: Bypass the membership 403 for admin+gm**

Locate the existing membership gate:
```typescript
if (!members.includes(character.id)) return 403...
```
(In this file it appears early in the GET handler, similar to the POST handler at lines 229-236.)

Replace it with:
```typescript
if (!members.map(Number).includes(Number(character.id))) {
    if (!(isAdminViewer && gmQuery)) {
        return NextResponse.json({ error: 'Non membre' }, { status: 403 });
    }
}
```

- [ ] **Step 5: Strip `postedAsGm` in the response mapping**

In the response mapping (lines 162-194 of the current file), locate the returned literal `{ id: m.id, channelId: m.channelId, ... }`. Add the conditional flag at the end of that literal, before the closing brace:
```typescript
...(isAdminViewer && m.postedAsGm ? { postedAsGm: true } : {}),
```
The spread ensures the field is absent entirely for non-admins (matching the spec's "field-presence signal" rule).

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "GM read bypass"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/api/comms/channels/[id]/messages/route.ts tests/comms.test.ts
git commit -m "feat(comms): admin GM read bypass + postedAsGm strip

Admins with ?gm=1 can fetch messages from any channel. postedAsGm is
spread into response items only when the viewer is admin — for
non-admins the field is absent entirely, not just false, so
inspection cannot leak the flag.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Strip `postedAsGm` from mod notification feed

**Files:**
- Modify: `src/app/api/roleplay/notifications/pending/route.ts`
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('GET /api/roleplay/notifications/pending', () => {
  it('never includes postedAsGm in response (mod audience is non-admin)', () => {
    const content = readSrc('app/api/roleplay/notifications/pending/route.ts');
    // The field must not appear at all in the response mapping
    expect(content).not.toMatch(/postedAsGm:\s*[^,]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `npx vitest run tests/comms.test.ts -t "notifications/pending"`
Expected: PASS immediately if the route currently does not reference `postedAsGm` (which it does not, since the field does not exist yet). This test is a **regression guard**: once Task 2 lands, no one must accidentally start mapping the field into this endpoint.

- [ ] **Step 3: No code change required this task**

The test is a guard. Confirm by reading `src/app/api/roleplay/notifications/pending/route.ts` and verifying the response mapping does not expose `postedAsGm`. If it does, remove that line.

- [ ] **Step 4: Commit (test only)**

```bash
git add tests/comms.test.ts
git commit -m "test(comms): guard postedAsGm absence on pending notifications

The AR-DiscordLink mod consumes this endpoint as non-admin. Regression
guard to ensure nobody accidentally maps the GM audit flag into the
mod response.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: GM impersonation on `POST /api/comms/channels/[id]/messages`

**Files:**
- Modify: `src/app/api/comms/channels/[id]/messages/route.ts` (POST handler; sender resolution at lines 209-236; payload.create at lines 346-359)
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('POST /api/comms/channels/[id]/messages GM impersonation', () => {
  it('gates gmMode requests with admin check', () => {
    const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
    expect(content).toMatch(/gmMode[\s\S]{0,400}checkAdminPermissions/);
  });

  it('rejects impersonation of Discord-linked characters', () => {
    const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
    expect(content).toMatch(/impersonateCharacterId[\s\S]{0,600}discordId/);
    expect(content).toMatch(/Impersonation limitée aux PNJ et cibles/);
  });

  it('writes postedAsGm true and skips membership check when gmMode', () => {
    const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
    expect(content).toMatch(/postedAsGm:\s*true/);
    // Membership gate must be conditional on !gmMode
    expect(content).toMatch(/!gmMode[\s\S]{0,300}Non membre/);
  });

  it('does not mutate channel.members when gmMode', () => {
    // The POST handler currently has no members.push() — ghost posts must
    // keep that invariant. Assert no new push exists added behind gmMode.
    const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
    expect(content).not.toMatch(/members\.push.*impersonate/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "GM impersonation"`
Expected: FAIL.

- [ ] **Step 3: Parse GM fields from the body**

In the POST handler of `src/app/api/comms/channels/[id]/messages/route.ts`, after the body is parsed (look for `const body = await request.json()` or equivalent), add:
```typescript
const gmMode = body.gmMode === true;
const impersonateCharacterId = gmMode ? Number(body.impersonateCharacterId) : null;
```

- [ ] **Step 4: Admin gate for GM requests**

Immediately after the eligibility check, add:
```typescript
let impersonatedCharacter: any = null;
if (gmMode) {
    const { checkAdminPermissions } = await import('@/lib/admin');
    const perms = await checkAdminPermissions(session);
    if (!perms.isAdmin) {
        return NextResponse.json(
            { error: 'Mode MJ réservé aux administrateurs' },
            { status: 403 },
        );
    }
    if (!impersonateCharacterId || Number.isNaN(impersonateCharacterId)) {
        return NextResponse.json(
            { error: 'impersonateCharacterId manquant' },
            { status: 400 },
        );
    }
    const payloadClient = await getPayloadClient();
    impersonatedCharacter = await payloadClient
        .findByID({
            collection: 'characters',
            id: impersonateCharacterId,
            depth: 0,
        })
        .catch(() => null);
    if (!impersonatedCharacter) {
        return NextResponse.json(
            { error: 'Personnage introuvable' },
            { status: 404 },
        );
    }
    if (impersonatedCharacter.discordId) {
        return NextResponse.json(
            { error: 'Impersonation limitée aux PNJ et cibles' },
            { status: 400 },
        );
    }
    if (impersonatedCharacter.isArchived) {
        return NextResponse.json(
            { error: 'Personnage archivé' },
            { status: 400 },
        );
    }
}
```
(If `getPayloadClient` is already imported at the top of the file, reuse it and drop the local `payloadClient` variable.)

- [ ] **Step 5: Skip the membership check when GM is on**

Locate the existing membership gate at lines 229-236:
```typescript
if (!members.map(Number).includes(eligibility.character.id)) {
    return NextResponse.json({ error: 'Non membre' }, { status: 403 });
}
```
Replace with:
```typescript
if (!gmMode && !members.map(Number).includes(eligibility.character.id)) {
    return NextResponse.json({ error: 'Non membre' }, { status: 403 });
}
```

- [ ] **Step 6: Override sender on the payload.create call**

Locate the `payload.create` call at lines 346-359 and change two fields:
- `senderCharacterId: eligibility.character.id,` → `senderCharacterId: gmMode ? impersonatedCharacter.id : eligibility.character.id,`
- Immediately after `senderDiscordId: session!.discordId,` add: `postedAsGm: gmMode ? true : false,`

Do NOT change `senderDiscordId` — it stays as the admin's real Discord ID. This is additional audit information (the row shows which admin posted as which NPC).

Final call should look like:
```typescript
const created = await payload.create({
    collection: 'comms-messages',
    data: {
        channelId,
        senderCharacterId: gmMode ? impersonatedCharacter.id : eligibility.character.id,
        senderDiscordId: session!.discordId,
        postedAsGm: gmMode ? true : false,
        isAnonymous,
        body: text,
        attachments,
        replyToMessageId: replyToMessageId ?? undefined,
        mentions: mentionIds.length ? mentionIds : undefined,
        senderIp: ip,
    } as any,
});
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "GM impersonation"`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/app/api/comms/channels/[id]/messages/route.ts tests/comms.test.ts
git commit -m "feat(comms): GameMaster impersonation on message POST

Admins with gmMode:true + impersonateCharacterId in the body can post
as any NPC or target character in any channel. Server re-validates
admin status on every request, rejects impersonation of Discord-linked
characters, skips membership check for GM posts, writes postedAsGm:true,
and never mutates channel.members. senderDiscordId stays as the admin's
real identity for the audit trail.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Part C — Client UI

### Task 10: Create `useGmMode` context + hook

**Files:**
- Create: `src/components/comms/useGmMode.tsx`
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('useGmMode context', () => {
  it('exports GmModeProvider and useGmMode', () => {
    const content = readSrc('components/comms/useGmMode.tsx');
    expect(content).toContain('export function GmModeProvider');
    expect(content).toContain('export function useGmMode');
  });

  it('fetches the npc list on enable and exposes effectiveCharacterId', () => {
    const content = readSrc('components/comms/useGmMode.tsx');
    expect(content).toContain("'/api/roleplay/characters/npcs'");
    expect(content).toContain('effectiveCharacterId');
    expect(content).toContain('overrideCharacterId ?? defaultCharacterId');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "useGmMode"`
Expected: FAIL.

- [ ] **Step 3: Create the hook file**

Write `src/components/comms/useGmMode.tsx`:
```typescript
'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

export interface NpcListItem {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    callsign: string | null;
    avatarUrl: string | null;
    rankAbbreviation: string | null;
    isTarget: boolean;
}

interface GmModeState {
    enabled: boolean;
    defaultCharacterId: number | null;
    overrideCharacterId: number | null;
    npcList: NpcListItem[] | null;
    npcListLoading: boolean;
    npcListError: string | null;
}

interface GmModeContextValue extends GmModeState {
    setEnabled: (value: boolean) => void;
    setDefault: (id: number | null) => void;
    setOverride: (id: number | null) => void;
    clearOverride: () => void;
    effectiveCharacterId: number | null;
}

const GmModeContext = createContext<GmModeContextValue | null>(null);

const INITIAL_STATE: GmModeState = {
    enabled: false,
    defaultCharacterId: null,
    overrideCharacterId: null,
    npcList: null,
    npcListLoading: false,
    npcListError: null,
};

export function GmModeProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<GmModeState>(INITIAL_STATE);

    // Fetch the NPC list on first enable. Cached for the lifetime of the
    // provider — re-mounting (e.g. leaving /roleplay/comms) resets it.
    useEffect(() => {
        if (!state.enabled || state.npcList || state.npcListLoading) return;
        let cancelled = false;
        setState((s) => ({ ...s, npcListLoading: true, npcListError: null }));
        fetch('/api/roleplay/characters/npcs', { cache: 'no-store' })
            .then(async (r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const data = await r.json();
                if (cancelled) return;
                setState((s) => ({
                    ...s,
                    npcList: data.npcs || [],
                    npcListLoading: false,
                }));
            })
            .catch((err: any) => {
                if (cancelled) return;
                setState((s) => ({
                    ...s,
                    npcListLoading: false,
                    npcListError: err?.message || 'Erreur de chargement',
                }));
            });
        return () => {
            cancelled = true;
        };
    }, [state.enabled, state.npcList, state.npcListLoading]);

    const setEnabled = useCallback((value: boolean) => {
        setState((s) =>
            value
                ? { ...s, enabled: true }
                : { ...INITIAL_STATE },
        );
    }, []);

    const setDefault = useCallback((id: number | null) => {
        setState((s) => ({ ...s, defaultCharacterId: id, overrideCharacterId: null }));
    }, []);

    const setOverride = useCallback((id: number | null) => {
        setState((s) => ({ ...s, overrideCharacterId: id }));
    }, []);

    const clearOverride = useCallback(() => {
        setState((s) => ({ ...s, overrideCharacterId: null }));
    }, []);

    const value = useMemo<GmModeContextValue>(
        () => ({
            ...state,
            setEnabled,
            setDefault,
            setOverride,
            clearOverride,
            effectiveCharacterId:
                state.overrideCharacterId ?? state.defaultCharacterId,
        }),
        [state, setEnabled, setDefault, setOverride, clearOverride],
    );

    return (
        <GmModeContext.Provider value={value}>{children}</GmModeContext.Provider>
    );
}

export function useGmMode(): GmModeContextValue {
    const ctx = useContext(GmModeContext);
    if (!ctx) {
        throw new Error('useGmMode must be used inside <GmModeProvider>');
    }
    return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "useGmMode"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/comms/useGmMode.tsx tests/comms.test.ts
git commit -m "feat(comms): useGmMode context for ephemeral GM state

React context + hook that owns GameMaster mode state (enabled flag,
default impersonated character, per-message override, cached NPC
picker feed). State is per-tab, per-mount — never persisted. Unmount
resets everything.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Create `AdminBar` component

**Files:**
- Create: `src/components/comms/AdminBar.tsx`
- Modify: `src/app/(frontend)/roleplay/comms/comms.css`
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('AdminBar component', () => {
  it('is admin-gated via isAdmin prop', () => {
    const content = readSrc('components/comms/AdminBar.tsx');
    expect(content).toMatch(/if \(!isAdmin\)\s*return null/);
  });

  it('uses useGmMode context', () => {
    const content = readSrc('components/comms/AdminBar.tsx');
    expect(content).toContain("from './useGmMode'");
    expect(content).toContain('useGmMode()');
  });

  it('renders MJ toggle and picker', () => {
    const content = readSrc('components/comms/AdminBar.tsx');
    expect(content).toContain('MODE MJ');
    expect(content).toContain('Incarner');
    expect(content).toContain('Quitter MJ');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "AdminBar"`
Expected: FAIL.

- [ ] **Step 3: Create the component**

Write `src/components/comms/AdminBar.tsx`:
```typescript
'use client';

import { useGmMode } from './useGmMode';

export function AdminBar({ isAdmin }: { isAdmin: boolean }) {
    if (!isAdmin) return null;
    const {
        enabled,
        defaultCharacterId,
        npcList,
        npcListLoading,
        npcListError,
        setEnabled,
        setDefault,
    } = useGmMode();

    if (!enabled) {
        return (
            <div className="comms-admin-bar comms-admin-bar--off">
                <span className="comms-admin-bar__label">ADMIN</span>
                <button
                    type="button"
                    className="comms-admin-bar__pill"
                    onClick={() => setEnabled(true)}
                    title="Activer le mode MJ"
                >
                    MJ
                </button>
            </div>
        );
    }

    const active =
        defaultCharacterId != null && npcList
            ? npcList.find((n) => n.id === defaultCharacterId) || null
            : null;

    return (
        <div className="comms-admin-bar comms-admin-bar--on">
            <span className="comms-admin-bar__label">MODE MJ</span>
            {active ? (
                <div className="comms-admin-bar__active">
                    {active.avatarUrl && (
                        <img
                            src={active.avatarUrl}
                            alt=""
                            className="comms-admin-bar__avatar"
                        />
                    )}
                    <span>
                        {active.rankAbbreviation ? `(${active.rankAbbreviation}) ` : ''}
                        {active.fullName}
                        {active.isTarget ? ' — CIBLE' : ''}
                    </span>
                    <button
                        type="button"
                        className="comms-admin-bar__swap"
                        onClick={() => setDefault(null)}
                        title="Changer de personnage incarné"
                    >
                        Changer
                    </button>
                </div>
            ) : (
                <div className="comms-admin-bar__picker">
                    {npcListLoading && <span>Chargement…</span>}
                    {npcListError && (
                        <span className="comms-admin-bar__error">
                            {npcListError}
                        </span>
                    )}
                    {npcList && (
                        <select
                            value=""
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v) && v > 0) setDefault(v);
                            }}
                            className="comms-admin-bar__select"
                        >
                            <option value="">Incarner…</option>
                            {npcList.map((n) => (
                                <option key={n.id} value={n.id}>
                                    {n.rankAbbreviation ? `(${n.rankAbbreviation}) ` : ''}
                                    {n.fullName}
                                    {n.isTarget ? ' — CIBLE' : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}
            <button
                type="button"
                className="comms-admin-bar__quit"
                onClick={() => setEnabled(false)}
                title="Désactiver le mode MJ"
            >
                Quitter MJ
            </button>
        </div>
    );
}
```

- [ ] **Step 4: Add styles**

Append to `src/app/(frontend)/roleplay/comms/comms.css`:
```css
/* === Admin bar (GM mode) === */
.comms-admin-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.4rem 1rem;
    background: rgba(255, 176, 32, 0.08);
    border-bottom: 1px solid rgba(255, 176, 32, 0.35);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #f5b94a;
    min-height: 32px;
}
.comms-admin-bar--on {
    background: rgba(255, 176, 32, 0.18);
}
.comms-admin-bar__label {
    font-weight: 700;
    letter-spacing: 0.08em;
}
.comms-admin-bar__pill,
.comms-admin-bar__quit,
.comms-admin-bar__swap {
    margin-left: auto;
    background: rgba(255, 176, 32, 0.2);
    color: #f5b94a;
    border: 1px solid rgba(255, 176, 32, 0.55);
    padding: 0.25rem 0.65rem;
    border-radius: 3px;
    font-family: inherit;
    font-size: 0.72rem;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 120ms ease;
}
.comms-admin-bar__pill:hover,
.comms-admin-bar__quit:hover,
.comms-admin-bar__swap:hover {
    background: rgba(255, 176, 32, 0.32);
}
.comms-admin-bar__quit {
    background: rgba(255, 60, 60, 0.15);
    border-color: rgba(255, 60, 60, 0.5);
    color: #ff8080;
}
.comms-admin-bar__quit:hover {
    background: rgba(255, 60, 60, 0.28);
}
.comms-admin-bar__active {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.comms-admin-bar__avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(255, 176, 32, 0.55);
}
.comms-admin-bar__picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1 1 auto;
}
.comms-admin-bar__select {
    background: rgba(0, 0, 0, 0.45);
    color: #f5b94a;
    border: 1px solid rgba(255, 176, 32, 0.45);
    padding: 0.22rem 0.4rem;
    font-family: inherit;
    font-size: 0.75rem;
    text-transform: uppercase;
    max-width: 320px;
}
.comms-admin-bar__error {
    color: #ff8080;
}
.comms-admin-bar__swap {
    margin-left: 0.35rem;
}

/* Ghost channel dot */
.comms-channel-item.is-ghost .comms-channel-name::after {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f5b94a;
    margin-left: 0.45rem;
    vertical-align: middle;
    box-shadow: 0 0 4px rgba(255, 176, 32, 0.6);
}

/* MJ tag in message list */
.comms-message-mj-tag {
    display: inline-block;
    background: rgba(255, 176, 32, 0.18);
    color: #f5b94a;
    border: 1px solid rgba(255, 176, 32, 0.55);
    padding: 0 0.35rem;
    margin-left: 0.35rem;
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: 2px;
}

/* Composer puppet chip */
.comms-composer-puppet-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(255, 176, 32, 0.14);
    border: 1px solid rgba(255, 176, 32, 0.5);
    color: #f5b94a;
    padding: 0.2rem 0.55rem;
    border-radius: 3px;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-right: 0.5rem;
    cursor: pointer;
}
.comms-composer-puppet-chip:hover {
    background: rgba(255, 176, 32, 0.22);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "AdminBar"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/comms/AdminBar.tsx src/app/\(frontend\)/roleplay/comms/comms.css tests/comms.test.ts
git commit -m "feat(comms): AdminBar component with GM toggle

Admin-only strip rendered above the profile bar. Starts as a thin
amber pill labelled MJ; activating it expands into a picker for
selecting the impersonated NPC/target. Designed as an extensible
admin-feature container.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Wire `GmModeProvider` + `AdminBar` into `CommsLayout` and thread GM through `loadChannels`/`handleSend`

**Files:**
- Modify: `src/components/comms/CommsLayout.tsx`
- Test: `tests/comms.test.ts`

This task does NOT touch the composer UI (chip comes in Task 13) or the MessageList MJ tag (Task 14). It only wires the provider and sends GM-aware requests.

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('CommsLayout GM wiring', () => {
  it('wraps return in GmModeProvider', () => {
    const content = readSrc('components/comms/CommsLayout.tsx');
    expect(content).toContain("from './useGmMode'");
    expect(content).toContain('GmModeProvider');
    expect(content).toContain('<AdminBar');
  });

  it('loadChannels appends ?gm=1 when enabled', () => {
    const content = readSrc('components/comms/CommsLayout.tsx');
    expect(content).toMatch(/\/api\/comms\/channels[\s\S]{0,200}\?gm=1/);
  });

  it('handleSend includes gmMode and impersonateCharacterId when enabled', () => {
    const content = readSrc('components/comms/CommsLayout.tsx');
    expect(content).toContain('gmMode:');
    expect(content).toContain('impersonateCharacterId:');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "GM wiring"`
Expected: FAIL.

- [ ] **Step 3: Split CommsLayout into outer provider + inner body**

Because `useGmMode()` must be called **inside** the provider, the component's body needs to live below the provider. Rename the existing exported function `CommsLayout` to `CommsLayoutInner` (keep it as `function CommsLayoutInner(props) { ... }`), then add a new wrapper at the bottom of the file:

```typescript
export function CommsLayout(props: { character: ActiveCharacter; isAdmin: boolean }) {
    return (
        <GmModeProvider>
            <CommsLayoutInner {...props} />
        </GmModeProvider>
    );
}
```

Update the `CommsLayoutInner` prop signature to accept `isAdmin: boolean` alongside the existing `character` prop. Update any callers (the `page.tsx` that mounts `<CommsLayout>`) to pass `isAdmin` — locate the server component page and pass the existing server-side admin flag.

- [ ] **Step 4: Add imports**

At the top of `src/components/comms/CommsLayout.tsx`, add:
```typescript
import { GmModeProvider, useGmMode } from './useGmMode';
import { AdminBar } from './AdminBar';
```

- [ ] **Step 5: Use the hook inside `CommsLayoutInner`**

Inside `CommsLayoutInner`, immediately after the existing `useState`/`useRef` declarations, add:
```typescript
const gm = useGmMode();
```

- [ ] **Step 6: Mount `<AdminBar />` in the return**

In the return statement, insert `<AdminBar isAdmin={isAdmin} />` immediately **before** `<div className="comms-profile-bar" ...>`. The AdminBar handles its own null-render when `!isAdmin`.

- [ ] **Step 7: Update `loadChannels` to use `?gm=1`**

In the existing `loadChannels` function (search for `fetch('/api/comms/channels')`), replace the single fetch line with:
```typescript
const url = gm.enabled
    ? '/api/comms/channels?gm=1'
    : '/api/comms/channels';
const res = await fetch(url);
```

- [ ] **Step 8: Update `handleSend` to send GM fields**

In `handleSend`, locate the `JSON.stringify(payload)` call. Change it so the POST body includes GM fields when enabled:
```typescript
const effectiveId = gm.effectiveCharacterId;
const requestBody = gm.enabled && effectiveId != null
    ? { ...payload, gmMode: true, impersonateCharacterId: effectiveId }
    : payload;
const res = await fetch(`/api/comms/channels/${activeId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
});
```
After a successful response, call `gm.clearOverride();` so the per-message override does not leak into the next send.

- [ ] **Step 9: Refetch channels when GM mode flips**

Add a new effect near the other `useEffect` calls in `CommsLayoutInner`:
```typescript
useEffect(() => {
    loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [gm.enabled]);
```

- [ ] **Step 10: Ghost channel indicator in ChannelList**

Open `src/components/comms/ChannelList.tsx`. In the channel map at lines 39-72, add `is-ghost` to the className when the channel has the flag:
```typescript
className={`comms-channel-item${activeId === ch.id ? ' active' : ''}${mentionCount > 0 ? ' has-mentions' : ''}${(ch as any).viewerIsGhost ? ' is-ghost' : ''}`}
```
Also update the `CommsChannel` interface in `CommsLayout.tsx` to add:
```typescript
viewerIsGhost?: boolean;
```
as an optional field.

- [ ] **Step 11: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "GM wiring"`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add src/components/comms/CommsLayout.tsx src/components/comms/ChannelList.tsx tests/comms.test.ts
git commit -m "feat(comms): wire GmModeProvider + AdminBar into CommsLayout

CommsLayout splits into an outer provider wrapper and an inner body.
AdminBar mounts above the profile bar. loadChannels appends ?gm=1
when GM mode is on; handleSend forwards gmMode + impersonateCharacterId.
ChannelList renders a small amber dot on viewerIsGhost channels.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Composer puppet chip (hybrid per-message override)

**Files:**
- Modify: `src/components/comms/MessageComposer.tsx` (toolbar row around lines 415-445)
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('MessageComposer GM puppet chip', () => {
  it('renders puppet chip when gm.enabled', () => {
    const content = readSrc('components/comms/MessageComposer.tsx');
    expect(content).toContain("from './useGmMode'");
    expect(content).toContain('useGmMode()');
    expect(content).toContain('comms-composer-puppet-chip');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "puppet chip"`
Expected: FAIL.

- [ ] **Step 3: Add the chip**

In `src/components/comms/MessageComposer.tsx`, add the import at the top:
```typescript
import { useGmMode } from './useGmMode';
```

Inside the component body (near the other `useState` declarations), add:
```typescript
const gm = useGmMode();
const [showPuppetPicker, setShowPuppetPicker] = useState(false);
const activePuppetId = gm.overrideCharacterId ?? gm.defaultCharacterId;
const activePuppet =
    gm.npcList && activePuppetId != null
        ? gm.npcList.find((n) => n.id === activePuppetId) || null
        : null;
```

In the toolbar JSX at lines 415-445, **immediately before** the `<button type="submit" className="comms-send-btn"...>` line, insert:
```tsx
{gm.enabled && (
    <div style={{ position: 'relative' }}>
        <button
            type="button"
            className="comms-composer-puppet-chip"
            onClick={() => setShowPuppetPicker((v) => !v)}
            title="Changer de personnage incarné pour ce message"
            disabled={disabled}
        >
            {activePuppet
                ? `MJ · ${activePuppet.callsign || activePuppet.fullName}`
                : 'MJ · sélectionner…'}
        </button>
        {showPuppetPicker && gm.npcList && (
            <div
                style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    background: 'rgba(20, 14, 6, 0.97)',
                    border: '1px solid rgba(255,176,32,0.5)',
                    padding: '0.35rem',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    zIndex: 20,
                    minWidth: '220px',
                }}
            >
                {gm.npcList.map((n) => (
                    <button
                        type="button"
                        key={n.id}
                        onClick={() => {
                            gm.setOverride(n.id);
                            setShowPuppetPicker(false);
                        }}
                        style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: '#f5b94a',
                            padding: '0.25rem 0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                        }}
                    >
                        {n.rankAbbreviation ? `(${n.rankAbbreviation}) ` : ''}
                        {n.fullName}
                        {n.isTarget ? ' — CIBLE' : ''}
                    </button>
                ))}
            </div>
        )}
    </div>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "puppet chip"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/comms/MessageComposer.tsx tests/comms.test.ts
git commit -m "feat(comms): per-message puppet chip in composer

When GM mode is on, the composer shows a compact chip identifying
the effective impersonated character. Clicking it reveals a
dropdown to override for a single message; clearOverride after
send brings the default back.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 14: `[MJ]` tag in MessageList

**Files:**
- Modify: `src/components/comms/MessageList.tsx` (sender header block, lines 95-126)
- Test: `tests/comms.test.ts`

- [ ] **Step 1: Write the failing test**

Append:
```typescript
describe('MessageList MJ tag', () => {
  it('renders MJ tag when postedAsGm is true', () => {
    const content = readSrc('components/comms/MessageList.tsx');
    expect(content).toContain('comms-message-mj-tag');
    expect(content).toMatch(/m\.postedAsGm/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/comms.test.ts -t "MJ tag"`
Expected: FAIL.

- [ ] **Step 3: Extend the CommsMessage interface**

In `src/components/comms/CommsLayout.tsx` find the `CommsMessage` interface and add:
```typescript
postedAsGm?: boolean;
```
as an optional field at the end.

- [ ] **Step 4: Render the tag**

In `src/components/comms/MessageList.tsx`, locate the `<div className="comms-message-header">` block (lines 95-126). Immediately after the sender name element (button or span), **before** the `<span className="comms-message-time">` line, add:
```tsx
{m.postedAsGm && (
    <span className="comms-message-mj-tag" title="Posté en mode MJ (visible aux admins uniquement)">
        [MJ]
    </span>
)}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/comms.test.ts -t "MJ tag"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/comms/MessageList.tsx src/components/comms/CommsLayout.tsx tests/comms.test.ts
git commit -m "feat(comms): [MJ] tag on messages posted via GameMaster mode

Only renders when the message has postedAsGm in the payload. Because
non-admins never receive the field from the API, the tag is
automatically invisible to them — no extra viewer check needed.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Part D — Migration, version, deploy

### Task 15: Apply the database migration on dev

**Files:** None modified in-repo. This is an ops step.

- [ ] **Step 1: SSH into the dev VPS and apply the migration idempotently**

Per CLAUDE.md's migration gotcha (Ansible does not run `payload migrate`), apply the SQL by hand:
```bash
ssh lif-server
sudo -u postgres psql -d lif_website_dev -c "ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS posted_as_gm BOOLEAN DEFAULT FALSE;"
sudo -u postgres psql -d lif_website_dev -c "INSERT INTO payload_migrations (name, batch) VALUES ('20260409_180000_comms_messages_posted_as_gm', (SELECT COALESCE(MAX(batch), 0) + 1 FROM payload_migrations)) ON CONFLICT DO NOTHING;"
```
Expected: both commands return `ALTER TABLE` / `INSERT 0 1` (or `0 0` if the row was already inserted from a prior partial run).

- [ ] **Step 2: Verify the column exists**

```bash
sudo -u postgres psql -d lif_website_dev -c "\d comms_messages" | grep posted_as_gm
```
Expected: one line showing `posted_as_gm | boolean | | | false`.

- [ ] **Step 3: No commit (ops-only step)**

---

### Task 16: Version bump

**Files:**
- Modify: `src/lib/version.ts`

- [ ] **Step 1: Read the current version**

```bash
grep "version: '" src/lib/version.ts | head -3
```
Note the current version (most recently `1.6.48`). The next version is whatever comes after it at the time of this deploy.

- [ ] **Step 2: Bump version and prepend changelog entry**

In `src/lib/version.ts`:
- Change `version: '1.6.48'` (or the current value) to the next patch version.
- Insert a new entry at the top of the `changelog` array:
```typescript
{
    version: '1.6.49',
    date: '2026-04-09',
    changes: [
        'ROLEPLAY — Nouvel onglet `PNJ` sur la page `/roleplay` (admin uniquement) qui sépare les personnages non-joueurs (créés par les admins sans Discord ID et non marqués comme cible) du listing principal `Personnel`. La règle de dérivation est `!discordId && !isTarget`, sans migration ni changement de schéma — c\'est un filtre UI pur. L\'onglet `Personnel` ne montre désormais que les personnages de vrais joueurs.',
        'COMMS — Nouveau mode MJ (GameMaster) pour les administrateurs. Activation via le bouton `MJ` dans la nouvelle barre d\'admin au-dessus du profil. En mode MJ l\'admin peut : (1) sélectionner un PNJ ou une cible à incarner via la barre d\'admin, (2) voir tous les canaux faction/unité/groupe du site (les DM restent strictement privés), (3) envoyer des messages dans n\'importe lequel de ces canaux **sans être ajouté à la liste de membres** (ghost-post, aucun impact sur les compteurs de présence ou de membres), (4) surcharger ponctuellement l\'incarnation via un chip compact dans le compositeur de message. Les messages postés en mode MJ sont stockés avec un flag `postedAsGm` dans la base ; ce flag est visible aux autres admins sous forme d\'un tag `[MJ]` à côté du nom de l\'expéditeur, mais **strictement masqué** aux non-admins (le champ n\'est même pas présent dans la réponse JSON pour eux, impossible de le détecter via DevTools). Les personnages de vrais joueurs ne peuvent jamais être incarnés — seuls les PNJ et cibles sont éligibles. Toute requête en mode MJ est re-validée côté serveur à chaque appel — aucun état de session persistant.',
    ],
},
```
(Adjust `version: '1.6.49'` to match whatever the real next version is at deploy time.)

- [ ] **Step 3: Run version tests**

```bash
npx vitest run tests/version.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/version.ts
git commit -m "chore: bump version to 1.6.49

NPC tab on personnel page + GameMaster mode in comms.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 17: Deploy to dev

- [ ] **Step 1: Push**

```bash
git push origin dev
```

- [ ] **Step 2: Run the dev deploy skill**

Invoke `/deploy-dev`. This runs Ansible, which pulls the branch, installs deps, runs the full Vitest suite, builds, restarts the service, and health-checks https://dev.lif-arma.com/.

Expected: tests pass (all previous tests + the new ones added in tasks 1-14), build succeeds, HTTP 200 on the external health check.

- [ ] **Step 3: Manual smoke test (required before prod)**

On https://dev.lif-arma.com as an admin account:
1. Visit `/roleplay` — confirm the `PNJ` tab exists, contains only NPC characters, and is hidden when logged in as a non-admin.
2. Visit `/roleplay/comms` — confirm the amber ADMIN bar appears above the profile bar with an `MJ` pill button.
3. Click `MJ` — the bar expands, the NPC dropdown appears and populates.
4. Pick an NPC. The bar updates to show the incarnated character.
5. Observe the channel list grows to include faction/unit/group channels the admin is not a member of, each with a small amber dot. Confirm DMs are NOT added.
6. Open a non-member channel, type a message, send it. Verify:
   - Message appears in the channel with the NPC as the sender.
   - As the admin viewer, the `[MJ]` tag is visible next to the NPC name.
   - The channel member count did NOT increase.
7. Open the message composer puppet chip, pick a different NPC, send again. Verify sender overrides per-message and reverts after send.
8. Log out, log in as a non-admin, visit the same channel. Verify:
   - The ghost-posted message appears with the NPC as the sender, no `[MJ]` tag.
   - DevTools network inspection on the messages endpoint shows no `postedAsGm` field on any message.
9. Click `Quitter MJ` (as admin). Confirm the bar collapses, the bypass channels disappear, and sending a message posts as the admin's own character again.

If any of these fail, fix before prod deploy.

- [ ] **Step 4: No commit (deploy-only step)**

---

## Self-review notes

**Spec coverage:**
- Feature 1 NPC tab → Task 1 ✅
- `postedAsGm` field + migration → Task 2 ✅
- `requireGmAdmin` helper → Task 3 ✅
- `/api/roleplay/characters/npcs` endpoint → Task 4 ✅
- `listChannelsForGmAdmin` helper → Task 5 ✅
- `?gm=1` on channels list → Task 6 ✅
- Admin read bypass + `postedAsGm` strip on messages GET → Task 7 ✅
- `postedAsGm` strip on pending notifications → Task 8 (regression guard) ✅
- GM impersonation on messages POST → Task 9 ✅
- `useGmMode` context → Task 10 ✅
- `AdminBar` component → Task 11 ✅
- `GmModeProvider` + `AdminBar` wiring into CommsLayout + `loadChannels`/`handleSend` + ghost channel indicator → Task 12 ✅
- Composer puppet chip → Task 13 ✅
- `[MJ]` tag in MessageList → Task 14 ✅
- Migration apply → Task 15 ✅
- Version bump → Task 16 ✅
- Deploy → Task 17 ✅

**Non-goals honored:** No character switcher for real players, no persisted GM state, no impersonation of real players, no typing/presence fakes, no DM bypass, no `isNpc`/`characterType` schema change.

**Placeholder scan:** No TBDs, no "add error handling", no "similar to Task N". Each code step shows exact code.

**Type consistency:** `NpcListItem` shape in Task 10 matches the API response shape in Task 4. `viewerIsGhost` is defined as optional boolean in both `listChannelsForGmAdmin` (Task 5) and `EnrichedChannel` (Task 6) and `CommsChannel` (Task 12). `postedAsGm` is `checkbox` in the collection (Task 2), conditionally-spread boolean in API response (Task 7), and optional `postedAsGm?: boolean` on `CommsMessage` interface (Task 14). `GmMode` enabled/default/override shape (Task 10) matches the consumers in Tasks 11, 12, 13.
