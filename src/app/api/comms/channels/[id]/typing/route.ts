import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { checkCommsEligibility } from '@/lib/comms';
import { getPayloadClient } from '@/lib/payload';
import { setTyping, getTyping } from '@/lib/comms-typing';

async function loadChannelAndAuth(request: NextRequest, idStr: string) {
	const channelId = parseInt(idStr, 10);
	if (isNaN(channelId)) {
		return { error: NextResponse.json({ error: 'ID invalide' }, { status: 400 }) };
	}
	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return {
			error: NextResponse.json({ error: eligibility.reason }, { status: 403 }),
		};
	}
	const payload = await getPayloadClient();
	const channel = (await payload
		.findByID({ collection: 'comms-channels', id: channelId })
		.catch(() => null)) as any;
	if (!channel) {
		return { error: NextResponse.json({ error: 'Canal introuvable' }, { status: 404 }) };
	}
	const members: number[] = Array.isArray(channel.members) ? channel.members : [];
	if (!members.map(Number).includes(eligibility.character.id)) {
		return { error: NextResponse.json({ error: 'Non membre' }, { status: 403 }) };
	}
	return { channelId, characterId: eligibility.character.id, channel };
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const ctx = await loadChannelAndAuth(request, id);
	if ('error' in ctx) return ctx.error;
	setTyping(ctx.channelId, ctx.characterId);
	return NextResponse.json({ ok: true });
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const ctx = await loadChannelAndAuth(request, id);
	if ('error' in ctx) return ctx.error;

	const typingIds = getTyping(ctx.channelId, ctx.characterId);
	if (typingIds.length === 0) {
		return NextResponse.json({ typing: [] });
	}

	// Resolve names. If channel is anon DM and viewer is the recipient,
	// the typing initiator must be masked.
	const channel = ctx.channel as any;
	const anonForId =
		channel.anonForCharacterId != null ? Number(channel.anonForCharacterId) : null;

	const payload = await getPayloadClient();
	const result = await payload.find({
		collection: 'characters',
		where: { id: { in: typingIds } },
		limit: typingIds.length,
	});
	const typing = (result.docs as any[]).map((c) => {
		const masked =
			anonForId != null && Number(c.id) === anonForId && ctx.characterId !== anonForId;
		return {
			id: c.id,
			fullName: masked ? '[ANONYME]' : c.fullName,
		};
	});
	return NextResponse.json({ typing });
}
