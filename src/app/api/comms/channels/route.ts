import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import {
	checkCommsEligibility,
	syncAutoChannelsForCharacter,
	syncAllAutoChannels,
	listChannelsForCharacter,
	enrichChannelsForDisplay,
	COMMS_LIMITS,
} from '@/lib/comms';
import { getPayloadClient } from '@/lib/payload';

export async function GET(request: NextRequest) {
	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}

	// Make sure auto-channels exist & sync membership
	await syncAutoChannelsForCharacter(eligibility.character);
	// Full sync of all factions/units (cached 30s in-memory)
	await syncAllAutoChannels();

	const channels = await listChannelsForCharacter(eligibility.character.id);

	// Batch fetch last message per channel
	const payload = await getPayloadClient();
	const lastMessageMap = new Map<number, any>();
	if (channels.length > 0) {
		const channelIds = channels.map((c: any) => c.id);
		const allLast = await payload.find({
			collection: 'comms-messages',
			where: {
				and: [
					{ channelId: { in: channelIds } },
					{ deletedAt: { exists: false } },
				],
			},
			sort: '-createdAt',
			limit: channelIds.length * 5,
		});
		for (const m of allLast.docs as any[]) {
			const cid = Number(m.channelId);
			if (!lastMessageMap.has(cid)) lastMessageMap.set(cid, m);
		}
	}

	const enriched = await enrichChannelsForDisplay(
		channels,
		eligibility.character.id,
		lastMessageMap,
	);

	return NextResponse.json({
		character: eligibility.character,
		channels: enriched,
	});
}

export async function POST(request: NextRequest) {
	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}

	const body = await request.json();
	const name: string = (body.name || '').trim();
	const memberCharacterIds: number[] = Array.isArray(body.memberCharacterIds)
		? body.memberCharacterIds.map(Number).filter((n: number) => !isNaN(n))
		: [];

	if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
	if (memberCharacterIds.length < 1) {
		return NextResponse.json(
			{ error: 'Au moins un autre membre requis' },
			{ status: 400 },
		);
	}

	// Always include creator
	const allMembers = Array.from(
		new Set([eligibility.character.id, ...memberCharacterIds]),
	);
	if (allMembers.length > COMMS_LIMITS.maxGroupMembers) {
		return NextResponse.json(
			{ error: `Maximum ${COMMS_LIMITS.maxGroupMembers} membres par groupe` },
			{ status: 400 },
		);
	}

	const payload = await getPayloadClient();
	const channel = await payload.create({
		collection: 'comms-channels',
		data: {
			name,
			type: 'group',
			members: allMembers,
			createdByCharacterId: eligibility.character.id,
		} as any,
	});
	return NextResponse.json({ id: channel.id });
}
