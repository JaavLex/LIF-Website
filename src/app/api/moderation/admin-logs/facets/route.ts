import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';

const CACHE_TTL_MS = 60_000;

interface FacetsPayload {
	actors: Array<{
		id: string;
		username: string;
		avatar: string | null;
		count: number;
	}>;
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

	// Pull ALL rows (up to a hard cap) and aggregate in-process. At expected
	// volume (low hundreds of entries per week even with heavy use) this is
	// cheaper than 3 separate GROUP BY queries via Payload's query API,
	// which does not natively expose SQL aggregation.
	const res = await payload.find({
		collection: 'admin-logs',
		limit: 10_000,
		depth: 0,
		sort: '-createdAt',
	});

	const actorMap = new Map<
		string,
		{ id: string; username: string; avatar: string | null; count: number }
	>();
	const actionMap = new Map<string, number>();
	const entityMap = new Map<string, number>();

	for (const row of res.docs as Array<{
		actorDiscordId: string;
		actorDiscordUsername: string;
		actorDiscordAvatar?: string | null;
		action: string;
		entityType?: string | null;
	}>) {
		const id = String(row.actorDiscordId);
		const existing = actorMap.get(id);
		if (existing) {
			existing.count++;
		} else {
			actorMap.set(id, {
				id,
				username: String(row.actorDiscordUsername ?? ''),
				avatar: row.actorDiscordAvatar ?? null,
				count: 1,
			});
		}
		const action = String(row.action);
		actionMap.set(action, (actionMap.get(action) ?? 0) + 1);
		if (row.entityType) {
			const et = String(row.entityType);
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
