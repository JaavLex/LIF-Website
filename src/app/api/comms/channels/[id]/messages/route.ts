import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';
import {
	checkCommsEligibility,
	hasAcceptedDisclaimer,
	checkRateLimit,
	COMMS_LIMITS,
} from '@/lib/comms';
import { isOnline } from '@/lib/comms-presence';
import { sendDiscordDM } from '@/lib/moderation';

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
				depth: 2,
			})
		: { docs: [] };
	const senderMap = new Map(
		(senders.docs as any[]).map((c) => [
			c.id,
			{
				id: c.id,
				fullName: c.fullName,
				callsign: c.callsign || null,
				avatarUrl: typeof c.avatar === 'object' ? c.avatar?.url || null : null,
				rankName: typeof c.rank === 'object' ? c.rank?.name : null,
				rankIconUrl:
					typeof c.rank === 'object' && typeof c.rank?.icon === 'object'
						? c.rank?.icon?.url || null
						: null,
			},
		]),
	);

	// Anonymous DM logic: if channel.anonForCharacterId is set, force anon for that sender
	// when viewer is the OTHER party. The anon initiator still sees themselves normally.
	const anonForId: number | null =
		channel.anonForCharacterId != null ? Number(channel.anonForCharacterId) : null;
	const viewerId = eligibility.character.id;

	// Resolve replyTo previews
	const replyIds = Array.from(
		new Set(
			messages.docs
				.map((m: any) => m.replyToMessageId)
				.filter((v: any) => v != null),
		),
	);
	const replyMap = new Map<number, { id: number; snippet: string; senderName: string }>();
	if (replyIds.length) {
		const replies = await payload.find({
			collection: 'comms-messages',
			where: { id: { in: replyIds } },
			limit: replyIds.length,
		});
		const replySenderIds = Array.from(
			new Set((replies.docs as any[]).map((r) => r.senderCharacterId)),
		);
		const replySenders = replySenderIds.length
			? await payload.find({
					collection: 'characters',
					where: { id: { in: replySenderIds } },
					limit: 200,
				})
			: { docs: [] };
		const replySenderMap = new Map(
			(replySenders.docs as any[]).map((c) => [c.id, c.fullName]),
		);
		for (const r of replies.docs as any[]) {
			const isAnon =
				!!r.isAnonymous ||
				(anonForId != null && Number(r.senderCharacterId) === anonForId && viewerId !== anonForId);
			replyMap.set(r.id, {
				id: r.id,
				snippet: (r.body || '').slice(0, 120),
				senderName: isAnon
					? '[ANONYME]'
					: replySenderMap.get(r.senderCharacterId) || '???',
			});
		}
	}

	// Resolve mentions
	const mentionIds = new Set<number>();
	for (const m of messages.docs as any[]) {
		if (Array.isArray(m.mentions)) {
			for (const id of m.mentions) {
				const n = Number(id);
				if (!isNaN(n)) mentionIds.add(n);
			}
		}
	}
	const mentionMap = new Map<number, string>();
	if (mentionIds.size) {
		const mentioned = await payload.find({
			collection: 'characters',
			where: { id: { in: Array.from(mentionIds) } },
			limit: 200,
		});
		for (const c of mentioned.docs as any[]) {
			mentionMap.set(c.id, c.fullName);
		}
	}

	const items = messages.docs
		.map((m: any) => {
			const senderId = Number(m.senderCharacterId);
			const sender = senderMap.get(senderId) || null;
			const forceAnon =
				anonForId != null && senderId === anonForId && viewerId !== anonForId;
			const effectiveAnon = !!m.isAnonymous || forceAnon;
			return {
				id: m.id,
				channelId: m.channelId,
				body: m.body || '',
				attachments: m.attachments || [],
				isAnonymous: effectiveAnon,
				senderCharacter: effectiveAnon
					? { fullName: '[ANONYME]', callsign: null, avatarUrl: null, rankName: null, rankIconUrl: null }
					: sender,
				senderCharacterId: effectiveAnon ? null : senderId,
				replyTo: m.replyToMessageId ? replyMap.get(Number(m.replyToMessageId)) || null : null,
				mentions: Array.isArray(m.mentions)
					? m.mentions
							.map((id: any) => {
								const n = Number(id);
								const name = mentionMap.get(n);
								return name ? { id: n, name } : null;
							})
							.filter(Boolean)
					: [],
				editedAt: m.editedAt,
				createdAt: m.createdAt,
				isOwn: senderId === viewerId,
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
	const clientAnon = !!body.isAnonymous;
	const attachments: any[] = Array.isArray(body.attachments) ? body.attachments : [];
	const replyToMessageId: number | null =
		body.replyToMessageId != null && !isNaN(Number(body.replyToMessageId))
			? Number(body.replyToMessageId)
			: null;

	// Force anon when channel is an anon DM and sender is the anon initiator
	const channelAnonForId: number | null =
		channel.anonForCharacterId != null ? Number(channel.anonForCharacterId) : null;
	const isAnonymous =
		clientAnon || (channelAnonForId != null && channelAnonForId === eligibility.character.id);

	// Validate replyToMessageId belongs to same channel
	if (replyToMessageId != null) {
		const replied = (await payload
			.findByID({ collection: 'comms-messages', id: replyToMessageId })
			.catch(() => null)) as any;
		if (!replied || Number(replied.channelId) !== channelId) {
			return NextResponse.json(
				{ error: 'Réponse invalide' },
				{ status: 400 },
			);
		}
	}

	// Parse @mentions: format @[Name](id)
	const mentionIds: number[] = [];
	const mentionRegex = /@\[[^\]]+\]\((\d+)\)/g;
	const matches = text.matchAll(mentionRegex);
	for (const match of matches) {
		const n = Number(match[1]);
		if (!isNaN(n) && members.map(Number).includes(n)) {
			mentionIds.push(n);
		}
	}

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
			replyToMessageId: replyToMessageId ?? undefined,
			mentions: mentionIds.length ? mentionIds : undefined,
			senderIp: ip,
		} as any,
	});

	// Update channel last message timestamp
	await payload.update({
		collection: 'comms-channels',
		id: channelId,
		data: { lastMessageAt: new Date().toISOString() } as any,
	});

	// Fire-and-forget Discord DM notification for offline mentioned characters.
	// We only DM characters that are not currently active on /comms (per the
	// in-memory presence store) and that we have a discordId for.
	if (mentionIds.length > 0) {
		void (async () => {
			try {
				const offline = mentionIds.filter((id) => !isOnline(id));
				if (offline.length === 0) return;
				const result = await payload.find({
					collection: 'characters',
					where: { id: { in: offline } },
					limit: offline.length,
				});
				const senderName = isAnonymous
					? '[ANONYME]'
					: eligibility.character.fullName;
				const channelLabel = (channel as any).name || `#${channelId}`;
				const snippet = (text || '').slice(0, 200);
				for (const c of result.docs as any[]) {
					if (!c.discordId) continue;
					await sendDiscordDM(
						c.discordId,
						`📨 **Mention dans /comms** — ${senderName} vous a mentionné dans **${channelLabel}**\n\n> ${snippet}\n\nhttps://lif-arma.com/roleplay/comms`,
					).catch(() => {});
				}
			} catch (err) {
				console.error('Comms mention notify failed:', err);
			}
		})();
	}

	return NextResponse.json({ id: created.id });
}
