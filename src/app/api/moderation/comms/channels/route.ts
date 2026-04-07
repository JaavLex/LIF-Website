import { NextRequest, NextResponse } from 'next/server';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';

export async function GET(request: NextRequest) {
	const auth = await requireFullAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const url = new URL(request.url);
	const type = url.searchParams.get('type');
	const search = url.searchParams.get('search');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

	const payload = await getPayloadClient();
	const where: any = {};
	if (type) where.type = { equals: type };
	if (search) where.name = { like: search };

	const result = await payload.find({
		collection: 'comms-channels',
		where,
		limit,
		sort: '-lastMessageAt',
	});
	return NextResponse.json({
		channels: (result.docs as any[]).map((ch) => ({
			id: ch.id,
			name: ch.name,
			type: ch.type,
			factionRef: ch.factionRef,
			unitRefId: ch.unitRefId,
			members: ch.members || [],
			memberCount: Array.isArray(ch.members) ? ch.members.length : 0,
			createdByCharacterId: ch.createdByCharacterId,
			lastMessageAt: ch.lastMessageAt,
			createdAt: ch.createdAt,
		})),
	});
}
