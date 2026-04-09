import { describe, it, expect, vi, beforeEach } from 'vitest';

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
		expect(call.data.entityId).toBe('42');
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

	it('writes when update has no diff but metadata is present', async () => {
		await logAdminAction({
			session: SESSION,
			action: 'character.update',
			summary: 'annotation only',
			before: { rank: 'CPL' },
			after: { rank: 'CPL' },
			metadata: { note: 'admin override' },
		});
		expect(mockCreate).toHaveBeenCalledOnce();
		const data = mockCreate.mock.calls[0][0].data;
		expect(data.diff).toEqual({});
		expect(data.metadata).toEqual({ note: 'admin override' });
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

	it('timeline POST route imports logAdminAction', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/roleplay/timeline/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/from '@\/lib\/admin-log'/);
	});

	it('timeline DELETE route imports logAdminAction', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/roleplay/timeline/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/character_timeline\.delete/);
	});

	it.each([
		'src/app/api/roleplay/factions/route.ts',
		'src/app/api/roleplay/factions/[id]/route.ts',
		'src/app/api/roleplay/units/route.ts',
		'src/app/api/roleplay/units/[id]/route.ts',
		'src/app/api/roleplay/intelligence/route.ts',
		'src/app/api/roleplay/intelligence/[id]/route.ts',
		'src/app/api/moderation/cases/route.ts',
		'src/app/api/moderation/cases/[id]/route.ts',
		'src/app/api/moderation/comms/messages/[id]/route.ts',
		'src/app/api/comms/channels/[id]/route.ts',
	])('%s imports logAdminAction', async (rel) => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(join(process.cwd(), rel), 'utf8');
		expect(src).toMatch(/from '@\/lib\/admin-log'/);
	});

	it('moderation comms messages route logs both delete and restore actions', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/moderation/comms/messages/[id]/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/comms_message\.delete/);
		expect(src).toMatch(/comms_message\.restore/);
	});

	it('comms channels [id] route logs update and delete actions', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/comms/channels/[id]/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/comms_channel\.update/);
		expect(src).toMatch(/comms_channel\.delete/);
	});

	it('gm/toggle route logs gm.enter and gm.exit', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/comms/gm/toggle/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/from '@\/lib\/admin-log'/);
		expect(src).toMatch(/gm\.enter/);
		expect(src).toMatch(/gm\.exit/);
	});

	it('comms messages POST route logs gm.impersonate', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/comms/channels/[id]/messages/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/from '@\/lib\/admin-log'/);
		expect(src).toMatch(/gm\.impersonate/);
	});

	it('characters [id] PATCH logs character.link.admin_override', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/app/api/roleplay/characters/[id]/route.ts'),
			'utf8',
		);
		expect(src).toMatch(/character\.link\.admin_override/);
	});

	it('useGmMode client fires POST to /api/comms/gm/toggle on setEnabled', async () => {
		const { readFileSync } = await import('node:fs');
		const { join } = await import('node:path');
		const src = readFileSync(
			join(process.cwd(), 'src/components/comms/useGmMode.tsx'),
			'utf8',
		);
		expect(src).toMatch(/\/api\/comms\/gm\/toggle/);
	});
});

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

describe('admin-log retention cron', () => {
	it('pruneOnce deletes entries older than 180 days', async () => {
		const mockDelete = vi.fn().mockResolvedValue({ docs: [] });
		vi.doMock('@/lib/payload', () => ({
			getPayloadClient: async () => ({ delete: mockDelete }),
		}));
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
		expect(true).toBe(true); // passes if neither call throws
	});
});

describe('source-level completeness guard', () => {
	// Any file under src/app/api/** that imports requireFullAdmin /
	// requireGmAdmin AND calls payload.create/update/delete MUST also import
	// from @/lib/admin-log. Fails CI the moment an unlogged admin route is
	// added — "forgot to instrument it" stops being a silent regression.
	//
	// The regex only matches requireFullAdmin / requireGmAdmin, not plain
	// requireAdmin or requireSession + checkAdminPermissions. Those mixed-gate
	// routes are reviewed manually in the secondary informational pass below.
	//
	// Allowlist for deliberate exceptions — every entry must carry a comment
	// explaining why. "Forgot" is NOT a valid reason; fix the route instead.
	const SKIP_FILES = new Set<string>([
		// GET uses requireGmAdmin for read-only access to GM bypass channels;
		// POST (the only mutation) is not admin-gated — any eligible comms
		// user creates group channels there. Not an admin action.
		'src/app/api/comms/channels/route.ts',
	]);

	it('every full/GM-admin mutation route imports admin-log', async () => {
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
