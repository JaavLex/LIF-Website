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
});
