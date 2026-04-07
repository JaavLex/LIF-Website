import { NextRequest, NextResponse } from 'next/server';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = await requireFullAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const { id } = await params;
	const channelId = parseInt(id, 10);
	if (isNaN(channelId)) {
		return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
	}

	const url = new URL(request.url);
	const search = url.searchParams.get('search');
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 1000);

	const payload = await getPayloadClient();
	const where: any = { and: [{ channelId: { equals: channelId } }] };
	if (search) where.and.push({ body: { like: search } });
	if (dateFrom) where.and.push({ createdAt: { greater_than_equal: dateFrom } });
	if (dateTo) where.and.push({ createdAt: { less_than_equal: dateTo } });

	const messages = await payload.find({
		collection: 'comms-messages',
		where,
		sort: 'createdAt',
		limit,
	});

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
				discordUsername: c.discordUsername,
				rankName: typeof c.rank === 'object' ? c.rank?.name : null,
			},
		]),
	);

	return NextResponse.json({
		messages: messages.docs.map((m: any) => ({
			id: m.id,
			body: m.body,
			attachments: m.attachments,
			isAnonymous: !!m.isAnonymous,
			realSender: senderMap.get(m.senderCharacterId) || {
				id: m.senderCharacterId,
				fullName: '[introuvable]',
			},
			senderDiscordId: m.senderDiscordId,
			senderIp: m.senderIp,
			editedAt: m.editedAt,
			deletedAt: m.deletedAt,
			deletedBy: m.deletedBy,
			createdAt: m.createdAt,
		})),
	});
}
