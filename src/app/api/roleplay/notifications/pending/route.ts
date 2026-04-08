import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';

const MOD_API_KEY = process.env.GAME_MOD_API_KEY || 'CHANGE_ME_TO_A_SECURE_KEY';

/**
 * POST /api/roleplay/notifications/pending
 *
 * Called by the AR-DiscordLink mod to fetch pending comms notifications
 * for a linked player since a given timestamp. The mod tracks the "since"
 * watermark per player and passes it back on each poll.
 *
 * Body:  { biId: string, apiKey: string, sinceMs?: number }
 * Response:
 *   {
 *     linked: boolean,
 *     characterId?: number,
 *     serverTimeMs: number,
 *     notifications: Array<{
 *       channel: string,
 *       sender: string,
 *       body: string,
 *       isMention: boolean,
 *       createdAtMs: number
 *     }>
 *   }
 *
 * Only messages where the character is a member of the channel AND is not
 * the sender are returned. Bodies are truncated to keep payloads small.
 */
const MAX_NOTIFICATIONS = 20;
const MAX_BODY_LEN = 180;
const MAX_LOOKBACK_MS = 5 * 60 * 1000; // never look back further than 5 minutes

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { biId, apiKey, sinceMs } = body ?? {};

		if (!biId || typeof biId !== 'string') {
			return NextResponse.json({ error: 'biId requis' }, { status: 400 });
		}
		if (apiKey !== MOD_API_KEY) {
			return NextResponse.json({ error: 'Clé API invalide' }, { status: 403 });
		}

		const payload = await getPayloadClient();

		// Find character by BI ID
		const charResult = await payload.find({
			collection: 'characters',
			where: { biId: { equals: biId } },
			limit: 1,
		});

		const now = Date.now();

		if (charResult.docs.length === 0) {
			return NextResponse.json({
				linked: false,
				serverTimeMs: now,
				notifications: [],
			});
		}

		const character = charResult.docs[0] as any;
		const characterId = Number(character.id);

		// Clamp sinceMs: default to "now" on first poll, never older than 5min
		const requestedSince = Number(sinceMs);
		const effectiveSince =
			Number.isFinite(requestedSince) && requestedSince > 0
				? Math.max(requestedSince, now - MAX_LOOKBACK_MS)
				: now - 30_000; // first poll: just the last 30s

		// Fetch all channels (small-ish set) and filter to ones this character belongs to.
		// Matches listChannelsForCharacter pattern in src/lib/comms.ts.
		const allChannels = await payload.find({
			collection: 'comms-channels',
			limit: 500,
		});
		const memberChannels = (allChannels.docs as any[]).filter((ch) => {
			const members: number[] = Array.isArray(ch.members) ? ch.members : [];
			return members.map(Number).includes(characterId);
		});

		if (memberChannels.length === 0) {
			return NextResponse.json({
				linked: true,
				characterId,
				serverTimeMs: now,
				notifications: [],
			});
		}

		const channelIdToName = new Map<number, string>();
		for (const ch of memberChannels) {
			channelIdToName.set(Number(ch.id), String(ch.name ?? 'Canal'));
		}

		// Fetch recent messages in those channels, newer than effectiveSince,
		// not sent by this character, not deleted.
		const msgs = await payload.find({
			collection: 'comms-messages',
			where: {
				and: [
					{ channelId: { in: Array.from(channelIdToName.keys()) } },
					{ createdAt: { greater_than: new Date(effectiveSince).toISOString() } },
					{ senderCharacterId: { not_equals: characterId } },
					{ deletedAt: { exists: false } },
				],
			},
			sort: 'createdAt',
			limit: MAX_NOTIFICATIONS,
		});

		// Resolve sender names in a single query
		const senderIds = Array.from(
			new Set(
				(msgs.docs as any[])
					.map((m) => Number(m.senderCharacterId))
					.filter((n) => Number.isFinite(n)),
			),
		);
		const senderNameMap = new Map<number, string>();
		if (senderIds.length > 0) {
			const senders = await payload.find({
				collection: 'characters',
				where: { id: { in: senderIds } },
				limit: senderIds.length,
			});
			for (const s of senders.docs as any[]) {
				const first = String(s.firstName ?? '').trim();
				const last = String(s.lastName ?? '').trim();
				const name = [first, last].filter(Boolean).join(' ') || 'Inconnu';
				senderNameMap.set(Number(s.id), name);
			}
		}

		const notifications = (msgs.docs as any[]).map((m) => {
			const channelName = channelIdToName.get(Number(m.channelId)) ?? 'Canal';
			const senderId = Number(m.senderCharacterId);
			let senderName = senderNameMap.get(senderId) ?? 'Inconnu';
			if (m.isAnonymous) senderName = 'Anonyme';

			const mentions: number[] = Array.isArray(m.mentions) ? m.mentions : [];
			const isMention = mentions.map(Number).includes(characterId);

			let text = String(m.body ?? '');
			if (!text && Array.isArray(m.attachments) && m.attachments.length > 0) {
				text = '[pièce jointe]';
			}
			if (text.length > MAX_BODY_LEN) {
				text = text.slice(0, MAX_BODY_LEN - 1) + '…';
			}

			const createdAtMs =
				m.createdAt instanceof Date
					? m.createdAt.getTime()
					: new Date(m.createdAt).getTime();

			return {
				channel: channelName,
				sender: senderName,
				body: text,
				isMention,
				createdAtMs,
			};
		});

		return NextResponse.json({
			linked: true,
			characterId,
			serverTimeMs: now,
			notifications,
		});
	} catch (err) {
		console.error('[notifications/pending] error', err);
		return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
	}
}
