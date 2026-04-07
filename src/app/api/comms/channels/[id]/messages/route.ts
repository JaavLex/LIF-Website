import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';
import {
	checkCommsEligibility,
	hasAcceptedDisclaimer,
	checkRateLimit,
	COMMS_LIMITS,
} from '@/lib/comms';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const channelId = parseInt(id, 10);
	if (isNaN(channelId)) {
		return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
	}

	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}

	const payload = await getPayloadClient();
	const channel = (await payload
		.findByID({ collection: 'comms-channels', id: channelId })
		.catch(() => null)) as any;
	if (!channel)
		return NextResponse.json({ error: 'Canal introuvable' }, { status: 404 });

	// Verify membership
	const members: number[] = Array.isArray(channel.members) ? channel.members : [];
	if (!members.map(Number).includes(eligibility.character.id)) {
		return NextResponse.json({ error: 'Non membre' }, { status: 403 });
	}

	const url = new URL(request.url);
	const before = url.searchParams.get('before');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

	const where: any = {
		and: [
			{ channelId: { equals: channelId } },
			{ deletedAt: { exists: false } },
		],
	};
	if (before) {
		where.and.push({ id: { less_than: parseInt(before, 10) } });
	}

	const messages = await payload.find({
		collection: 'comms-messages',
		where,
		sort: '-id',
		limit,
	});

	// Hydrate sender info; respect anonymous flag
	const senderIds = Array.from(
		new Set(messages.docs.map((m: any) => m.senderCharacterId)),
	);
	const senders = senderIds.length
		? await payload.find({
				collection: 'characters',
				where: { id: { in: senderIds } },
				limit: 200,
				depth: 1,
			})
		: { docs: [] };
	const senderMap = new Map(
		(senders.docs as any[]).map((c) => [
			c.id,
			{
				id: c.id,
				fullName: c.fullName,
				avatarUrl: typeof c.avatar === 'object' ? c.avatar?.url || null : null,
				rankName: typeof c.rank === 'object' ? c.rank?.name : null,
			},
		]),
	);

	const items = messages.docs
		.map((m: any) => {
			const sender = senderMap.get(m.senderCharacterId) || null;
			return {
				id: m.id,
				channelId: m.channelId,
				body: m.body || '',
				attachments: m.attachments || [],
				isAnonymous: !!m.isAnonymous,
				senderCharacter: m.isAnonymous
					? { fullName: '[ANONYME]', avatarUrl: null, rankName: null }
					: sender,
				senderCharacterId: m.isAnonymous ? null : m.senderCharacterId,
				editedAt: m.editedAt,
				createdAt: m.createdAt,
				isOwn: m.senderCharacterId === eligibility.character.id,
			};
		})
		.reverse(); // ascending order for display

	return NextResponse.json({ messages: items });
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const channelId = parseInt(id, 10);
	if (isNaN(channelId)) {
		return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
	}

	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}

	if (!(await hasAcceptedDisclaimer(session!))) {
		return NextResponse.json(
			{ error: 'disclaimer_required' },
			{ status: 403 },
		);
	}

	if (!checkRateLimit(session!.discordId)) {
		return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
	}

	const payload = await getPayloadClient();
	const channel = (await payload
		.findByID({ collection: 'comms-channels', id: channelId })
		.catch(() => null)) as any;
	if (!channel)
		return NextResponse.json({ error: 'Canal introuvable' }, { status: 404 });

	const members: number[] = Array.isArray(channel.members) ? channel.members : [];
	if (!members.map(Number).includes(eligibility.character.id)) {
		return NextResponse.json({ error: 'Non membre' }, { status: 403 });
	}

	const body = await request.json();
	const text: string = (body.body || '').toString();
	const isAnonymous = !!body.isAnonymous;
	const attachments: any[] = Array.isArray(body.attachments) ? body.attachments : [];

	if (!text.trim() && attachments.length === 0) {
		return NextResponse.json({ error: 'Message vide' }, { status: 400 });
	}
	if (text.length > COMMS_LIMITS.maxBodyLength) {
		return NextResponse.json(
			{ error: `Message trop long (max ${COMMS_LIMITS.maxBodyLength})` },
			{ status: 400 },
		);
	}
	if (attachments.length > COMMS_LIMITS.maxAttachments) {
		return NextResponse.json(
			{ error: `Maximum ${COMMS_LIMITS.maxAttachments} pièces jointes` },
			{ status: 400 },
		);
	}

	// Validate attachment shape
	for (const a of attachments) {
		if (!a || !a.kind || !['character', 'intel', 'media'].includes(a.kind)) {
			return NextResponse.json({ error: 'Pièce jointe invalide' }, { status: 400 });
		}
		if (a.kind === 'intel') {
			// Verify the user can read this intel (classification check)
			const intel = (await payload
				.findByID({ collection: 'intelligence', id: Number(a.refId) })
				.catch(() => null)) as any;
			if (!intel) {
				return NextResponse.json(
					{ error: 'Renseignement introuvable' },
					{ status: 400 },
				);
			}
			if (intel.classification === 'classified') {
				const isAdmin = !!eligibility.character && false; // strict: only admin can share classified
				const { checkAdminPermissions } = await import('@/lib/admin');
				const adminCheck = await checkAdminPermissions(session!);
				if (!adminCheck.isAdmin) {
					return NextResponse.json(
						{ error: 'classification_denied' },
						{ status: 403 },
					);
				}
				void isAdmin;
			}
		}
	}

	const ip =
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		request.headers.get('x-real-ip') ||
		'';

	const created = await payload.create({
		collection: 'comms-messages',
		data: {
			channelId,
			senderCharacterId: eligibility.character.id,
			senderDiscordId: session!.discordId,
			isAnonymous,
			body: text,
			attachments,
			senderIp: ip,
		} as any,
	});

	// Update channel last message timestamp
	await payload.update({
		collection: 'comms-channels',
		id: channelId,
		data: { lastMessageAt: new Date().toISOString() } as any,
	});

	return NextResponse.json({ id: created.id });
}
