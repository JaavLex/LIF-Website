import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { checkCommsEligibility } from '@/lib/comms';
import { getPayloadClient } from '@/lib/payload';

export async function POST(request: NextRequest) {
	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}

	const body = await request.json();
	const target = Number(body.targetCharacterId);
	const anonymous = !!body.anonymous;
	if (!target || target === eligibility.character.id) {
		return NextResponse.json({ error: 'Cible invalide' }, { status: 400 });
	}

	const payload = await getPayloadClient();

	// Verify the target character exists & is in service
	const targetDoc = await payload.findByID({
		collection: 'characters',
		id: target,
	}).catch(() => null);
	if (!targetDoc) {
		return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 });
	}

	// Look for an existing DM channel with exactly these two members.
	// Anon and non-anon DMs are kept as separate channels because the
	// anonymity flag is part of the channel identity (different display,
	// different read semantics for the recipient).
	const existing = await payload.find({
		collection: 'comms-channels',
		where: { type: { equals: 'dm' } },
		limit: 500,
	});
	const sortedPair = [eligibility.character.id, target].sort((a, b) => a - b);
	const match = (existing.docs as any[]).find((ch) => {
		const m: number[] = Array.isArray(ch.members) ? ch.members : [];
		if (m.length !== 2) return false;
		const sorted = [...m].map(Number).sort((a, b) => a - b);
		const sameMembers =
			sorted[0] === sortedPair[0] && sorted[1] === sortedPair[1];
		if (!sameMembers) return false;
		const chAnonId =
			ch.anonForCharacterId != null ? Number(ch.anonForCharacterId) : null;
		if (anonymous) {
			return chAnonId === eligibility.character.id;
		}
		return chAnonId == null;
	});

	if (match) {
		return NextResponse.json({ id: match.id, existed: true });
	}

	// For anon DMs, the name must not reveal the initiator since the recipient
	// will see this fallback. The initiator's view is overridden by the
	// channel enrichment helper.
	const channelName = anonymous
		? `DM anonyme — [ANONYME] ↔ ${(targetDoc as any).fullName}`
		: `DM — ${eligibility.character.fullName} ↔ ${(targetDoc as any).fullName}`;

	const created = await payload.create({
		collection: 'comms-channels',
		data: {
			name: channelName,
			type: 'dm',
			members: sortedPair,
			createdByCharacterId: eligibility.character.id,
			...(anonymous ? { anonForCharacterId: eligibility.character.id } : {}),
		} as any,
	});
	return NextResponse.json({ id: created.id, existed: false });
}
