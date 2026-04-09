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

// Fields stripped from every diff — Payload internals that change on every
// mutation and would pollute every log entry.
const IGNORED_DIFF_FIELDS = new Set([
	'id',
	'updatedAt',
	'createdAt',
	'_status',
]);

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
 * INVARIANT: never throws. Audit logging is best-effort — a failed write must
 * not break the admin action it records. Callers should `void`-prefix the
 * call to fire-and-forget.
 */
export async function logAdminAction(entry: LogEntry): Promise<void> {
	try {
		let diff: Record<string, { before: unknown; after: unknown }> | null = null;
		if (entry.before && entry.after) {
			diff = computeDiff(entry.before, entry.after);
		} else if (entry.after) {
			diff = inflateSnapshot(entry.after, 'create');
		} else if (entry.before) {
			diff = inflateSnapshot(entry.before, 'delete');
		}

		// Skip no-op updates only. Create/delete always log. Non-mutation
		// events always log (diff is null, not {}).
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
