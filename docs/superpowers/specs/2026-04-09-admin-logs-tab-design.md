# Admin Logs Tab — Design

**Date:** 2026-04-09
**Status:** Draft — pending user review before implementation plan
**Target version:** 1.6.57 (or next minor bump after merge)

## Summary

Add a 5th tab "Journal admin" to `/moderation` that shows every admin action
taken through the LIF website — who did it, when, on what entity, and exactly
what changed. The tab is full-admin-only, supports filter-by-actor /
filter-by-action-type / filter-by-entity-type / date-range / full-text search,
and displays a field-level diff for mutation events.

## Goals

1. **Accountability.** A full admin can see, retrospectively, exactly what
   changes another admin made to any collection.
2. **Attribution to the Discord session user**, not to a Payload CMS user —
   admins authenticate via Discord OAuth and never touch Payload's `/admin`.
3. **Non-breaking.** Audit logging must never interfere with the admin action
   it records. A failed log write produces a `console.error` and nothing else.
4. **Greppable & provably complete.** A source-level test fails CI if any new
   admin-gated API route performs a Payload mutation without calling the
   logging helper.

## Non-goals

- Live monitoring / streaming. The tab is retrospective.
- Payload `/admin` UI coverage. Admins do not use it (confirmed with user).
- Logging failed admin attempts (400/403/409). Success only.
- Logging `moderation.tab.open` or any high-volume low-signal event.
- Rolling back an admin action from the log. "Audit only" for now.

## Architecture overview

```
   ┌────────────────────────┐
   │  Admin clicks "Save"   │
   │  in /roleplay, /comms, │
   │  /moderation           │
   └──────────┬─────────────┘
              │
              ▼
   ┌────────────────────────────┐
   │ Admin API route            │
   │   requireAdmin(req) ───────┼──► session (actor)
   │   fetch doc BEFORE         │
   │   payload.update / create  │
   │   logAdminAction({...})    │──► AdminLogs collection (diff)
   └────────────────────────────┘
              │
              ▼
   /moderation → AdminLogsTab
              │
              ▼
   GET /api/moderation/admin-logs  (requireFullAdmin, filtered paginated reverse-chrono)

   Cron (src/lib/admin-log-retention-cron.ts)
     every 24h → DELETE from admin_logs WHERE created_at < now() - 180 days
```

### Key invariants

1. The log write is best-effort and does NOT block or fail the admin action.
   `logAdminAction()` swallows its own errors and console.errors them.
2. The log write happens AFTER the mutation succeeds. Failed mutations
   produce no entry.
3. Actor is always the Discord session user, never a Payload user.
4. Actor fields are denormalized (snapshot at log time) so later Discord
   username/avatar changes do not rewrite history.

## Data model

New Payload collection `AdminLogs` at `src/collections/AdminLogs.ts`:

```ts
{
  slug: 'admin-logs',
  access: {
    read:   isFullAdmin,
    create: () => false,  // server-only via logAdminAction()
    update: () => false,
    delete: isFullAdmin,  // for retention cron + manual purge
  },
  admin: { hidden: true }, // don't expose in Payload /admin sidebar
  fields: [
    // ── Actor (Discord session snapshot, denormalized) ──
    { name: 'actorDiscordId',       type: 'text', required: true, index: true },
    { name: 'actorDiscordUsername', type: 'text', required: true },
    { name: 'actorDiscordAvatar',   type: 'text' },
    { name: 'actorAdminLevel',      type: 'text' },  // 'full' | 'moderator' | ...

    // ── Action ──
    // Dotted namespace: <entity>.<verb> — e.g. character.update,
    // faction.create, gm.enter, character.link.admin_override.
    { name: 'action', type: 'text', required: true, index: true },

    // Human-readable French label computed at log time, e.g.
    // "A modifié le personnage Jean Dupont (SGT / 1er RCM)"
    { name: 'summary', type: 'text', required: true },

    // ── Target entity (nullable for non-mutation events like gm.enter) ──
    { name: 'entityType',  type: 'text', index: true },
    { name: 'entityId',    type: 'text' },
    { name: 'entityLabel', type: 'text' },

    // ── Diff (nullable for non-mutation events) ──
    // Structured as { field: { before, after } } over ONLY the fields that
    // actually changed. Internal fields (id, updatedAt, createdAt, _status)
    // are always excluded.
    { name: 'diff', type: 'json' },

    // Free-form metadata for event-specific context that doesn't fit the
    // diff shape — e.g. for gm.impersonate: { npcId, npcName }.
    { name: 'metadata', type: 'json' },

    // ── Request context ──
    { name: 'ip',        type: 'text' },
    { name: 'userAgent', type: 'text' },
  ],
  timestamps: true,
}
```

**Indexes** (in addition to Payload defaults): `actor_discord_id`, `action`,
`entity_type`, `created_at`.

**Migration handling:** per `CLAUDE.md`, Ansible does not run `payload
migrate` automatically. The migration must be idempotent: `CREATE TABLE IF
NOT EXISTS admin_logs (...)` plus `CREATE INDEX IF NOT EXISTS`, followed by
`INSERT INTO payload_migrations (name, batch) VALUES (...)` to mark it
applied. The plan will include the exact SQL to run manually on the VPS.

## Capture mechanism

### Helper: `src/lib/admin-log.ts`

```ts
import { getPayloadClient } from './payload';
import type { SessionData } from './session';
import type { AdminPermissions } from './admin';
import type { NextRequest } from 'next/server';

interface LogEntry {
  session: SessionData;
  permissions?: AdminPermissions;
  action: string;                    // 'character.update', 'gm.enter', ...
  summary: string;                   // pre-formatted French label
  entityType?: string;
  entityId?: string | number;
  entityLabel?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}

export async function logAdminAction(entry: LogEntry): Promise<void> {
  try {
    const payload = await getPayloadClient();
    // Unified diff semantics:
    //   update → { field: { before, after } } for changed fields only
    //   create → { field: { before: null, after: <value> } } for every field
    //   delete → { field: { before: <value>, after: null } } for every field
    //   non-mutation (gm.enter etc.) → null, metadata carries the context
    let diff: Record<string, { before: unknown; after: unknown }> | null = null;
    if (entry.before && entry.after) {
      diff = computeDiff(entry.before, entry.after);
    } else if (entry.after) {
      diff = inflateSnapshot(entry.after, 'create');
    } else if (entry.before) {
      diff = inflateSnapshot(entry.before, 'delete');
    }
    // Skip only the update-with-no-change case. Create/delete always log.
    if (
      entry.before && entry.after &&
      diff && Object.keys(diff).length === 0 &&
      !entry.metadata
    ) return;

    await payload.create({
      collection: 'admin-logs',
      data: {
        actorDiscordId:       entry.session.discordId,
        actorDiscordUsername: entry.session.discordUsername,
        actorDiscordAvatar:   entry.session.discordAvatar ?? null,
        actorAdminLevel:      entry.permissions?.level ?? null,
        action:               entry.action,
        summary:              entry.summary,
        entityType:           entry.entityType ?? null,
        entityId:             entry.entityId != null ? String(entry.entityId) : null,
        entityLabel:          entry.entityLabel ?? null,
        diff:                 diff,
        metadata:             entry.metadata ?? null,
        ip:                   extractIp(entry.request),
        userAgent:            entry.request?.headers.get('user-agent') ?? null,
      },
    });
  } catch (err) {
    // Audit logging must NEVER break an admin action. Swallow.
    console.error('[admin-log] failed to write entry:', err);
  }
}

const IGNORED_DIFF_FIELDS = new Set(['id', 'updatedAt', 'createdAt', '_status']);

function computeDiff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (IGNORED_DIFF_FIELDS.has(k)) continue;
    // Shallow JSON-equality. Arrays and nested objects are compared by their
    // stringified form. If this proves noisy (e.g. array order churn), tune
    // later by sorting arrays before compare — NOT in v1.
    if (JSON.stringify(before[k]) === JSON.stringify(after[k])) continue;
    diff[k] = { before: before[k], after: after[k] };
  }
  return diff;
}

function inflateSnapshot(
  doc: Record<string, unknown>,
  mode: 'create' | 'delete',
): Record<string, { before: unknown; after: unknown }> {
  const out: Record<string, { before: unknown; after: unknown }> = {};
  for (const k of Object.keys(doc)) {
    if (IGNORED_DIFF_FIELDS.has(k)) continue;
    out[k] = mode === 'create'
      ? { before: null, after: doc[k] }
      : { before: doc[k], after: null };
  }
  return out;
}

function extractIp(req?: NextRequest): string | null {
  if (!req) return null;
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null
  );
}
```

### Call sites (admin mutation routes)

Each admin mutation route is updated to:
1. Fetch the doc *before* mutation (for `update` / `delete` only).
2. Call the Payload mutation.
3. Call `logAdminAction({...})` fire-and-forget (`void` prefix).

Example shape for a PATCH:

```ts
const auth = await requireAdmin(request);
if (isErrorResponse(auth)) return auth;

const payload = await getPayloadClient();
const before = await payload.findByID({ collection: 'characters', id });
const updated = await payload.update({
  collection: 'characters',
  id,
  data: body,
});

void logAdminAction({
  session: auth.session,
  permissions: auth.permissions,
  action: 'character.update',
  summary: `A modifié le personnage ${updated.fullName}`,
  entityType: 'character',
  entityId: updated.id,
  entityLabel: updated.fullName,
  before,
  after: updated,
  request,
});
```

### Routes in scope

| Route | Action(s) |
|---|---|
| `api/roleplay/characters` POST | `character.create` |
| `api/roleplay/characters/[id]` PATCH | `character.update` |
| `api/roleplay/characters/[id]` DELETE | `character.delete` |
| `api/roleplay/timeline` POST | `character_timeline.create` |
| `api/roleplay/timeline/[id]` PATCH/DELETE | `character_timeline.update/delete` |
| `api/roleplay/factions` POST/PATCH/DELETE | `faction.create/update/delete` |
| `api/roleplay/units` POST/PATCH/DELETE | `unit.create/update/delete` |
| `api/roleplay/intelligence` POST/PATCH/DELETE | `intelligence.create/update/delete` |
| `api/moderation/cases` POST/PATCH | `moderation_case.create/update` |
| `api/moderation/sanctions` POST/DELETE | `moderation_sanction.create/delete` |
| `api/comms/channels` POST/PATCH/DELETE (admin only) | `comms_channel.*` |
| `api/comms/channels/[id]/messages` DELETE (admin only) | `comms_message.delete` |
| (TBD) `api/roleplay/link/admin-override` | `character.link.admin_override` |
| (TBD) `api/comms/gm` enter/exit/impersonate | `gm.enter` / `gm.exit` / `gm.impersonate` |

Exact route paths for the last two groups will be verified during the
implementation plan. Some endpoints may not exist yet and will need
lightweight additions (or piggyback on existing calls).

### Non-mutation event scope (from Q6b)

- `gm.enter` — admin toggles GameMaster mode ON in /comms
- `gm.exit` — admin toggles GameMaster mode OFF in /comms
- `gm.impersonate` — admin selects a puppet NPC to speak as (metadata: `{ npcId, npcName }`)
- `character.link.admin_override` — admin manually sets a character's `biId` (bypassing the code flow)

Not in scope: `moderation.tab.open`, authentication events, disclaimer
acceptance, cron auto-sync, Discord role refresh, `/api/auth/me` polling.

## UI

### Tab wiring

Edit `src/app/(frontend)/moderation/page.tsx`:
- Extend the `tab` state union at line 30-32 with `'admin-logs'`.
- Add a 5th `<button>` in the tabs row at line 180-205 labeled "Journal admin".
- Render `<AdminLogsTab authorized={authorized} onError={setError} />` when
  `tab === 'admin-logs'`.
- Hide the tab button entirely when `adminLevel !== 'full'` (Q4a = B).

### Component: `src/components/moderation/AdminLogsTab.tsx`

Structure:
```
┌─────────────────────────────────────────────────────────────────┐
│  🔎 Recherche (nom d'entité, contenu du diff)                  │
│  Acteur ▾  Type d'action ▾  Type d'entité ▾  Du __ au __  [×] │
├─────────────────────────────────────────────────────────────────┤
│  ▼ il y a 3 min · Boris · character.update                      │
│     A modifié le personnage Jean Dupont                         │
│     ┌───────────────────────────────────────────────────┐       │
│     │  rank   : CPL → SGT                               │       │
│     │  unit   : 1er RCM → 2e BCP                        │       │
│     └───────────────────────────────────────────────────┘       │
│  ▶ il y a 7 min · Alex · gm.enter                               │
│     A activé le mode GameMaster en /comms                       │
│  …                                                              │
│                    [ Charger 50 de plus ]                       │
└─────────────────────────────────────────────────────────────────┘
```

**Row behavior:**
- Collapsed: one line — `[time] · [actor username] · [action] — [summary]`
- Expanded: diff table (`field: before → after`) or metadata JSON
- Click actor → sets actor filter
- Click action chip → sets action filter
- Click entity label → deep-link to the entity (`/roleplay/personnage/<id>`,
  etc.) when resolvable; plain text for deleted entities
- Relative time ("il y a 3 min") with exact timestamp in `title=`

**Filters:**
- Actor dropdown — populated from facets endpoint
- Action type dropdown — grouped by entity namespace
- Entity type dropdown — distinct values
- Date range — two `<input type="date">`
- Search box — 400ms debounce, matches `summary` + `entityLabel` +
  `jsonb_path_exists` scan of `diff`
- URL query string mirrors filter state (survives reload/navigation)
- Manual "⟳ Actualiser" button — no auto-polling (tab is retrospective)

### API: `GET /api/moderation/admin-logs`

- Gate: `requireFullAdmin`
- Query params: `actor`, `action`, `entityType`, `dateFrom`, `dateTo`, `q`,
  `cursor`, `limit` (default 50, max 200)
- Cursor pagination on `createdAt` + `id` (stable under concurrent writes)
- Response: `{ entries, nextCursor }`

### API: `GET /api/moderation/admin-logs/facets`

- Gate: `requireFullAdmin`
- Returns `{ actors: [{id, username, avatar, count}], actions: [...], entityTypes: [...] }`
- Facets reflect the unfiltered universe of entries (so selecting one actor
  does not erase the others from the dropdown)
- Server-side cached 60s via a single in-memory entry, invalidated on TTL
  only — acceptable staleness because the dropdown is a navigation aid, not
  authoritative state

### CSS

Extend `src/app/(frontend)/moderation/moderation.css` with a new
`.mod-admin-logs` block. Matches existing tab aesthetic.

## Retention

### Cron: `src/lib/admin-log-retention-cron.ts`

- Prunes rows where `createdAt < now() - 180 days`
- Runs once at startup (with 60s delay) then every 24h via `setInterval`
- Guarded by a module-level `started` flag to prevent HMR double-start
- Errors swallowed with `console.error`
- Mirrors the existing `game-sync-cron` pattern (referenced in CLAUDE.md)

### Manual purge

Full admins can manually delete rows via the Payload admin panel because the
collection's `delete` access is `isFullAdmin`. No dedicated UI button.

## Testing

### New file: `tests/admin-log.test.ts`

1. **`logAdminAction` writes expected shape** — mock `getPayloadClient`, call
   with a sample entry, assert captured `payload.create` call has all fields.
   Verify empty diff without metadata is skipped.
2. **`computeDiff` correctness** — equal fields skipped, JSON-stringify
   comparison, `IGNORED_DIFF_FIELDS` skipped, added/removed keys captured.
   **`inflateSnapshot` correctness** — create mode produces
   `{field: {before: null, after: v}}` for every non-ignored field; delete
   mode produces `{field: {before: v, after: null}}`. **Create/delete calls
   to `logAdminAction`** — providing only `after` (create) or only `before`
   (delete) produces a log entry with an inflated diff (not skipped).
3. **Failure is swallowed** — mock `payload.create` to throw, assert no
   exception propagates and `console.error` called once.
4. **Source-level completeness guard** — walk `src/app/api/**/*.ts`; for each
   file importing `requireAdmin`/`requireFullAdmin`/`requireGmAdmin` AND
   containing `payload\.(create|update|delete)\(`, assert it also imports
   from `@/lib/admin-log`. `SKIP_FILES: Set<string>` allowlist with comments.
5. **Retention cron** — mock `payload.delete`, call exported `pruneOnce()`,
   assert the `where.createdAt.less_than` cutoff is 180 days ago ±1s.
   Verify `started` flag prevents double-start.

### Extension to `tests/constants.test.ts`

Add test: import `src/payload.config.ts` and assert
`collections.some(c => c.slug === 'admin-logs')`.

### Manual QA checklist (post-deploy on dev)

- [ ] Edit a character sheet → entry with correct diff
- [ ] Create a faction → `faction.create` with full snapshot as `after`
- [ ] Delete a timeline event → `character_timeline.delete` with `before`
- [ ] Enter GM mode in /comms → `gm.enter` with no diff
- [ ] Non-full-admin opens /moderation → tab button hidden, direct API 403
- [ ] Pagination: load 50, click "charger plus", no duplicates
- [ ] Filters: set actor + date range, reload, filters restored from URL
- [ ] Manually invoke `pruneOnce()` on dev with a backdated row → row deleted

## Version bump

Update `src/lib/version.ts` with a 1.6.57 (or next available) changelog
entry summarizing the tab addition.

## Open questions resolved during brainstorming

- **Q1:** Admins use the custom frontend exclusively (not Payload `/admin`)
  → Approach 1 (explicit `logAdminAction` calls) is viable.
- **Q2:** Detail level = full diff (before/after snapshot of changed fields).
- **Q3:** Retention = 180 days, capped by age via cron.
- **Q4a:** Access = full admins only.
- **Q4b:** Include moderation events (unified stream with `ModerationEvents`
  overlap).
- **Q5:** UI = filters + full-text search.
- **Q6a:** Log successes only.
- **Q6b:** Non-mutation events = `gm.enter`, `gm.exit`, `gm.impersonate`,
  `character.link.admin_override`. NOT `moderation.tab.open`.
