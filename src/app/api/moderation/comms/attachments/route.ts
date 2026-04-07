import { NextRequest, NextResponse } from 'next/server';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';

// URL extractor — captures http(s) URLs in message bodies for moderation review.
const URL_REGEX = /https?:\/\/[^\s<>"')]+/g;

interface AttachmentEntry {
	messageId: number;
	channelId: number;
	channelName?: string;
	createdAt: string;
	senderId?: number | null;
	senderName?: string;
	kind: string;
	meta: any;
}

interface LinkEntry {
	messageId: number;
	channelId: number;
	channelName?: string;
	createdAt: string;
	senderId?: number | null;
	senderName?: string;
	url: string;
}

export async function GET(request: NextRequest) {
	const auth = await requireFullAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const url = new URL(request.url);
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
	const kindFilter = url.searchParams.get('kind'); // media|character|intel|all
	const payload = await getPayloadClient();

	// Pull the most recent N messages globally; this is a moderation tool so we
	// scan a wider window than the normal feed.
	const messages = await payload.find({
		collection: 'comms-messages',
		where: { deletedAt: { exists: false } },
		sort: '-createdAt',
		limit,
	});

	// Resolve channel names
	const channelIds = Array.from(
		new Set((messages.docs as any[]).map((m) => Number(m.channelId))),
	);
	const channels = channelIds.length
		? await payload.find({
				collection: 'comms-channels',
				where: { id: { in: channelIds } },
				limit: channelIds.length,
			})
		: { docs: [] };
	const channelNameById = new Map<number, string>();
	for (const c of channels.docs as any[]) channelNameById.set(c.id, c.name);

	// Resolve sender names
	const senderIds = Array.from(
		new Set(
			(messages.docs as any[])
				.map((m) => Number(m.senderCharacterId))
				.filter((n) => !isNaN(n)),
		),
	);
	const senders = senderIds.length
		? await payload.find({
				collection: 'characters',
				where: { id: { in: senderIds } },
				limit: senderIds.length,
			})
		: { docs: [] };
	const senderNameById = new Map<number, string>();
	for (const s of senders.docs as any[]) senderNameById.set(s.id, s.fullName);

	const attachments: AttachmentEntry[] = [];
	const links: LinkEntry[] = [];

	for (const m of messages.docs as any[]) {
		const channelName = channelNameById.get(Number(m.channelId));
		const senderName = senderNameById.get(Number(m.senderCharacterId));

		if (Array.isArray(m.attachments)) {
			for (const a of m.attachments) {
				if (kindFilter && kindFilter !== 'all' && a.kind !== kindFilter) continue;
				attachments.push({
					messageId: m.id,
					channelId: Number(m.channelId),
					channelName,
					createdAt: m.createdAt,
					senderId: m.senderCharacterId ?? null,
					senderName,
					kind: a.kind,
					meta: a.meta || {},
				});
			}
		}

		if (typeof m.body === 'string') {
			const matches = m.body.match(URL_REGEX);
			if (matches) {
				for (const u of matches) {
					links.push({
						messageId: m.id,
						channelId: Number(m.channelId),
						channelName,
						createdAt: m.createdAt,
						senderId: m.senderCharacterId ?? null,
						senderName,
						url: u,
					});
				}
			}
		}
	}

	return NextResponse.json({ attachments, links });
}
