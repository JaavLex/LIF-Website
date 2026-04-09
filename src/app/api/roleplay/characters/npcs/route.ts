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
