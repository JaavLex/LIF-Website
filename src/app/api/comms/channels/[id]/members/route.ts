import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { checkCommsEligibility } from '@/lib/comms';
import { getPayloadClient } from '@/lib/payload';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const channelId = parseInt(id, 10);
	if (isNaN(channelId)) {
		return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
	}

	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}

	const payload = await getPayloadClient();
	const channel = await payload
		.findByID({ collection: 'comms-channels', id: channelId })
		.catch(() => null);
	if (!channel) {
		return NextResponse.json({ error: 'not_found' }, { status: 404 });
	}

	const memberIds: number[] = Array.isArray((channel as any).members)
		? (channel as any).members.map(Number).filter((n: number) => !isNaN(n))
		: [];

	// Enforce: requesting character must be a member
	if (!memberIds.includes(eligibility.character.id)) {
		return NextResponse.json({ error: 'forbidden' }, { status: 403 });
	}

	if (memberIds.length === 0) {
		return NextResponse.json({ members: [] });
	}

	const result = await payload.find({
		collection: 'characters',
		where: { id: { in: memberIds } },
		limit: memberIds.length,
		depth: 2,
	});

	const members = (result.docs as any[]).map((c) => ({
		id: c.id,
		fullName: c.fullName || `${c.firstName} ${c.lastName}`,
		callsign: c.callsign || null,
		rankName: typeof c.rank === 'object' ? c.rank?.name || null : null,
		unitName: typeof c.unit === 'object' ? c.unit?.name || null : null,
		faction: c.faction || null,
		avatarUrl: typeof c.avatar === 'object' ? c.avatar?.url || null : null,
		status: c.status,
	}));

	// Sort: by rank order if available, then name
	members.sort((a, b) => a.fullName.localeCompare(b.fullName));

	return NextResponse.json({ members });
}
