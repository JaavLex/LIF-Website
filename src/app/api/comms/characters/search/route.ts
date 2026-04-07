import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { checkCommsEligibility } from '@/lib/comms';
import { getPayloadClient } from '@/lib/payload';

export async function GET(request: NextRequest) {
	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}

	const url = new URL(request.url);
	const q = (url.searchParams.get('q') || '').trim();

	const payload = await getPayloadClient();
	const where: any = { status: { equals: 'in-service' } };
	if (q) {
		where.fullName = { like: q };
	}
	const result = await payload.find({
		collection: 'characters',
		where,
		limit: 25,
		depth: 1,
		sort: 'fullName',
	});
	return NextResponse.json({
		characters: (result.docs as any[])
			.filter((c) => c.id !== eligibility.character.id)
			.map((c) => ({
				id: c.id,
				fullName: c.fullName,
				rankName: typeof c.rank === 'object' ? c.rank?.name : null,
				avatarUrl:
					typeof c.avatar === 'object' ? c.avatar?.url || null : null,
			})),
	});
}
