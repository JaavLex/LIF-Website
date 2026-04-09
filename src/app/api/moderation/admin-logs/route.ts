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
	if (dateFrom) {
		and.push({
			createdAt: { greater_than_equal: new Date(dateFrom).toISOString() },
		});
	}
	if (dateTo) {
		// dateTo is inclusive — push to end-of-day.
		const d = new Date(dateTo);
		d.setHours(23, 59, 59, 999);
		and.push({ createdAt: { less_than_equal: d.toISOString() } });
	}
	if (q) {
		// OR across summary + entityLabel. Payload's Postgres adapter
		// translates `like` to ILIKE. Jsonb diff search deferred — the
		// summary field already carries a human-readable description.
		and.push({
			or: [
				{ summary: { like: q } },
				{ entityLabel: { like: q } },
			],
		});
	}

	// Cursor pagination: (createdAt, id) lexicographic. Cursor is a base64url
	// encoding of `${createdAtIso}|${id}` so the client never sees raw values.
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
			// Invalid cursor → ignore and return from the top of the list.
		}
	}

	const where = and.length > 0 ? { and } : {};

	const payload = await getPayloadClient();
	const result = await payload.find({
		collection: 'admin-logs',
		where,
		sort: '-createdAt,-id',
		limit: limit + 1, // fetch one extra to detect "has more"
		depth: 0,
	});

	const hasMore = result.docs.length > limit;
	const entries = hasMore ? result.docs.slice(0, limit) : result.docs;
	const last = entries[entries.length - 1];
	const nextCursor =
		hasMore && last
			? Buffer.from(
					`${new Date(last.createdAt).toISOString()}|${last.id}`,
				).toString('base64url')
			: null;

	return NextResponse.json({ entries, nextCursor });
}
