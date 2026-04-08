import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';

const MOD_API_KEY = process.env.GAME_MOD_API_KEY || 'CHANGE_ME_TO_A_SECURE_KEY';
const PUBLIC_BASE_URL =
	process.env.NEXT_PUBLIC_BASE_URL ||
	process.env.NEXT_PUBLIC_SITE_URL ||
	process.env.SITE_URL ||
	'';

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
 *       channel: string,       // For DMs: the sender's callsign (or full name);
 *                              // for group/unit/faction: the channel name
 *       sender: string,        // Sender display name
 *       callSign: string,      // Sender's roleplay callsign (empty for anonymous);
 *                              // mod uses this as the DM title, falls back to `channel` if empty
 *       body: string,
 *       isMention: boolean,
 *       avatarUrl: string,     // Absolute URL to sender's avatar (empty if none)
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

function toAbsoluteUrl(url: string | null | undefined): string {
	if (!url) return '';
	if (/^https?:\/\//i.test(url)) return url;
	if (!PUBLIC_BASE_URL) return url;
	return PUBLIC_BASE_URL.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url);
}

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

		// Keep the full channel doc per id so we can discriminate by type later.
		const channelMap = new Map<number, any>();
		for (const ch of memberChannels) {
			channelMap.set(Number(ch.id), ch);
		}

		const msgs = await payload.find({
			collection: 'comms-messages',
			where: {
				and: [
					{ channelId: { in: Array.from(channelMap.keys()) } },
					{ createdAt: { greater_than: new Date(effectiveSince).toISOString() } },
					{ senderCharacterId: { not_equals: characterId } },
					{ deletedAt: { exists: false } },
				],
			},
			sort: 'createdAt',
			limit: MAX_NOTIFICATIONS,
		});

		// Resolve sender info (name + callsign + avatar url) with depth so the
		// upload relation is populated.
		const senderIds = Array.from(
			new Set(
				(msgs.docs as any[])
					.map((m) => Number(m.senderCharacterId))
					.filter((n) => Number.isFinite(n)),
			),
		);
		interface SenderInfo {
			fullName: string;
			callsign: string;
			avatarUrl: string;
		}
		const senderInfoMap = new Map<number, SenderInfo>();
		if (senderIds.length > 0) {
			const senders = await payload.find({
				collection: 'characters',
				where: { id: { in: senderIds } },
				limit: senderIds.length,
				depth: 1,
			});
			for (const s of senders.docs as any[]) {
				const first = String(s.firstName ?? '').trim();
				const last = String(s.lastName ?? '').trim();
				const fullName = [first, last].filter(Boolean).join(' ') || 'Inconnu';
				const callsign = String(s.callsign ?? '').trim();
				const avatarRaw =
					typeof s.avatar === 'object' && s.avatar ? s.avatar.url || '' : '';
				senderInfoMap.set(Number(s.id), {
					fullName,
					callsign,
					avatarUrl: toAbsoluteUrl(avatarRaw),
				});
			}
		}

		const notifications = (msgs.docs as any[]).map((m) => {
			const channel = channelMap.get(Number(m.channelId));
			const channelType = String(channel?.type ?? 'group');
			const senderId = Number(m.senderCharacterId);
			const info: SenderInfo = senderInfoMap.get(senderId) ?? {
				fullName: 'Inconnu',
				callsign: '',
				avatarUrl: '',
			};

			const mentions: number[] = Array.isArray(m.mentions) ? m.mentions : [];
			const isMention = mentions.map(Number).includes(characterId);

			// DMs: display the other party's callsign (or full name fallback).
			// Other channel types: display the channel name.
			let displayChannel: string;
			if (channelType === 'dm') {
				if (m.isAnonymous) displayChannel = 'Anonyme';
				else displayChannel = info.callsign || info.fullName;
			} else {
				displayChannel = String(channel?.name ?? 'Canal');
			}

			let senderName = info.fullName;
			if (m.isAnonymous) senderName = 'Anonyme';

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

			// Hide avatar for anonymous messages so the sender isn't leaked.
			const avatarUrl = m.isAnonymous ? '' : info.avatarUrl;
			// Callsign of the sender. Empty for anonymous messages so we don't
			// leak identity. The mod uses this to title DM notifications with
			// the roleplay callsign; if empty, it falls back to the chat name.
			const callSign = m.isAnonymous ? '' : info.callsign;

			return {
				channel: displayChannel,
				sender: senderName,
				callSign,
				body: text,
				isMention,
				avatarUrl,
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
