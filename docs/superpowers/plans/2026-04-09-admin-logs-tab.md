# Admin Logs Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5th "Journal admin" tab to `/moderation` that captures every admin action (character edits, timeline events, factions, units, intelligence, moderation cases, comms admin, GM mode toggles) with full before/after diff, filterable/searchable reverse-chrono list, full-admin-only access, and 180-day retention.

**Architecture:** New `AdminLogs` Payload collection + `src/lib/admin-log.ts` helper called explicitly from every admin mutation route. Diff semantics unified across create/update/delete via an `inflateSnapshot` helper. A source-level test walks `src/app/api/**` and fails CI if any admin-gated route performs a Payload mutation without importing the logging helper. Node-interval retention cron mirrors the existing `game-sync-cron` pattern.

**Tech Stack:** Payload CMS 3.x (Postgres adapter via drizzle), Next.js 15 app router, Vitest, React 19.

**Spec:** `docs/superpowers/specs/2026-04-09-admin-logs-tab-design.md`

---

## File Structure

**Created:**
- `src/collections/AdminLogs.ts` — new Payload collection definition
- `src/lib/admin-log.ts` — `logAdminAction()` helper + diff utilities
- `src/lib/admin-log-retention-cron.ts` — 180-day retention cron
- `src/migrations/YYYYMMDD_HHMMSS_admin_logs.ts` — migration (or raw SQL fallback per CLAUDE.md)
- `src/app/api/moderation/admin-logs/route.ts` — list endpoint
- `src/app/api/moderation/admin-logs/facets/route.ts` — facets endpoint
- `src/components/moderation/AdminLogsTab.tsx` — tab component
- `tests/admin-log.test.ts` — unit + completeness guard tests

**Modified:**
- `src/payload.config.ts` — register `AdminLogs` in the collections array
- `src/lib/version.ts` — bump to 1.6.57 + changelog
- `src/app/(frontend)/moderation/page.tsx` — add 5th tab
- `src/app/(frontend)/moderation/moderation.css` — `.mod-admin-logs` block
- `src/app/api/roleplay/characters/route.ts` — log `character.create`
- `src/app/api/roleplay/characters/[id]/route.ts` — log `character.update/delete`
- `src/app/api/roleplay/timeline/route.ts` — log `character_timeline.*`
- `src/app/api/roleplay/factions/route.ts` — log `faction.create`
- `src/app/api/roleplay/factions/[id]/route.ts` — log `faction.update/delete`
- `src/app/api/roleplay/units/route.ts` — log `unit.create`
- `src/app/api/roleplay/units/[id]/route.ts` — log `unit.update/delete`
- `src/app/api/roleplay/intelligence/route.ts` — log `intelligence.create`
- `src/app/api/roleplay/intelligence/[id]/route.ts` — log `intelligence.update/delete`
- `src/app/api/moderation/cases/route.ts` — log `moderation_case.create`
- `src/app/api/moderation/cases/[id]/route.ts` — log `moderation_case.update`
- `src/app/api/moderation/sanctions/route.ts` — log `moderation_sanction.create/delete`
- `src/app/api/moderation/comms/channels/route.ts` — log `comms_channel.create/update`
- `src/app/api/moderation/comms/channels/[id]/messages/route.ts` — log `comms_message.delete`
- `src/app/api/moderation/comms/messages/[id]/route.ts` — log `comms_message.delete`
- `src/app/api/comms/channels/route.ts` — log `gm.enter` when `body.asGm === true` (review in Task 9)
- (GM mode endpoints — exact routes located in Task 9)
- Existing cron bootstrap file (located in Task 11) — start `startAdminLogRetentionCron()`

---

## Universal Logging Rule

**A Payload mutation inside an API route must be followed by a `logAdminAction({...})` call if and only if `isAdmin === true` at the time of the mutation.**

- Routes that unconditionally require admin (`requireFullAdmin`, `requireGmAdmin`) → always log.
- Routes that mix user + admin branches (`requireSession` + `checkAdminPermissions`) → log only inside the admin branch (wrap the log call with `if (isAdmin) { ... }`).
- The log call is fire-and-forget (`void logAdminAction(...)`) so it never blocks the HTTP response.

---

## Task 1: Create `AdminLogs` collection and migration

**Files:**
- Create: `src/collections/AdminLogs.ts`
- Modify: `src/payload.config.ts:8-23` (import block), `src/payload.config.ts:42-59` (collections array)
- Create: `src/migrations/20260409_190000_admin_logs.ts` (or raw SQL fallback — see step 6)

- [ ] **Step 1: Create the AdminLogs collection file**

Create `src/collections/AdminLogs.ts` with this exact content:

```ts
import type { CollectionConfig } from 'payload';
import { isFullAdmin } from '@/lib/payload-access';

export const AdminLogs: CollectionConfig = {
	slug: 'admin-logs',
	labels: {
		singular: 'Journal admin',
		plural: 'Journaux admin',
	},
	admin: {
		// Hidden from the Payload /admin sidebar — this collection is
		// written server-only via logAdminAction() and read via our own
		// /api/moderation/admin-logs endpoint. Exposing it in the Payload
		// UI would be confusing and the access rules below already block
		// create/update from that surface.
		hidden: true,
		defaultColumns: ['createdAt', 'actorDiscordUsername', 'action', 'summary'],
		useAsTitle: 'summary',
	},
	access: {
		read: ({ req }) => isFullAdmin(req),
		create: () => false,
		update: () => false,
		delete: ({ req }) => isFullAdmin(req),
	},
	fields: [
		// ── Actor (Discord session snapshot, denormalized) ──
		{ name: 'actorDiscordId', type: 'text', required: true, index: true },
		{ name: 'actorDiscordUsername', type: 'text', required: true },
		{ name: 'actorDiscordAvatar', type: 'text' },
		{ name: 'actorAdminLevel', type: 'text' },

		// ── Action ──
		{ name: 'action', type: 'text', required: true, index: true },
		{ name: 'summary', type: 'text', required: true },

		// ── Target entity (nullable for non-mutation events) ──
		{ name: 'entityType', type: 'text', index: true },
		{ name: 'entityId', type: 'text' },
		{ name: 'entityLabel', type: 'text' },

		// ── Diff (uniform shape: create/update/delete all produce a diff) ──
		{ name: 'diff', type: 'json' },
		{ name: 'metadata', type: 'json' },

		// ── Request context ──
		{ name: 'ip', type: 'text' },
		{ name: 'userAgent', type: 'text' },
	],
	timestamps: true,
};
```

- [ ] **Step 2: Create the access helper if it does not already exist**

Check if `src/lib/payload-access.ts` exists. If not, create it:

```ts
import type { PayloadRequest } from 'payload';

/**
 * Payload-level access helper: returns true when the Payload request carries
 * a logged-in user whose role is 'admin' in the `users` collection. Used by
 * collection-level `access.read` / `access.delete` rules. This does NOT check
 * Discord-session-based admin — our API routes enforce that separately via
 * requireFullAdmin(). This helper exists only so that full admins browsing
 * the Payload /admin UI can still read the collection.
 */
export function isFullAdmin(req: PayloadRequest): boolean {
	return req.user?.role === 'admin';
}
```

If the file already exists, verify it exports `isFullAdmin` with the semantics above and extend as needed. Do not rewrite it.

- [ ] **Step 3: Register the collection in `payload.config.ts`**

Edit `src/payload.config.ts`. In the imports block (currently lines 8-23), add after the other collection imports:

```ts
import { AdminLogs } from './collections/AdminLogs';
```

In the `collections: [...]` array (currently lines 42-59), add `AdminLogs` at the end:

```ts
	collections: [
		Users,
		Media,
		Pages,
		Posts,
		Characters,
		CharacterTimeline,
		Ranks,
		Units,
		Factions,
		Intelligence,
		ModerationCases,
		ModerationEvents,
		ModerationSanctions,
		BankHistory,
		CommsChannels,
		CommsMessages,
		AdminLogs,
	],
```

- [ ] **Step 4: Regenerate Payload types**

Run: `npx payload generate:types`
Expected: `src/payload-types.ts` updated with new `AdminLog` interface and `admin-logs` in `Config.collections`.

If the command fails (common on this codebase because Payload bootstrap is slow), skip this step — the build will regenerate types. Commit the collection file anyway.

- [ ] **Step 5: Author the migration**

Run: `npx payload migrate:create admin_logs`
Expected: a new file in `src/migrations/` containing `up`/`down` functions with the `admin_logs` table DDL.

If that command fails or produces a destructive schema diff (drizzle sometimes wants to recreate unrelated tables), author the migration by hand. Create `src/migrations/20260409_190000_admin_logs.ts` with this exact content:

```ts
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "admin_logs" (
			"id" serial PRIMARY KEY NOT NULL,
			"actor_discord_id" varchar NOT NULL,
			"actor_discord_username" varchar NOT NULL,
			"actor_discord_avatar" varchar,
			"actor_admin_level" varchar,
			"action" varchar NOT NULL,
			"summary" varchar NOT NULL,
			"entity_type" varchar,
			"entity_id" varchar,
			"entity_label" varchar,
			"diff" jsonb,
			"metadata" jsonb,
			"ip" varchar,
			"user_agent" varchar,
			"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
			"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
		);
		CREATE INDEX IF NOT EXISTS "admin_logs_actor_discord_id_idx" ON "admin_logs" ("actor_discord_id");
		CREATE INDEX IF NOT EXISTS "admin_logs_action_idx" ON "admin_logs" ("action");
		CREATE INDEX IF NOT EXISTS "admin_logs_entity_type_idx" ON "admin_logs" ("entity_type");
		CREATE INDEX IF NOT EXISTS "admin_logs_created_at_idx" ON "admin_logs" ("created_at");
	`);
}

export async function down({ db }: MigrateUpArgs): Promise<void> {
	await db.execute(sql`DROP TABLE IF EXISTS "admin_logs";`);
}
```

- [ ] **Step 6: Document manual migration application for deploy**

Because Ansible does NOT run `payload migrate` (per CLAUDE.md), the migration must be applied manually on prod. Add a line to this plan's "Deploy notes" section (bottom of this file) reminding the operator to SSH to the VPS and run:

```bash
cd /home/armarserver/LIF-Website-Dev   # or LIF-Website for prod
npx payload migrate
```

OR if `payload migrate` tries to recreate unrelated tables, apply the SQL manually via psql:

```bash
psql $DATABASE_URI -f src/migrations/20260409_190000_admin_logs.sql
psql $DATABASE_URI -c "INSERT INTO payload_migrations (name, batch) VALUES ('20260409_190000_admin_logs', (SELECT COALESCE(MAX(batch),0)+1 FROM payload_migrations));"
```

(The `.sql` file will be exported from the migration's `up()` body — do this only if the ts migration route fails.)

- [ ] **Step 7: Run tests to verify nothing broke**

Run: `npm run test`
Expected: PASS — 136/136 (no new tests yet, existing suite still green after schema change).

- [ ] **Step 8: Commit**

```bash
git add src/collections/AdminLogs.ts src/payload.config.ts src/lib/payload-access.ts src/migrations/20260409_190000_admin_logs.ts src/payload-types.ts
git commit -m "feat(admin-logs): add AdminLogs Payload collection + migration

Collection is hidden from Payload /admin sidebar, read-only for full
admins, write-only via the logAdminAction() helper (added in the next
task). Denormalized actor fields snapshot Discord session state at log
time. Indexes cover the dropdown filter columns and the createdAt cursor
used by pagination.

Part of 1.6.57 — Journal admin tab."
```

---

## Task 2: Implement `logAdminAction` helper + unit tests

**Files:**
- Create: `src/lib/admin-log.ts`
- Create: `tests/admin-log.test.ts`

- [ ] **Step 1: Write the failing tests for `computeDiff` and `inflateSnapshot`**

Create `tests/admin-log.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the payload client so tests never touch a real DB.
const mockCreate = vi.fn();
vi.mock('@/lib/payload', () => ({
	getPayloadClient: async () => ({ create: mockCreate }),
}));

import {
	computeDiff,
	inflateSnapshot,
	logAdminAction,
} from '@/lib/admin-log';
import type { SessionData } from '@/lib/session';

const SESSION: SessionData = {
	userId: 1,
	discordId: '1234567890',
	discordUsername: 'Boris',
	discordAvatar: 'https://cdn.discordapp.com/avatars/1234567890/abc.png',
	roles: [],
};

beforeEach(() => {
	mockCreate.mockReset();
	mockCreate.mockResolvedValue({ id: 999 });
});

describe('computeDiff', () => {
	it('returns changed fields only', () => {
		const before = { rank: 'CPL', unit: '1er RCM', name: 'Jean' };
		const after = { rank: 'SGT', unit: '1er RCM', name: 'Jean' };
		expect(computeDiff(before, after)).toEqual({
			rank: { before: 'CPL', after: 'SGT' },
		});
	});

	it('skips IGNORED_DIFF_FIELDS', () => {
		const before = { id: 1, updatedAt: '2026-01-01', rank: 'CPL' };
		const after = { id: 1, updatedAt: '2026-04-09', rank: 'SGT' };
		const diff = computeDiff(before, after);
		expect(diff).not.toHaveProperty('id');
		expect(diff).not.toHaveProperty('updatedAt');
		expect(diff).toHaveProperty('rank');
	});

	it('captures added and removed keys', () => {
		const before = { a: 1 };
		const after = { b: 2 };
		expect(computeDiff(before, after)).toEqual({
			a: { before: 1, after: undefined },
			b: { before: undefined, after: 2 },
		});
	});

	it('compares nested objects by JSON stringify', () => {
		const before = { tags: ['a', 'b'] };
		const after = { tags: ['a', 'b'] };
		expect(computeDiff(before, after)).toEqual({});
	});

	it('treats array order changes as a diff', () => {
		const before = { tags: ['a', 'b'] };
		const after = { tags: ['b', 'a'] };
		const diff = computeDiff(before, after);
		expect(diff).toHaveProperty('tags');
	});
});

describe('inflateSnapshot', () => {
	it('create mode produces before:null, after:value for every field', () => {
		const doc = { id: 1, updatedAt: 'x', rank: 'CPL', name: 'Jean' };
		expect(inflateSnapshot(doc, 'create')).toEqual({
			rank: { before: null, after: 'CPL' },
			name: { before: null, after: 'Jean' },
		});
	});

	it('delete mode produces before:value, after:null for every field', () => {
		const doc = { id: 1, updatedAt: 'x', rank: 'CPL', name: 'Jean' };
		expect(inflateSnapshot(doc, 'delete')).toEqual({
			rank: { before: 'CPL', after: null },
			name: { before: 'Jean', after: null },
		});
	});
});

describe('logAdminAction', () => {
	it('writes a full entry for an update with diff', async () => {
		await logAdminAction({
			session: SESSION,
			action: 'character.update',
			summary: 'A modifié le personnage Jean Dupont',
			entityType: 'character',
			entityId: 42,
			entityLabel: 'Jean Dupont',
			before: { rank: 'CPL', name: 'Jean' },
			after: { rank: 'SGT', name: 'Jean' },
		});
		expect(mockCreate).toHaveBeenCalledOnce();
		const call = mockCreate.mock.calls[0][0];
		expect(call.collection).toBe('admin-logs');
		expect(call.data.actorDiscordId).toBe('1234567890');
		expect(call.data.actorDiscordUsername).toBe('Boris');
		expect(call.data.action).toBe('character.update');
		expect(call.data.entityId).toBe('42'); // stringified
		expect(call.data.diff).toEqual({
			rank: { before: 'CPL', after: 'SGT' },
		});
	});

	it('writes a create entry with inflated snapshot', async () => {
		await logAdminAction({
			session: SESSION,
			action: 'character.create',
			summary: 'A créé le personnage Jean Dupont',
			entityType: 'character',
			entityId: 42,
			after: { rank: 'CPL', name: 'Jean' },
		});
		expect(mockCreate).toHaveBeenCalledOnce();
		const diff = mockCreate.mock.calls[0][0].data.diff;
		expect(diff).toEqual({
			rank: { before: null, after: 'CPL' },
			name: { before: null, after: 'Jean' },
		});
	});

	it('writes a delete entry with inflated snapshot', async () => {
		await logAdminAction({
			session: SESSION,
			action: 'character.delete',
			summary: 'A supprimé le personnage Jean Dupont',
			entityType: 'character',
			entityId: 42,
			before: { rank: 'CPL', name: 'Jean' },
		});
		const diff = mockCreate.mock.calls[0][0].data.diff;
		expect(diff).toEqual({
			rank: { before: 'CPL', after: null },
			name: { before: 'Jean', after: null },
		});
	});

	it('writes a non-mutation entry (no diff, metadata only)', async () => {
		await logAdminAction({
			session: SESSION,
			action: 'gm.enter',
			summary: 'A activé le mode GameMaster',
			metadata: { channel: 'comms' },
		});
		expect(mockCreate).toHaveBeenCalledOnce();
		const data = mockCreate.mock.calls[0][0].data;
		expect(data.diff).toBe(null);
		expect(data.metadata).toEqual({ channel: 'comms' });
	});

	it('skips the write when an update produced no diff and no metadata', async () => {
		await logAdminAction({
			session: SESSION,
			action: 'character.update',
			summary: 'no-op',
			before: { rank: 'CPL' },
			after: { rank: 'CPL' },
		});
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it('swallows errors from payload.create and never throws', async () => {
		mockCreate.mockRejectedValueOnce(new Error('db down'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(
			logAdminAction({
				session: SESSION,
				action: 'character.update',
				summary: 'x',
				before: { a: 1 },
				after: { a: 2 },
			}),
		).resolves.toBeUndefined();
		expect(consoleSpy).toHaveBeenCalledOnce();
		consoleSpy.mockRestore();
	});
});
```

- [ ] **Step 2: Run tests to verify they all fail**

Run: `npm run test -- admin-log.test.ts`
Expected: FAIL — module `@/lib/admin-log` does not exist.

- [ ] **Step 3: Write the `admin-log.ts` implementation**

Create `src/lib/admin-log.ts`:

```ts
import { getPayloadClient } from './payload';
import type { SessionData } from './session';
import type { AdminPermissions } from './admin';
import type { NextRequest } from 'next/server';

export interface LogEntry {
	session: SessionData;
	permissions?: AdminPermissions;
	/**
	 * Dotted action namespace: `<entity>.<verb>`.
	 * Examples: 'character.update', 'faction.create', 'gm.enter'.
	 */
	action: string;
	/** Human-readable French label computed at log time. */
	summary: string;
	entityType?: string;
	entityId?: string | number;
	entityLabel?: string;
	/** Pre-mutation document (present for update + delete). */
	before?: Record<string, unknown>;
	/** Post-mutation document (present for create + update). */
	after?: Record<string, unknown>;
	/** Event-specific bag (e.g. { npcId, npcName } for gm.impersonate). */
	metadata?: Record<string, unknown>;
	/** Original NextRequest for IP + user-agent extraction. */
	request?: NextRequest;
}

// Fields stripped from every diff — they are Payload internals that change
// on every mutation and would pollute every log entry.
const IGNORED_DIFF_FIELDS = new Set([
	'id',
	'updatedAt',
	'createdAt',
	'_status',
]);

/**
 * Compare two documents and return only the fields that differ, shaped as
 * `{ field: { before, after } }`. Used for update operations.
 *
 * Comparison is JSON-stringify-based, so arrays and nested objects are
 * compared by value including element order. If order-stability ever becomes
 * noisy (e.g. Payload reordering a relationship array on each save), sort
 * arrays before stringifying — NOT in v1.
 */
export function computeDiff(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
	const diff: Record<string, { before: unknown; after: unknown }> = {};
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	for (const k of keys) {
		if (IGNORED_DIFF_FIELDS.has(k)) continue;
		if (JSON.stringify(before[k]) === JSON.stringify(after[k])) continue;
		diff[k] = { before: before[k], after: after[k] };
	}
	return diff;
}

/**
 * Inflate a single-sided document (create has only `after`, delete has only
 * `before`) into the same `{ field: { before, after } }` shape used for
 * updates so the UI can render all three event types uniformly.
 */
export function inflateSnapshot(
	doc: Record<string, unknown>,
	mode: 'create' | 'delete',
): Record<string, { before: unknown; after: unknown }> {
	const out: Record<string, { before: unknown; after: unknown }> = {};
	for (const k of Object.keys(doc)) {
		if (IGNORED_DIFF_FIELDS.has(k)) continue;
		out[k] =
			mode === 'create'
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

/**
 * Persist an admin action to the `admin-logs` collection.
 *
 * INVARIANT: this function MUST NEVER throw. Audit logging is
 * best-effort — a failed write must not break the admin action it records.
 * Callers should `void`-prefix the call to fire-and-forget.
 */
export async function logAdminAction(entry: LogEntry): Promise<void> {
	try {
		// Unified diff semantics:
		//   update → computeDiff(before, after)
		//   create → inflateSnapshot(after, 'create')
		//   delete → inflateSnapshot(before, 'delete')
		//   non-mutation → null (metadata carries the context)
		let diff: Record<string, { before: unknown; after: unknown }> | null = null;
		if (entry.before && entry.after) {
			diff = computeDiff(entry.before, entry.after);
		} else if (entry.after) {
			diff = inflateSnapshot(entry.after, 'create');
		} else if (entry.before) {
			diff = inflateSnapshot(entry.before, 'delete');
		}

		// Skip the update-with-no-change case only. Create/delete always log
		// (inflated snapshot is informative even when "empty"). Non-mutation
		// events always log because diff is null, not {}.
		if (
			entry.before &&
			entry.after &&
			diff &&
			Object.keys(diff).length === 0 &&
			!entry.metadata
		) {
			return;
		}

		const payload = await getPayloadClient();
		await payload.create({
			collection: 'admin-logs',
			data: {
				actorDiscordId: entry.session.discordId,
				actorDiscordUsername: entry.session.discordUsername,
				actorDiscordAvatar: entry.session.discordAvatar ?? null,
				actorAdminLevel: entry.permissions?.level ?? null,
				action: entry.action,
				summary: entry.summary,
				entityType: entry.entityType ?? null,
				entityId: entry.entityId != null ? String(entry.entityId) : null,
				entityLabel: entry.entityLabel ?? null,
				diff: diff,
				metadata: entry.metadata ?? null,
				ip: extractIp(entry.request),
				userAgent: entry.request?.headers.get('user-agent') ?? null,
			},
		});
	} catch (err) {
		console.error('[admin-log] failed to write entry:', err);
	}
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test -- admin-log.test.ts`
Expected: PASS — all `computeDiff` / `inflateSnapshot` / `logAdminAction` tests green.

- [ ] **Step 5: Run the full suite**

Run: `npm run test`
Expected: PASS — previous tests unchanged, new test file added.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin-log.ts tests/admin-log.test.ts
git commit -m "feat(admin-logs): add logAdminAction helper + unit tests

Helper wraps a payload.create call to 'admin-logs' with three diff modes
— computeDiff for updates, inflateSnapshot for create/delete, null for
non-mutation events. All errors swallowed with console.error so a failed
log write can never break the admin action it records. IGNORED_DIFF_FIELDS
excludes id/updatedAt/createdAt/_status from every diff.

Part of 1.6.57 — Journal admin tab."
```

---

## Task 3: Instrument `characters` routes

**Files:**
- Modify: `src/app/api/roleplay/characters/route.ts` — POST (log `character.create` when `isAdmin`)
- Modify: `src/app/api/roleplay/characters/[id]/route.ts` — PATCH (log `character.update` when `isAdmin`), DELETE (log `character.delete`)

### Canonical pattern (reference)

For every route in this task and Tasks 4-8, the pattern is:

1. Add `import { logAdminAction } from '@/lib/admin-log';` near the top.
2. For PATCH/DELETE: capture the doc BEFORE mutation via `payload.findByID`.
3. After the Payload mutation succeeds, call `void logAdminAction({ session, permissions, action, summary, entityType, entityId, entityLabel, before, after, request })` — fire-and-forget.
4. For mixed user/admin routes, wrap the log call with `if (isAdmin) { ... }`.

- [ ] **Step 1: Write a smoke test for the characters POST instrumentation**

Append to `tests/admin-log.test.ts` after the existing `describe('logAdminAction')`:

```ts
describe('route instrumentation smoke test', () => {
	it('characters POST route imports logAdminAction', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/roleplay/characters/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/from '@\/lib\/admin-log'/);
		expect(src).toMatch(/logAdminAction\s*\(/);
	});
});
```

Run: `npm run test -- admin-log.test.ts`
Expected: FAIL — the import does not exist yet in the route file.

- [ ] **Step 2: Instrument `src/app/api/roleplay/characters/route.ts` POST**

Add the import at the top (after the existing imports at line 1-6):

```ts
import { logAdminAction } from '@/lib/admin-log';
```

Replace lines 128-150 (the block starting at `const doc = await payload.create(...)` through the closing of the POST `try` block, but preserving the existing Discord notification call) with:

```ts
		const doc = await payload.create({
			collection: 'characters',
			data: body,
		});

		const fullDoc: Character = await payload.findByID({
			collection: 'characters',
			id: doc.id,
			depth: 2,
		});

		// Send Discord notification (non-blocking) — skip for NPCs / Targets,
		// they are not real player enrollments and would just spam the channel.
		if (!isNpcCreation) {
			notifyNewCharacter({
				id: doc.id as number,
				fullName: fullDoc.fullName || `${fullDoc.firstName} ${fullDoc.lastName}`,
				discordUsername: fullDoc.discordUsername || '',
				rank: typeof fullDoc.rank === 'object' ? fullDoc.rank : null,
				unit: typeof fullDoc.unit === 'object' ? fullDoc.unit : null,
			}).catch(() => {});
		}

		// Log the admin action IFF the creator is an admin. Non-admins
		// creating their own player character are not an "admin action".
		if (isAdmin) {
			void logAdminAction({
				session,
				action: 'character.create',
				summary: `A créé le personnage ${fullDoc.fullName || fullDoc.firstName}${isNpcCreation ? ' (PNJ)' : ''}`,
				entityType: 'character',
				entityId: doc.id,
				entityLabel: fullDoc.fullName || `${fullDoc.firstName} ${fullDoc.lastName}`,
				after: fullDoc as unknown as Record<string, unknown>,
				request,
			});
		}

		return NextResponse.json({ id: doc.id, doc });
```

- [ ] **Step 3: Instrument `src/app/api/roleplay/characters/[id]/route.ts` PATCH**

Add the import at the top (after line 6):

```ts
import { logAdminAction } from '@/lib/admin-log';
```

Replace lines 134-149 (from `const doc = await payload.update(...)` through the closing `return`) with:

```ts
		const doc = await payload.update({
			collection: 'characters',
			id: characterId,
			data: body,
		});

		if (body.status && body.status !== oldStatus) {
			notifyStatusChange({
				id: characterId,
				fullName: doc.fullName || `${doc.firstName} ${doc.lastName}`,
				oldStatus: oldStatus || 'in-service',
				newStatus: body.status,
			}).catch(() => {});
		}

		if (isAdmin) {
			void logAdminAction({
				session,
				action: 'character.update',
				summary: `A modifié le personnage ${doc.fullName || doc.firstName}`,
				entityType: 'character',
				entityId: doc.id,
				entityLabel: doc.fullName || `${doc.firstName} ${doc.lastName}`,
				before: existing as unknown as Record<string, unknown>,
				after: doc as unknown as Record<string, unknown>,
				request,
			});
		}

		return NextResponse.json({ id: doc.id, doc });
```

- [ ] **Step 4: Instrument `src/app/api/roleplay/characters/[id]/route.ts` DELETE**

This handler is `requireFullAdmin`-gated, so it's unconditionally an admin action. Replace lines 250-255 (from `await payload.delete(...)` through the `return`) with:

```ts
		// Capture the full character doc BEFORE deleting so the log entry
		// carries the complete snapshot. The `existing` reference from the
		// PATCH code path is NOT in scope here — the DELETE handler is
		// separate and never ran findByID above.
		const deletedSnapshot = await payload.findByID({
			collection: 'characters',
			id: characterId,
		});

		await payload.delete({
			collection: 'characters',
			id: characterId,
		});

		void logAdminAction({
			session: auth.session,
			permissions: auth.permissions,
			action: 'character.delete',
			summary: `A supprimé le personnage ${deletedSnapshot.fullName || deletedSnapshot.firstName}`,
			entityType: 'character',
			entityId: characterId,
			entityLabel: deletedSnapshot.fullName || `${deletedSnapshot.firstName} ${deletedSnapshot.lastName}`,
			before: deletedSnapshot as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ success: true });
```

- [ ] **Step 5: Run tests**

Run: `npm run test`
Expected: PASS — the smoke test from Step 1 now passes (route file imports admin-log), existing tests still green.

- [ ] **Step 6: Manual sanity check**

Run: `npm run lint 2>&1 | tail -20`
Expected: no errors in the two modified files.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/roleplay/characters/route.ts src/app/api/roleplay/characters/[id]/route.ts tests/admin-log.test.ts
git commit -m "feat(admin-logs): instrument characters create/update/delete

Log character.create when the creator is admin (isNpcCreation or not),
character.update when an admin PATCHes any character (including their own
for simplicity), character.delete unconditionally (the route is
requireFullAdmin-gated). Captures the full before snapshot for updates
and deletes so the diff is complete.

Part of 1.6.57 — Journal admin tab."
```

---

## Task 4: Instrument `character-timeline` routes

**Files:**
- Modify: `src/app/api/roleplay/timeline/route.ts` — locate all admin mutation paths

- [ ] **Step 1: Read the existing timeline route to identify mutation handlers**

Run: `Read src/app/api/roleplay/timeline/route.ts`

Expected to find POST handler that creates a character-timeline entry. If the file also exports PATCH/DELETE handlers, instrument each. If PATCH/DELETE are instead in a sibling `timeline/[id]/route.ts`, instrument that file too.

- [ ] **Step 2: Write a smoke test**

Append to `tests/admin-log.test.ts` inside the `describe('route instrumentation smoke test')` block:

```ts
	it('timeline POST route imports logAdminAction', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/roleplay/timeline/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/from '@\/lib\/admin-log'/);
	});
```

Run: `npm run test -- admin-log.test.ts`
Expected: FAIL — import missing.

- [ ] **Step 3: Instrument the POST handler**

In `src/app/api/roleplay/timeline/route.ts`:

1. Add `import { logAdminAction } from '@/lib/admin-log';` near the top.
2. After the `payload.create({ collection: 'character-timeline', ... })` call succeeds, add (replacing the block around the existing `notifyTimelineEvent` call, keeping the notification):

```ts
		const created = await payload.create({
			collection: 'character-timeline',
			data: body,
		});

		// Fetch the character name for summary/label (keeps the log human-
		// readable even if the event is deleted later).
		const character = typeof created.character === 'number'
			? await payload.findByID({ collection: 'characters', id: created.character })
			: created.character;
		const characterName = (character as any)?.fullName
			|| `${(character as any)?.firstName ?? ''} ${(character as any)?.lastName ?? ''}`.trim()
			|| `#${(character as any)?.id}`;

		// Existing Discord notification (retain verbatim):
		notifyTimelineEvent({
			characterId: (character as any)?.id ?? 0,
			characterName,
			type: created.type,
			title: created.title,
			date: created.date,
		}).catch(() => {});

		if (isAdmin) {
			void logAdminAction({
				session,
				action: 'character_timeline.create',
				summary: `A ajouté l'événement "${created.title}" au timeline de ${characterName}`,
				entityType: 'character_timeline',
				entityId: created.id,
				entityLabel: `${characterName} — ${created.title}`,
				after: created as unknown as Record<string, unknown>,
				request,
			});
		}
```

If the existing POST handler does NOT already compute `isAdmin` via `checkAdminPermissions`, add it near the top of the `try` block. If the route is `requireFullAdmin`-gated, skip the `if (isAdmin)` wrap and always log.

- [ ] **Step 4: Instrument PATCH / DELETE if they exist**

If `src/app/api/roleplay/timeline/[id]/route.ts` exists, follow the canonical pattern from Task 3 Step 3/4 with these action names:
- PATCH → `character_timeline.update` (summary: `A modifié l'événement "<title>" de <characterName>`)
- DELETE → `character_timeline.delete` (summary: `A supprimé un événement du timeline de <characterName>`)

- [ ] **Step 5: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/roleplay/timeline tests/admin-log.test.ts
git commit -m "feat(admin-logs): instrument character_timeline create/update/delete

Part of 1.6.57 — Journal admin tab."
```

---

## Task 5: Instrument `factions` and `units` routes

**Files:**
- Modify: `src/app/api/roleplay/factions/route.ts` (POST → `faction.create`)
- Modify: `src/app/api/roleplay/factions/[id]/route.ts` (PATCH → `faction.update`, DELETE → `faction.delete`)
- Modify: `src/app/api/roleplay/units/route.ts` (POST → `unit.create`)
- Modify: `src/app/api/roleplay/units/[id]/route.ts` (PATCH → `unit.update`, DELETE → `unit.delete`)

- [ ] **Step 1: Write smoke tests for all four files**

Append to `tests/admin-log.test.ts` smoke-test block:

```ts
	it.each([
		'src/app/api/roleplay/factions/route.ts',
		'src/app/api/roleplay/factions/[id]/route.ts',
		'src/app/api/roleplay/units/route.ts',
		'src/app/api/roleplay/units/[id]/route.ts',
	])('%s imports logAdminAction', async (rel) => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(join(process.cwd(), rel), 'utf8');
		expect(src).toMatch(/from '@\/lib\/admin-log'/);
	});
```

Run: `npm run test -- admin-log.test.ts`
Expected: FAIL — imports missing.

- [ ] **Step 2: Instrument `src/app/api/roleplay/factions/route.ts` POST**

Add `import { logAdminAction } from '@/lib/admin-log';` at the top.

After the `payload.create({ collection: 'factions', ... })` call:

```ts
		void logAdminAction({
			session: auth.session,       // or `session` depending on the handler's existing var name
			permissions: auth.permissions, // if available via requireFullAdmin; omit otherwise
			action: 'faction.create',
			summary: `A créé la faction "${created.name}"`,
			entityType: 'faction',
			entityId: created.id,
			entityLabel: created.name,
			after: created as unknown as Record<string, unknown>,
			request,
		});
```

Wrap with `if (isAdmin) { ... }` only if the handler uses the mixed-gate `requireSession + checkAdminPermissions` pattern. For `requireFullAdmin` handlers, log unconditionally.

- [ ] **Step 3: Instrument `src/app/api/roleplay/factions/[id]/route.ts` PATCH**

Follow the canonical PATCH pattern from Task 3 Step 3:
1. Fetch `existing` via `payload.findByID` BEFORE the update (if the route does not already).
2. Add the log call AFTER the update succeeds:

```ts
		void logAdminAction({
			session /* or auth.session */,
			action: 'faction.update',
			summary: `A modifié la faction "${doc.name}"`,
			entityType: 'faction',
			entityId: doc.id,
			entityLabel: doc.name,
			before: existing as unknown as Record<string, unknown>,
			after: doc as unknown as Record<string, unknown>,
			request,
		});
```

- [ ] **Step 4: Instrument `src/app/api/roleplay/factions/[id]/route.ts` DELETE**

Follow the canonical DELETE pattern from Task 3 Step 4:
1. `const deletedSnapshot = await payload.findByID(...)` before `payload.delete`.
2. After delete:

```ts
		void logAdminAction({
			session /* or auth.session */,
			action: 'faction.delete',
			summary: `A supprimé la faction "${deletedSnapshot.name}"`,
			entityType: 'faction',
			entityId: factionId,
			entityLabel: deletedSnapshot.name,
			before: deletedSnapshot as unknown as Record<string, unknown>,
			request,
		});
```

- [ ] **Step 5: Mirror Steps 2-4 for `units/route.ts` and `units/[id]/route.ts`**

Identical structure, action names `unit.create` / `unit.update` / `unit.delete`, entity type `unit`, entity label = the unit's `name`. Summaries:
- `A créé l'unité "${name}"`
- `A modifié l'unité "${name}"`
- `A supprimé l'unité "${name}"`

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: PASS — all four smoke tests green.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/roleplay/factions src/app/api/roleplay/units tests/admin-log.test.ts
git commit -m "feat(admin-logs): instrument faction + unit CRUD

Part of 1.6.57 — Journal admin tab."
```

---

## Task 6: Instrument `intelligence` routes

**Files:**
- Modify: `src/app/api/roleplay/intelligence/route.ts` (POST → `intelligence.create`)
- Modify: `src/app/api/roleplay/intelligence/[id]/route.ts` (PATCH → `intelligence.update`, DELETE → `intelligence.delete`)

- [ ] **Step 1: Add smoke tests**

Append to the smoke test `it.each` block in `tests/admin-log.test.ts`:

```ts
		'src/app/api/roleplay/intelligence/route.ts',
		'src/app/api/roleplay/intelligence/[id]/route.ts',
```

Run: `npm run test -- admin-log.test.ts` — expect two new FAILs.

- [ ] **Step 2: Instrument the three handlers**

Follow the canonical patterns from Tasks 3 and 5. Action names: `intelligence.create` / `intelligence.update` / `intelligence.delete`. `entityType: 'intelligence'`, entity label = the report's `title`. Summaries:
- `A créé le rapport de renseignement "${title}"`
- `A modifié le rapport de renseignement "${title}"`
- `A supprimé le rapport de renseignement "${title}"`

Preserve the existing `notifyNewIntelligence` call in POST — the log call goes after it.

- [ ] **Step 3: Run tests + commit**

Run: `npm run test` — expect PASS.

```bash
git add src/app/api/roleplay/intelligence tests/admin-log.test.ts
git commit -m "feat(admin-logs): instrument intelligence CRUD

Part of 1.6.57 — Journal admin tab."
```

---

## Task 7: Instrument moderation routes (cases + sanctions)

**Files:**
- Modify: `src/app/api/moderation/cases/route.ts` (POST → `moderation_case.create`)
- Modify: `src/app/api/moderation/cases/[id]/route.ts` (PATCH → `moderation_case.update`)
- Modify: `src/app/api/moderation/sanctions/route.ts` (POST → `moderation_sanction.create`, DELETE → `moderation_sanction.delete` if DELETE exists)

- [ ] **Step 1: Add smoke tests**

Append to the `it.each` block:

```ts
		'src/app/api/moderation/cases/route.ts',
		'src/app/api/moderation/cases/[id]/route.ts',
		'src/app/api/moderation/sanctions/route.ts',
```

- [ ] **Step 2: Instrument cases POST**

In `src/app/api/moderation/cases/route.ts`:

```ts
import { logAdminAction } from '@/lib/admin-log';

// ...after payload.create returns `created`...
void logAdminAction({
	session: auth.session,
	permissions: auth.permissions,
	action: 'moderation_case.create',
	summary: `A ouvert un dossier sur ${created.targetDiscordUsername ?? '?'}`,
	entityType: 'moderation_case',
	entityId: created.id,
	entityLabel: created.targetDiscordUsername ?? String(created.id),
	after: created as unknown as Record<string, unknown>,
	request,
});
```

- [ ] **Step 3: Instrument cases PATCH**

In `src/app/api/moderation/cases/[id]/route.ts`, follow the canonical PATCH pattern:
- Fetch `existing` before the update.
- After update:

```ts
void logAdminAction({
	session: auth.session,
	permissions: auth.permissions,
	action: 'moderation_case.update',
	summary: `A modifié le dossier de ${doc.targetDiscordUsername ?? '?'}`,
	entityType: 'moderation_case',
	entityId: doc.id,
	entityLabel: doc.targetDiscordUsername ?? String(doc.id),
	before: existing as unknown as Record<string, unknown>,
	after: doc as unknown as Record<string, unknown>,
	request,
});
```

- [ ] **Step 4: Instrument sanctions POST (and DELETE if present)**

In `src/app/api/moderation/sanctions/route.ts`:

POST:
```ts
void logAdminAction({
	session: auth.session,
	permissions: auth.permissions,
	action: 'moderation_sanction.create',
	summary: `A appliqué une sanction ${created.type} à ${created.targetDiscordUsername ?? '?'}`,
	entityType: 'moderation_sanction',
	entityId: created.id,
	entityLabel: `${created.targetDiscordUsername ?? '?'} — ${created.type}`,
	after: created as unknown as Record<string, unknown>,
	request,
});
```

DELETE (if the file exports one):
```ts
const deletedSnapshot = await payload.findByID({ collection: 'moderation-sanctions', id: sanctionId });
await payload.delete({ collection: 'moderation-sanctions', id: sanctionId });
void logAdminAction({
	session: auth.session,
	permissions: auth.permissions,
	action: 'moderation_sanction.delete',
	summary: `A retiré la sanction ${deletedSnapshot.type} de ${deletedSnapshot.targetDiscordUsername ?? '?'}`,
	entityType: 'moderation_sanction',
	entityId: sanctionId,
	entityLabel: `${deletedSnapshot.targetDiscordUsername ?? '?'} — ${deletedSnapshot.type}`,
	before: deletedSnapshot as unknown as Record<string, unknown>,
	request,
});
```

- [ ] **Step 5: Run tests + commit**

Run: `npm run test` — expect PASS.

```bash
git add src/app/api/moderation/cases src/app/api/moderation/sanctions tests/admin-log.test.ts
git commit -m "feat(admin-logs): instrument moderation cases + sanctions

Part of 1.6.57 — Journal admin tab."
```

---

## Task 8: Instrument admin comms routes

**Files:**
- Modify: `src/app/api/moderation/comms/channels/route.ts` (POST → `comms_channel.create`)
- Modify: `src/app/api/moderation/comms/channels/[id]/messages/route.ts` (DELETE → `comms_message.delete` if this file does that; otherwise check `src/app/api/moderation/comms/messages/[id]/route.ts`)
- Modify: `src/app/api/moderation/comms/messages/[id]/route.ts` — check and instrument any DELETE/PATCH

- [ ] **Step 1: Add smoke tests**

Append to the `it.each` block:

```ts
		'src/app/api/moderation/comms/channels/route.ts',
		'src/app/api/moderation/comms/messages/[id]/route.ts',
```

- [ ] **Step 2: Read each file and instrument per the canonical pattern**

For each file, follow the same create/update/delete patterns from Tasks 3/5. Action namespace: `comms_channel.*` or `comms_message.*`. Entity labels = channel name or message preview (truncated to 60 chars). Summaries:
- `A créé le canal "${name}"`
- `A modifié le canal "${name}"`
- `A supprimé le canal "${name}"`
- `A supprimé un message dans "${channelName}" ("${preview.slice(0, 40)}...")`

- [ ] **Step 3: Run tests + commit**

```bash
git add src/app/api/moderation/comms tests/admin-log.test.ts
git commit -m "feat(admin-logs): instrument admin comms channel + message actions

Part of 1.6.57 — Journal admin tab."
```

---

## Task 9: Non-mutation events (GM mode + biId override)

This task adds logging for the four events that don't correspond to a direct Payload mutation: `gm.enter`, `gm.exit`, `gm.impersonate`, `character.link.admin_override`.

**Files:**
- Search for GM mode handling with: `Grep "postedAsGm|gmMode|useGmMode|MODE_GM|gm=1"`
- Search for biId override with: `Grep "biId.*admin|admin.*biId|linkOverride"`
- Modify or create endpoints per findings

- [ ] **Step 1: Locate the GM enter/exit transition**

Run: `Grep "gmMode|useGmMode|postedAsGm" src/ --type ts --type tsx -l`

GM mode on the server side is gated via `requireGmAdmin` in `src/lib/api-auth.ts:71-86`. The client-side toggle may or may not hit the server explicitly. Expected outcomes:

- **Case A:** GM enter/exit is purely client-state (no server round-trip). In this case, add a new minimal endpoint `POST /api/comms/gm/toggle` that accepts `{ enabled: boolean }`, calls `requireGmAdmin`, logs `gm.enter` or `gm.exit`, and returns `{ ok: true }`. The client calls it fire-and-forget on toggle.

- **Case B:** GM enter/exit already goes through a server endpoint. In that case, add the log call there.

Pick the approach based on what the grep reveals.

- [ ] **Step 2: Instrument GM enter/exit**

For Case A — create `src/app/api/comms/gm/toggle/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireGmAdmin, isErrorResponse } from '@/lib/api-auth';
import { logAdminAction } from '@/lib/admin-log';

export async function POST(request: NextRequest) {
	const auth = await requireGmAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const body = await request.json().catch(() => ({}));
	const enabled = body?.enabled === true;

	void logAdminAction({
		session: auth.session,
		permissions: auth.permissions,
		action: enabled ? 'gm.enter' : 'gm.exit',
		summary: enabled
			? 'A activé le mode GameMaster en /comms'
			: 'A désactivé le mode GameMaster en /comms',
		metadata: { enabled },
		request,
	});

	return NextResponse.json({ ok: true });
}
```

Then update the client GM toggle (find via `Grep "gmMode.*toggle|setEnabled.*gm"` in `src/components/comms/**`) to call `fetch('/api/comms/gm/toggle', { method: 'POST', body: JSON.stringify({ enabled: next }) }).catch(() => {})` fire-and-forget on every toggle.

- [ ] **Step 3: Instrument gm.impersonate**

Impersonation means the admin selects a specific NPC to speak as. Find the server-side path where a GM-posted message carries `postedAsGm: true` and an NPC character id. This is likely in `src/app/api/comms/channels/[id]/messages/route.ts` POST. After the message is created, if `postedAsGm === true` AND the NPC selection exists, add:

```ts
if (postedAsGm && impersonatedCharacterId) {
	void logAdminAction({
		session: auth.session,
		permissions: auth.permissions,
		action: 'gm.impersonate',
		summary: `A parlé en tant que ${impersonatedCharacterName ?? `PNJ #${impersonatedCharacterId}`}`,
		entityType: 'character',
		entityId: impersonatedCharacterId,
		entityLabel: impersonatedCharacterName ?? `PNJ #${impersonatedCharacterId}`,
		metadata: {
			channelId: Number(channelId),
			messageId: created.id,
		},
		request,
	});
}
```

Read the actual file first (`Read src/app/api/comms/channels/[id]/messages/route.ts`) to confirm variable names and adapt.

- [ ] **Step 4: Instrument character.link.admin_override**

Locate the endpoint that allows an admin to manually set a character's `biId` bypassing the code flow. Candidates:
- `src/app/api/roleplay/characters/[id]/route.ts` PATCH — if the admin can set `biId` through the normal PATCH body, add a conditional log call AFTER the main `character.update` log:

```ts
if (isAdmin && body.biId !== undefined && body.biId !== existing.biId) {
	void logAdminAction({
		session,
		action: 'character.link.admin_override',
		summary: `A forcé la liaison BI de ${doc.fullName || doc.firstName}`,
		entityType: 'character',
		entityId: doc.id,
		entityLabel: doc.fullName || `${doc.firstName} ${doc.lastName}`,
		metadata: {
			oldBiId: existing.biId ?? null,
			newBiId: body.biId ?? null,
		},
		request,
	});
}
```

- `src/app/api/roleplay/link/confirm/route.ts` — if this route can be called by an admin for a character they don't own, log there instead.

Pick whichever handler actually performs the override. If both do, log in both.

- [ ] **Step 5: Run tests + commit**

Run: `npm run test` — expect PASS.

```bash
git add src/app/api/comms/gm src/app/api/comms/channels/[id]/messages/route.ts src/app/api/roleplay/characters/[id]/route.ts src/components/comms
git commit -m "feat(admin-logs): instrument non-mutation events (gm.* + biId override)

Adds gm.enter/gm.exit via a new dedicated /api/comms/gm/toggle endpoint
called fire-and-forget from the client toggle. gm.impersonate fires from
the existing comms message POST when postedAsGm=true. character.link.
admin_override fires from characters PATCH when an admin changes biId.

Part of 1.6.57 — Journal admin tab."
```

---

## Task 10: Source-level completeness guard test

**Files:**
- Modify: `tests/admin-log.test.ts` — add the walker test

- [ ] **Step 1: Write the failing test**

Append to `tests/admin-log.test.ts` after the smoke-test describe block:

```ts
describe('source-level completeness guard', () => {
	// Any file under src/app/api/** that imports an admin gate AND calls
	// payload.create/update/delete MUST also import from @/lib/admin-log.
	// This test fails CI the moment someone adds an unlogged admin route.
	//
	// Allowlist for deliberate exceptions. Every entry must have a comment
	// explaining why the file is exempt — "forgot to add it" is NOT a valid
	// reason; fix the route instead.
	const SKIP_FILES = new Set<string>([
		// Example: 'src/app/api/.../route.ts', // reason
	]);

	it('every admin-gated mutation route imports admin-log', async () => {
		const { readFileSync, readdirSync, statSync } = await import('node:fs');
		const { join, relative } = await import('node:path');

		const offenders: string[] = [];
		const walk = (dir: string) => {
			for (const name of readdirSync(dir)) {
				const full = join(dir, name);
				const st = statSync(full);
				if (st.isDirectory()) {
					walk(full);
					continue;
				}
				if (!/route\.ts$/.test(name)) continue;

				const rel = relative(process.cwd(), full).replace(/\\/g, '/');
				if (SKIP_FILES.has(rel)) continue;

				const content = readFileSync(full, 'utf8');

				const hasAdminGate =
					/from '@\/lib\/api-auth'/.test(content) &&
					/require(FullAdmin|GmAdmin)\b/.test(content);
				const hasPayloadMutation =
					/payload\.(create|update|delete)\s*\(/.test(content);

				if (hasAdminGate && hasPayloadMutation) {
					const hasLogImport = /from '@\/lib\/admin-log'/.test(content);
					if (!hasLogImport) offenders.push(rel);
				}
			}
		};

		walk(join(process.cwd(), 'src/app/api'));
		expect(offenders).toEqual([]);
	});
});
```

- [ ] **Step 2: Run the test**

Run: `npm run test -- admin-log.test.ts`
Expected: If all previous tasks instrumented their routes correctly, PASS. If any route was missed (including routes that only use `requireAdmin` — those are NOT caught by the regex, which is deliberate, the regex only matches `requireFullAdmin` / `requireGmAdmin`), the test will list offenders.

- [ ] **Step 3: Iterate on failures**

For each file in the `offenders` array:
- If it's a genuine admin mutation route that was missed → add the log call per the canonical patterns from Tasks 3-9.
- If it's a false positive (e.g. the route requires full admin but only calls `payload.find`, never mutates) → verify the regex shouldn't match it; if it still does, add to `SKIP_FILES` with a one-line comment.
- If it's a legitimate exception (e.g. an internal cron endpoint that ran as an admin but doesn't belong in the audit trail) → add to `SKIP_FILES`.

Re-run until green.

- [ ] **Step 4: Extend the test to also cover mixed-gate routes (informational-only, no CI fail)**

Append a SECOND test that walks the same files but looks for `requireSession` + `checkAdminPermissions` + `payload.*` mutation, and emits a `console.warn` (not a failure) listing them. This is a reminder for the reviewer to manually verify each of those routes has the `if (isAdmin) { ... }` log wrap.

```ts
	it('mixed-gate routes that require manual review (informational)', async () => {
		const { readFileSync, readdirSync, statSync } = await import('node:fs');
		const { join, relative } = await import('node:path');

		const mixedGated: string[] = [];
		const walk = (dir: string) => {
			for (const name of readdirSync(dir)) {
				const full = join(dir, name);
				const st = statSync(full);
				if (st.isDirectory()) { walk(full); continue; }
				if (!/route\.ts$/.test(name)) continue;
				const rel = relative(process.cwd(), full).replace(/\\/g, '/');
				const content = readFileSync(full, 'utf8');
				const usesRequireSession = /requireSession\b/.test(content);
				const checksAdmin = /checkAdminPermissions\b/.test(content);
				const mutates = /payload\.(create|update|delete)\s*\(/.test(content);
				if (usesRequireSession && checksAdmin && mutates) mixedGated.push(rel);
			}
		};
		walk(join(process.cwd(), 'src/app/api'));
		// Not a failure — we expect a small number (characters PATCH, characters POST, etc.)
		// Use this output during code review to confirm each is instrumented.
		if (mixedGated.length > 0) {
			console.warn('[admin-log] mixed-gate routes (manually verify each logs on admin branch):\n  ' + mixedGated.join('\n  '));
		}
		expect(Array.isArray(mixedGated)).toBe(true);
	});
```

- [ ] **Step 5: Commit**

```bash
git add tests/admin-log.test.ts
git commit -m "test(admin-logs): source-level completeness guard

Walks src/app/api/** and fails CI if any requireFullAdmin/requireGmAdmin
route performs a payload mutation without importing admin-log. Second
informational test lists mixed-gate routes (requireSession +
checkAdminPermissions + mutation) for manual review coverage.

Part of 1.6.57 — Journal admin tab."
```

---

## Task 11: Retention cron

**Files:**
- Create: `src/lib/admin-log-retention-cron.ts`
- Modify: existing cron bootstrap file (located in Step 1)
- Modify: `tests/admin-log.test.ts` — retention tests

- [ ] **Step 1: Locate the existing cron bootstrap**

Run: `Grep "game-sync-cron|startGameSyncCron"`

Find the file that starts `game-sync-cron` on app boot. CLAUDE.md says this is `src/lib/game-sync-cron.ts` and mentions "Auto-sync cron" — grep will reveal the start point (likely imported from a server bootstrap module, or from `src/payload.config.ts`-adjacent code, or from an instrumentation-hook file).

- [ ] **Step 2: Write failing tests**

Append to `tests/admin-log.test.ts`:

```ts
describe('admin-log retention cron', () => {
	it('pruneOnce deletes entries older than 180 days', async () => {
		const mockDelete = vi.fn().mockResolvedValue({ docs: [] });
		vi.doMock('@/lib/payload', () => ({
			getPayloadClient: async () => ({ delete: mockDelete }),
		}));
		// Re-import after mocking.
		const mod = await import('@/lib/admin-log-retention-cron');
		await mod.pruneOnce();

		expect(mockDelete).toHaveBeenCalledOnce();
		const call = mockDelete.mock.calls[0][0];
		expect(call.collection).toBe('admin-logs');
		const cutoff = new Date(call.where.createdAt.less_than);
		const expected = Date.now() - 180 * 24 * 60 * 60 * 1000;
		expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(2000);

		vi.doUnmock('@/lib/payload');
	});

	it('startAdminLogRetentionCron is idempotent', async () => {
		const mod = await import('@/lib/admin-log-retention-cron');
		mod.startAdminLogRetentionCron();
		mod.startAdminLogRetentionCron(); // second call is a no-op
		mod.stopAdminLogRetentionCron();
		expect(true).toBe(true); // test passes if neither call throws
	});
});
```

Run: `npm run test -- admin-log.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement the cron**

Create `src/lib/admin-log-retention-cron.ts`:

```ts
import { getPayloadClient } from './payload';

const RETENTION_DAYS = 180;
const INTERVAL_MS = 24 * 60 * 60 * 1000;

let started = false;
let timer: NodeJS.Timeout | null = null;
let bootDelay: NodeJS.Timeout | null = null;

/**
 * Delete admin_logs entries older than RETENTION_DAYS. Exported for tests
 * and for manual invocation via the Payload admin UI / a debug endpoint.
 * Errors are swallowed with console.error — audit-log retention failing
 * must never crash the app.
 */
export async function pruneOnce(): Promise<void> {
	try {
		const payload = await getPayloadClient();
		const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
		const result = await payload.delete({
			collection: 'admin-logs',
			where: { createdAt: { less_than: cutoff.toISOString() } },
		});
		const count = Array.isArray((result as { docs?: unknown[] }).docs)
			? (result as { docs: unknown[] }).docs.length
			: 0;
		if (count > 0) {
			console.log(
				`[admin-log-retention] pruned ${count} entries older than ${RETENTION_DAYS}d`,
			);
		}
	} catch (err) {
		console.error('[admin-log-retention] prune failed:', err);
	}
}

/**
 * Start the 24h retention cron. Idempotent: subsequent calls are no-ops
 * so HMR double-imports and multiple bootstrap paths do not spawn parallel
 * timers.
 */
export function startAdminLogRetentionCron(): void {
	if (started) return;
	started = true;
	// 60s startup delay so we don't race the DB during boot.
	bootDelay = setTimeout(() => void pruneOnce(), 60_000);
	timer = setInterval(() => void pruneOnce(), INTERVAL_MS);
}

export function stopAdminLogRetentionCron(): void {
	if (bootDelay) clearTimeout(bootDelay);
	if (timer) clearInterval(timer);
	started = false;
	bootDelay = null;
	timer = null;
}
```

- [ ] **Step 4: Wire the cron into the bootstrap**

Open the file located in Step 1 and add:

```ts
import { startAdminLogRetentionCron } from '@/lib/admin-log-retention-cron';

// ...near the existing startGameSyncCron() call...
startAdminLogRetentionCron();
```

- [ ] **Step 5: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin-log-retention-cron.ts tests/admin-log.test.ts <bootstrap-file>
git commit -m "feat(admin-logs): 180-day retention cron

Node-interval cron mirroring game-sync-cron. Prunes admin_logs entries
older than 180 days every 24h, with a 60s startup delay to avoid racing
the DB. Idempotent start() so HMR / multi-path bootstrap does not spawn
parallel timers. Errors swallowed — retention failure must not crash the
app.

Part of 1.6.57 — Journal admin tab."
```

---

## Task 12: List endpoint `GET /api/moderation/admin-logs`

**Files:**
- Create: `src/app/api/moderation/admin-logs/route.ts`
- Modify: `tests/admin-log.test.ts` — API test

- [ ] **Step 1: Write the failing test**

Append to `tests/admin-log.test.ts`:

```ts
describe('GET /api/moderation/admin-logs', () => {
	it('is gated by requireFullAdmin', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/moderation/admin-logs/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/requireFullAdmin/);
	});

	it('uses cursor pagination on createdAt + id', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/moderation/admin-logs/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/nextCursor/);
		expect(src).toMatch(/createdAt/);
	});
});
```

Run: `npm run test -- admin-log.test.ts` → FAIL (file missing).

- [ ] **Step 2: Implement the list endpoint**

Create `src/app/api/moderation/admin-logs/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
	const auth = await requireFullAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const sp = request.nextUrl.searchParams;
	const actor = sp.get('actor') ?? undefined;
	const action = sp.get('action') ?? undefined;
	const entityType = sp.get('entityType') ?? undefined;
	const dateFrom = sp.get('dateFrom') ?? undefined;
	const dateTo = sp.get('dateTo') ?? undefined;
	const q = sp.get('q')?.trim() ?? '';
	const cursor = sp.get('cursor') ?? undefined;
	const limit = Math.min(
		MAX_LIMIT,
		Math.max(1, Number(sp.get('limit')) || DEFAULT_LIMIT),
	);

	// Build the Payload `where` clause incrementally.
	const and: Record<string, unknown>[] = [];
	if (actor) and.push({ actorDiscordId: { equals: actor } });
	if (action) and.push({ action: { equals: action } });
	if (entityType) and.push({ entityType: { equals: entityType } });
	if (dateFrom) and.push({ createdAt: { greater_than_equal: new Date(dateFrom).toISOString() } });
	if (dateTo) {
		// dateTo is inclusive — push to end-of-day.
		const d = new Date(dateTo);
		d.setHours(23, 59, 59, 999);
		and.push({ createdAt: { less_than_equal: d.toISOString() } });
	}
	if (q) {
		// OR across summary, entityLabel, and a crude diff stringification.
		// Payload's Postgres adapter translates `like` to ILIKE.
		and.push({
			or: [
				{ summary: { like: q } },
				{ entityLabel: { like: q } },
				// For `diff` (jsonb), Payload does not expose a jsonb_path_exists
				// operator. Fall back to a raw text-cast ILIKE via a custom SQL
				// fragment in a future iteration if this proves insufficient.
				// v1 ships with summary+entityLabel coverage only.
			],
		});
	}
	// Cursor pagination: (createdAt, id) lexicographic. Cursor is a base64
	// encoding of `${createdAtIso}|${id}`.
	if (cursor) {
		try {
			const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
			const [iso, idStr] = decoded.split('|');
			if (iso && idStr) {
				and.push({
					or: [
						{ createdAt: { less_than: iso } },
						{
							and: [
								{ createdAt: { equals: iso } },
								{ id: { less_than: Number(idStr) } },
							],
						},
					],
				});
			}
		} catch {
			// Invalid cursor → ignore and return from the top.
		}
	}

	const where = and.length > 0 ? { and } : {};

	const payload = await getPayloadClient();
	const result = await payload.find({
		collection: 'admin-logs',
		where,
		sort: '-createdAt,-id',
		limit: limit + 1, // fetch one extra to determine nextCursor
		depth: 0,
	});

	const hasMore = result.docs.length > limit;
	const entries = hasMore ? result.docs.slice(0, limit) : result.docs;
	const last = entries[entries.length - 1];
	const nextCursor = hasMore && last
		? Buffer.from(`${new Date(last.createdAt).toISOString()}|${last.id}`).toString('base64url')
		: null;

	return NextResponse.json({ entries, nextCursor });
}
```

- [ ] **Step 3: Run tests + commit**

Run: `npm run test` — expect PASS.

```bash
git add src/app/api/moderation/admin-logs/route.ts tests/admin-log.test.ts
git commit -m "feat(admin-logs): GET /api/moderation/admin-logs list endpoint

Full-admin-only. Cursor pagination on (createdAt, id). Filters: actor,
action, entityType, dateFrom, dateTo, q. Search q matches summary +
entityLabel (jsonb diff search deferred to a future iteration).

Part of 1.6.57 — Journal admin tab."
```

---

## Task 13: Facets endpoint `GET /api/moderation/admin-logs/facets`

**Files:**
- Create: `src/app/api/moderation/admin-logs/facets/route.ts`
- Modify: `tests/admin-log.test.ts`

- [ ] **Step 1: Write the failing smoke test**

Append to `tests/admin-log.test.ts`:

```ts
	it('facets endpoint exists and is gated by requireFullAdmin', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/moderation/admin-logs/facets/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/requireFullAdmin/);
		expect(src).toMatch(/actors/);
		expect(src).toMatch(/actions/);
		expect(src).toMatch(/entityTypes/);
	});
```

- [ ] **Step 2: Implement**

Create `src/app/api/moderation/admin-logs/facets/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';

const CACHE_TTL_MS = 60_000;

interface FacetsPayload {
	actors: Array<{ id: string; username: string; avatar: string | null; count: number }>;
	actions: Array<{ action: string; count: number }>;
	entityTypes: Array<{ entityType: string; count: number }>;
}

let cached: { at: number; data: FacetsPayload } | null = null;

export async function GET(request: NextRequest) {
	const auth = await requireFullAdmin(request);
	if (isErrorResponse(auth)) return auth;

	if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
		return NextResponse.json(cached.data);
	}

	const payload = await getPayloadClient();

	// Pull ALL rows (up to a hard cap) and aggregate client-side. At the
	// expected volume (low hundreds of entries per week even with heavy use)
	// this is cheaper than 3 separate GROUP BY queries via Payload's query
	// API, which doesn't natively support aggregation.
	const res = await payload.find({
		collection: 'admin-logs',
		limit: 10_000,
		depth: 0,
		sort: '-createdAt',
	});

	const actorMap = new Map<string, { id: string; username: string; avatar: string | null; count: number }>();
	const actionMap = new Map<string, number>();
	const entityMap = new Map<string, number>();

	for (const row of res.docs) {
		const id = String((row as any).actorDiscordId);
		const existing = actorMap.get(id);
		if (existing) {
			existing.count++;
		} else {
			actorMap.set(id, {
				id,
				username: String((row as any).actorDiscordUsername ?? ''),
				avatar: (row as any).actorDiscordAvatar ?? null,
				count: 1,
			});
		}
		actionMap.set(
			String((row as any).action),
			(actionMap.get(String((row as any).action)) ?? 0) + 1,
		);
		if ((row as any).entityType) {
			const et = String((row as any).entityType);
			entityMap.set(et, (entityMap.get(et) ?? 0) + 1);
		}
	}

	const data: FacetsPayload = {
		actors: Array.from(actorMap.values()).sort((a, b) => b.count - a.count),
		actions: Array.from(actionMap.entries())
			.map(([action, count]) => ({ action, count }))
			.sort((a, b) => b.count - a.count),
		entityTypes: Array.from(entityMap.entries())
			.map(([entityType, count]) => ({ entityType, count }))
			.sort((a, b) => b.count - a.count),
	};

	cached = { at: Date.now(), data };
	return NextResponse.json(data);
}
```

- [ ] **Step 3: Run tests + commit**

```bash
git add src/app/api/moderation/admin-logs/facets/route.ts tests/admin-log.test.ts
git commit -m "feat(admin-logs): facets endpoint with 60s in-memory cache

Full-admin-only. Returns distinct actors / actions / entityTypes with
counts for populating filter dropdowns. Flat 60s cache — selecting one
filter does not narrow the dropdown options, which is the intended UX.

Part of 1.6.57 — Journal admin tab."
```

---

## Task 14: `AdminLogsTab` component

**Files:**
- Create: `src/components/moderation/AdminLogsTab.tsx`

- [ ] **Step 1: Define the component interface**

The tab component is self-contained — it fetches its own data from the two API endpoints. It receives the same prop shape as the sibling tabs (`authorized`, `onError`).

Create `src/components/moderation/AdminLogsTab.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface AdminLogsTabProps {
	authorized: boolean;
	onError: (msg: string) => void;
}

interface FacetActor { id: string; username: string; avatar: string | null; count: number }
interface FacetAction { action: string; count: number }
interface FacetEntity { entityType: string; count: number }

interface LogEntry {
	id: number;
	createdAt: string;
	actorDiscordId: string;
	actorDiscordUsername: string;
	actorDiscordAvatar: string | null;
	actorAdminLevel: string | null;
	action: string;
	summary: string;
	entityType: string | null;
	entityId: string | null;
	entityLabel: string | null;
	diff: Record<string, { before: unknown; after: unknown }> | null;
	metadata: Record<string, unknown> | null;
	ip: string | null;
	userAgent: string | null;
}

interface Filters {
	actor: string;
	action: string;
	entityType: string;
	dateFrom: string;
	dateTo: string;
	q: string;
}

const EMPTY_FILTERS: Filters = {
	actor: '',
	action: '',
	entityType: '',
	dateFrom: '',
	dateTo: '',
	q: '',
};

function relativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const sec = Math.round(diff / 1000);
	if (sec < 60) return `il y a ${sec}s`;
	const min = Math.round(sec / 60);
	if (min < 60) return `il y a ${min} min`;
	const h = Math.round(min / 60);
	if (h < 24) return `il y a ${h} h`;
	const d = Math.round(h / 24);
	return `il y a ${d} j`;
}

function filtersToQuery(f: Filters): string {
	const sp = new URLSearchParams();
	for (const [k, v] of Object.entries(f)) {
		if (v) sp.set(k, v);
	}
	const s = sp.toString();
	return s ? `?${s}` : '';
}

export default function AdminLogsTab({ authorized, onError }: AdminLogsTabProps) {
	const [entries, setEntries] = useState<LogEntry[]>([]);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [expanded, setExpanded] = useState<Set<number>>(new Set());
	const [filters, setFilters] = useState<Filters>(() => {
		if (typeof window === 'undefined') return EMPTY_FILTERS;
		const sp = new URLSearchParams(window.location.search);
		return {
			actor: sp.get('actor') ?? '',
			action: sp.get('action') ?? '',
			entityType: sp.get('entityType') ?? '',
			dateFrom: sp.get('dateFrom') ?? '',
			dateTo: sp.get('dateTo') ?? '',
			q: sp.get('q') ?? '',
		};
	});
	const [facets, setFacets] = useState<{
		actors: FacetActor[];
		actions: FacetAction[];
		entityTypes: FacetEntity[];
	}>({ actors: [], actions: [], entityTypes: [] });

	const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

	const loadFacets = useCallback(async () => {
		try {
			const res = await fetch('/api/moderation/admin-logs/facets');
			if (!res.ok) return;
			const data = await res.json();
			setFacets(data);
		} catch {
			// Silent — facets are a navigation aid, not authoritative.
		}
	}, []);

	const loadPage = useCallback(
		async (reset: boolean) => {
			setLoading(true);
			try {
				const sp = new URLSearchParams();
				for (const [k, v] of Object.entries(filters)) if (v) sp.set(k, v);
				if (!reset && nextCursor) sp.set('cursor', nextCursor);
				sp.set('limit', '50');

				const res = await fetch(`/api/moderation/admin-logs?${sp.toString()}`);
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.error || `Erreur ${res.status}`);
				}
				const data = await res.json();
				setEntries((prev) => (reset ? data.entries : [...prev, ...data.entries]));
				setNextCursor(data.nextCursor);
			} catch (e: any) {
				onError(e.message || 'Erreur lors du chargement des journaux');
			} finally {
				setLoading(false);
			}
		},
		[filters, nextCursor, onError],
	);

	// Reset + reload on filter change. URL mirror so filters survive reload.
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const query = filtersToQuery(filters);
			window.history.replaceState(
				null,
				'',
				`${window.location.pathname}${query}${window.location.hash}`,
			);
		}
		// Debounce the search field; other filters update immediately.
		if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		searchDebounceRef.current = setTimeout(() => {
			setEntries([]);
			setNextCursor(null);
			loadPage(true);
		}, 400);
		return () => {
			if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	useEffect(() => {
		if (authorized) loadFacets();
	}, [authorized, loadFacets]);

	const toggleExpanded = useCallback((id: number) => {
		setExpanded((s) => {
			const next = new Set(s);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const entityHref = (e: LogEntry): string | null => {
		if (!e.entityType || !e.entityId) return null;
		switch (e.entityType) {
			case 'character': return `/roleplay/personnage/${e.entityId}`;
			case 'faction':   return null; // no deep-link target
			case 'unit':      return null;
			case 'intelligence': return `/roleplay/intel/${e.entityId}`;
			default: return null;
		}
	};

	return (
		<div className="mod-admin-logs">
			<div className="mod-admin-logs__filters">
				<input
					type="search"
					placeholder="🔎 Recherche (résumé, nom d'entité)"
					value={filters.q}
					onChange={(e) => setFilters({ ...filters, q: e.target.value })}
				/>
				<select
					value={filters.actor}
					onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
				>
					<option value="">Tous les acteurs</option>
					{facets.actors.map((a) => (
						<option key={a.id} value={a.id}>{a.username} ({a.count})</option>
					))}
				</select>
				<select
					value={filters.action}
					onChange={(e) => setFilters({ ...filters, action: e.target.value })}
				>
					<option value="">Toutes les actions</option>
					{facets.actions.map((a) => (
						<option key={a.action} value={a.action}>{a.action} ({a.count})</option>
					))}
				</select>
				<select
					value={filters.entityType}
					onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
				>
					<option value="">Tous les types</option>
					{facets.entityTypes.map((e) => (
						<option key={e.entityType} value={e.entityType}>
							{e.entityType} ({e.count})
						</option>
					))}
				</select>
				<input
					type="date"
					value={filters.dateFrom}
					onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
				/>
				<input
					type="date"
					value={filters.dateTo}
					onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
				/>
				<button
					type="button"
					className="mod-btn"
					onClick={() => setFilters({ ...EMPTY_FILTERS })}
				>
					Réinitialiser
				</button>
				<button
					type="button"
					className="mod-btn"
					onClick={() => {
						setEntries([]);
						setNextCursor(null);
						loadPage(true);
						loadFacets();
					}}
				>
					⟳ Actualiser
				</button>
			</div>

			<div className="mod-admin-logs__list">
				{entries.length === 0 && !loading && (
					<div className="mod-empty">Aucune entrée</div>
				)}
				{entries.map((e) => {
					const isExp = expanded.has(e.id);
					const href = entityHref(e);
					return (
						<div key={e.id} className="mod-admin-logs__row">
							<button
								type="button"
								className="mod-admin-logs__row-head"
								onClick={() => toggleExpanded(e.id)}
							>
								<span className="mod-admin-logs__chev">{isExp ? '▼' : '▶'}</span>
								<span
									className="mod-admin-logs__time"
									title={new Date(e.createdAt).toLocaleString('fr-FR')}
								>
									{relativeTime(e.createdAt)}
								</span>
								<span className="mod-admin-logs__actor">
									{e.actorDiscordAvatar && (
										<img src={e.actorDiscordAvatar} alt="" className="mod-admin-logs__avatar" />
									)}
									{e.actorDiscordUsername}
								</span>
								<span className="mod-admin-logs__chip">{e.action}</span>
								<span className="mod-admin-logs__summary">{e.summary}</span>
							</button>
							{isExp && (
								<div className="mod-admin-logs__body">
									{e.entityLabel && (
										<div className="mod-admin-logs__entity">
											Entité:{' '}
											{href ? (
												<a href={href}>{e.entityLabel}</a>
											) : (
												<span>{e.entityLabel}</span>
											)}
										</div>
									)}
									{e.diff && Object.keys(e.diff).length > 0 && (
										<table className="mod-admin-logs__diff">
											<thead>
												<tr><th>Champ</th><th>Avant</th><th>Après</th></tr>
											</thead>
											<tbody>
												{Object.entries(e.diff).map(([field, { before, after }]) => (
													<tr key={field}>
														<td>{field}</td>
														<td><code>{JSON.stringify(before)}</code></td>
														<td><code>{JSON.stringify(after)}</code></td>
													</tr>
												))}
											</tbody>
										</table>
									)}
									{e.metadata && (
										<pre className="mod-admin-logs__metadata">
											{JSON.stringify(e.metadata, null, 2)}
										</pre>
									)}
									<div className="mod-admin-logs__meta">
										{e.ip && <span>IP: {e.ip}</span>}
										{e.actorAdminLevel && <span>Niveau: {e.actorAdminLevel}</span>}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{nextCursor && (
				<div className="mod-admin-logs__more">
					<button
						type="button"
						className="mod-btn"
						disabled={loading}
						onClick={() => loadPage(false)}
					>
						{loading ? 'Chargement…' : 'Charger 50 de plus'}
					</button>
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Run tests**

Run: `npm run test`
Expected: PASS (no new test, but existing tests still green).

- [ ] **Step 3: Commit**

```bash
git add src/components/moderation/AdminLogsTab.tsx
git commit -m "feat(admin-logs): AdminLogsTab component

Reverse-chrono list with filter dropdowns (actor/action/entityType),
date range, debounced search, URL query mirror for filter persistence,
cursor pagination, collapsible diff table rows. Deep-links entity labels
for characters and intelligence reports.

Part of 1.6.57 — Journal admin tab."
```

---

## Task 15: Wire the tab into `/moderation` + CSS

**Files:**
- Modify: `src/app/(frontend)/moderation/page.tsx`
- Modify: `src/app/(frontend)/moderation/moderation.css`

- [ ] **Step 1: Update the tab state type and import**

In `src/app/(frontend)/moderation/page.tsx`:

Add after line 8 (the existing tab imports):
```ts
import AdminLogsTab from '@/components/moderation/AdminLogsTab';
```

Change lines 30-32 from:
```ts
	const [tab, setTab] = useState<
		'users' | 'cases' | 'transcripts' | 'comms'
	>('users');
```
to:
```ts
	const [tab, setTab] = useState<
		'users' | 'cases' | 'transcripts' | 'comms' | 'admin-logs'
	>('users');
```

- [ ] **Step 2: Add the tab button**

In the tabs row at lines 180-205, add a fifth `<button>` after the existing `comms` tab. The button is rendered only for full admins — hide it otherwise:

```tsx
							<button
								className={`mod-tab${tab === 'comms' ? ' active' : ''}`}
								onClick={() => setTab('comms')}
							>
								Comms
							</button>
							{adminLevel === 'full' && (
								<button
									className={`mod-tab${tab === 'admin-logs' ? ' active' : ''}`}
									onClick={() => setTab('admin-logs')}
								>
									Journal admin
								</button>
							)}
```

- [ ] **Step 3: Render the tab content**

After the existing `{tab === 'comms' && ...}` block (around line 237-239), add:

```tsx
						{tab === 'admin-logs' && adminLevel === 'full' && (
							<AdminLogsTab authorized={authorized} onError={setError} />
						)}
```

- [ ] **Step 4: Add CSS**

Append to `src/app/(frontend)/moderation/moderation.css`:

```css
/* ─── Admin Logs tab ─── */
.mod-admin-logs { display: flex; flex-direction: column; gap: 12px; }
.mod-admin-logs__filters {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	padding: 12px;
	background: rgba(255, 255, 255, 0.03);
	border-radius: 6px;
}
.mod-admin-logs__filters input,
.mod-admin-logs__filters select {
	padding: 6px 10px;
	background: rgba(0, 0, 0, 0.3);
	border: 1px solid rgba(255, 255, 255, 0.1);
	color: var(--foreground);
	border-radius: 4px;
	font-size: 13px;
}
.mod-admin-logs__filters input[type="search"] { flex: 1 1 240px; }
.mod-admin-logs__list { display: flex; flex-direction: column; gap: 6px; }
.mod-admin-logs__row {
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 6px;
	background: rgba(0, 0, 0, 0.25);
	overflow: hidden;
}
.mod-admin-logs__row-head {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 10px 12px;
	background: transparent;
	border: 0;
	color: var(--foreground);
	text-align: left;
	cursor: pointer;
	font-size: 13px;
}
.mod-admin-logs__row-head:hover { background: rgba(255, 255, 255, 0.04); }
.mod-admin-logs__chev { opacity: 0.5; width: 12px; }
.mod-admin-logs__time { opacity: 0.7; white-space: nowrap; min-width: 80px; }
.mod-admin-logs__actor { display: flex; align-items: center; gap: 6px; font-weight: 600; min-width: 140px; }
.mod-admin-logs__avatar { width: 18px; height: 18px; border-radius: 50%; }
.mod-admin-logs__chip {
	padding: 2px 8px;
	background: rgba(100, 150, 255, 0.15);
	border: 1px solid rgba(100, 150, 255, 0.3);
	border-radius: 10px;
	font-family: monospace;
	font-size: 11px;
}
.mod-admin-logs__summary { flex: 1; opacity: 0.9; }
.mod-admin-logs__body { padding: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; }
.mod-admin-logs__entity { margin-bottom: 8px; }
.mod-admin-logs__entity a { color: #6aa9ff; }
.mod-admin-logs__diff { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
.mod-admin-logs__diff th,
.mod-admin-logs__diff td {
	padding: 4px 8px;
	border: 1px solid rgba(255, 255, 255, 0.08);
	text-align: left;
	vertical-align: top;
}
.mod-admin-logs__diff code { font-family: monospace; font-size: 11px; color: #ddd; word-break: break-all; }
.mod-admin-logs__metadata {
	background: rgba(0, 0, 0, 0.4);
	padding: 8px;
	border-radius: 4px;
	font-size: 11px;
	overflow-x: auto;
}
.mod-admin-logs__meta { display: flex; gap: 12px; opacity: 0.6; font-size: 11px; margin-top: 6px; }
.mod-admin-logs__more { display: flex; justify-content: center; padding: 12px; }
.mod-empty { padding: 24px; text-align: center; opacity: 0.5; }
```

- [ ] **Step 5: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(frontend\)/moderation/page.tsx src/app/\(frontend\)/moderation/moderation.css
git commit -m "feat(admin-logs): wire Journal admin tab into /moderation

5th tab visible only to full admins (adminLevel === 'full'). Hidden tab
button and guarded content render prevent non-full-admins from accessing
the UI even if they manipulate the tab state. CSS matches the existing
dark-panel aesthetic.

Part of 1.6.57 — Journal admin tab."
```

---

## Task 16: Version bump + final verification

**Files:**
- Modify: `src/lib/version.ts`

- [ ] **Step 1: Bump version to 1.6.57**

Edit `src/lib/version.ts`. Change the version string at line 9 to `'1.6.57'` and add a new changelog entry at the top of the `changelog` array (right after line 11):

```ts
    {
      version: '1.6.57',
      date: '2026-04-09',
      changes: [
        'MODÉRATION — Nouveau 5e onglet `Journal admin` accessible aux admins « full » uniquement, listant chaque action administrative effectuée via le frontend LIF : modifications de fiches de personnage, événements de timeline, factions, unités, rapports de renseignement, dossiers de modération, sanctions, canaux comms, suppression de messages comms, activation/désactivation du mode GameMaster, incarnation de PNJ, et forçage de liaison BI. Chaque entrée stocke l\'acteur (snapshot Discord), l\'action, l\'entité ciblée, et un diff complet avant/après des champs modifiés (ou un snapshot inflaté sur create/delete). Filtres acteur / type d\'action / type d\'entité / période + recherche texte, pagination par curseur, état des filtres persisté dans la query string. Journal rétentionné à 180 jours via un cron Node qui s\'aligne sur le pattern existant de `game-sync-cron`. Garde source-level dans les tests : tout nouveau endpoint `requireFullAdmin` / `requireGmAdmin` qui mute via Payload mais n\'importe pas `@/lib/admin-log` fait échouer la CI. Migration DB manuelle requise sur VPS après déploiement — voir notes de déploiement.',
      ],
    },
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: PASS — all tests green including the new ones. The version tests should pick up the new version automatically.

- [ ] **Step 3: Run the source-level completeness guard one last time**

Run: `npm run test -- admin-log.test.ts`
Expected: `source-level completeness guard` test green with no offenders. The `mixed-gate routes` informational test may log a `console.warn` listing files like `src/app/api/roleplay/characters/route.ts` and `src/app/api/roleplay/characters/[id]/route.ts` — manually verify each has an `if (isAdmin)` log wrap.

- [ ] **Step 4: Commit**

```bash
git add src/lib/version.ts
git commit -m "chore: bump version to 1.6.57 — Journal admin tab

Part of 1.6.57 — Journal admin tab."
```

- [ ] **Step 5: Apply the migration on dev VPS before deploying**

Deploy notes:

```bash
# SSH to dev VPS
ssh lif-server
cd /home/armarserver/LIF-Website-Dev

# Pull latest (Ansible deploy.yml will do this too, but we need the
# migration file present before running payload migrate).
git fetch origin dev && git reset --hard origin/dev

# Apply the migration.
npx payload migrate

# Verify the table exists.
psql $DATABASE_URI -c '\d admin_logs'
```

If `payload migrate` tries to recreate unrelated tables (a known gotcha per CLAUDE.md), apply the SQL fragment from `src/migrations/20260409_190000_admin_logs.ts` manually via psql, then mark it applied:

```bash
psql $DATABASE_URI <<'SQL'
CREATE TABLE IF NOT EXISTS "admin_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_discord_id" varchar NOT NULL,
	"actor_discord_username" varchar NOT NULL,
	"actor_discord_avatar" varchar,
	"actor_admin_level" varchar,
	"action" varchar NOT NULL,
	"summary" varchar NOT NULL,
	"entity_type" varchar,
	"entity_id" varchar,
	"entity_label" varchar,
	"diff" jsonb,
	"metadata" jsonb,
	"ip" varchar,
	"user_agent" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "admin_logs_actor_discord_id_idx" ON "admin_logs" ("actor_discord_id");
CREATE INDEX IF NOT EXISTS "admin_logs_action_idx" ON "admin_logs" ("action");
CREATE INDEX IF NOT EXISTS "admin_logs_entity_type_idx" ON "admin_logs" ("entity_type");
CREATE INDEX IF NOT EXISTS "admin_logs_created_at_idx" ON "admin_logs" ("created_at");
INSERT INTO payload_migrations (name, batch) VALUES (
	'20260409_190000_admin_logs',
	(SELECT COALESCE(MAX(batch), 0) + 1 FROM payload_migrations)
);
SQL
```

- [ ] **Step 6: Deploy to dev**

Use the `/deploy-dev` skill:
1. Confirm version bump (already done in Step 1)
2. Push to origin/dev
3. Run Ansible deploy
4. External health check
5. Manual QA per the spec's post-deploy checklist:
   - [ ] Edit a character sheet → entry appears with correct diff
   - [ ] Create a faction → `faction.create` with full inflated snapshot
   - [ ] Delete a timeline event → `character_timeline.delete` with `before` snapshot
   - [ ] Enter GM mode in /comms → `gm.enter` with `metadata: { enabled: true }`
   - [ ] Non-full-admin opens /moderation → tab button hidden; `GET /api/moderation/admin-logs` returns 403
   - [ ] Pagination: load 50, click "Charger 50 de plus", no duplicates
   - [ ] Filters: set actor + date range, reload, filters restored from URL
   - [ ] Manually invoke `pruneOnce()` with a backdated row → row deleted

---

## Deploy notes

1. **Migration** — apply before restart. See Task 16 Step 5.
2. **Retention cron** — starts automatically on app boot with a 60s delay; no manual trigger needed.
3. **First deploy will produce no log entries** until admins perform new actions post-deploy. The UI will show "Aucune entrée" — this is expected, not a bug.
4. **If the completeness guard test flags an offender after merge conflicts**, investigate before force-skipping. The allowlist in the test file is the only escape hatch.
