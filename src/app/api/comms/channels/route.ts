import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import {
	checkCommsEligibility,
	syncAutoChannelsForCharacter,
	listChannelsForCharacter,
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

	const channels = await listChannelsForCharacter(eligibility.character.id);

	// For each channel, attach last message and unread count (cheap impl)
	const payload = await getPayloadClient();
	const enriched = await Promise.all(
		channels.map(async (ch: any) => {
			const lastMsg = await payload.find({
				collection: 'comms-messages',
				where: { channelId: { equals: ch.id }, deletedAt: { exists: false } },
				sort: '-createdAt',
				limit: 1,
			});
			const last = (lastMsg.docs[0] as any) || null;
			return {
				id: ch.id,
				name: ch.name,
				type: ch.type,
				factionRef: ch.factionRef,
				unitRefId: ch.unitRefId,
				memberCount: Array.isArray(ch.members) ? ch.members.length : 0,
				members: ch.members || [],
				createdByCharacterId: ch.createdByCharacterId,
				lastMessageAt: ch.lastMessageAt,
				lastMessagePreview: last?.body
					? String(last.body).slice(0, 100)
					: null,
			};
		}),
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
