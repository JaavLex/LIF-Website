import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';
import { getMapState, addSOSAlert } from '@/lib/map-state';

export const dynamic = 'force-dynamic';

/**
 * SOS distress signal.
 *
 * Resolves the authenticated user's character + in-game position, drops a
 * pulsing red alert on the tactical map for everyone to see (5-minute TTL),
 * and fires an @everyone message in their faction channel.
 *
 * Returns 409 if the user isn't deployed (no character, no biId, or no
 * live position from the game server).
 */
export async function POST(request: NextRequest) {
	const guard = await requireSession(request);
	if (guard instanceof NextResponse) return guard;
	const session = guard;

	try {
		const payload = await getPayloadClient();
		const charRes = await payload.find({
			collection: 'characters',
			where: { discordId: { equals: session.discordId } },
			limit: 1,
			depth: 0,
		});
		const character = charRes.docs[0] as
			| { id: number; biId?: string | null; fullName?: string; faction?: string | null }
			| undefined;
		if (!character) {
			return NextResponse.json(
				{ error: 'no-character', message: 'Aucun personnage lié' },
				{ status: 409 },
			);
		}
		if (!character.biId) {
			return NextResponse.json(
				{ error: 'not-linked', message: 'Personnage non lié au jeu' },
				{ status: 409 },
			);
		}

		const state = getMapState();
		const entry = state.players.find(p => p.biId === character.biId);
		if (!entry) {
			return NextResponse.json(
				{ error: 'not-deployed', message: 'Non déployé sur le terrain' },
				{ status: 409 },
			);
		}

		const alert = addSOSAlert({
			biId: character.biId,
			name: character.fullName || 'Opérateur inconnu',
			faction: character.faction || null,
			x: Math.round(entry.x),
			z: Math.round(entry.z),
		});

		// Post an @everyone message into the faction channel (if one exists).
		let channelId: number | null = null;
		if (character.faction) {
			try {
				const channelRes = await payload.find({
					collection: 'comms-channels',
					where: {
						and: [
							{ type: { equals: 'faction' } },
							{ factionRef: { equals: character.faction } },
						],
					},
					limit: 1,
					depth: 0,
				});
				const channel = channelRes.docs[0] as
					| { id: number; members?: unknown }
					| undefined;
				if (channel) {
					channelId = channel.id;
					const members = Array.isArray(channel.members)
						? (channel.members as unknown[])
								.map(m => Number(m))
								.filter(n => Number.isFinite(n) && n !== character.id)
						: [];
					await payload.create({
						collection: 'comms-messages',
						data: {
							channelId: channel.id,
							senderCharacterId: character.id,
							senderDiscordId: session.discordId,
							postedAsGm: false,
							isAnonymous: false,
							body: `@everyone 🆘 **SOS** — ${character.fullName || 'Opérateur'} demande une évacuation immédiate à ${Math.round(
								entry.x,
							)}, ${Math.round(entry.z)}`,
							attachments: [
								{
									kind: 'position',
									meta: {
										x: Math.round(entry.x),
										z: Math.round(entry.z),
										source: 'sos',
										label: 'Signal SOS',
									},
								},
							],
							mentions: members,
						} as any,
					});
					await payload.update({
						collection: 'comms-channels',
						id: channel.id,
						data: { lastMessageAt: new Date().toISOString() } as any,
					});
				}
			} catch (err) {
				console.error('SOS comms post failed:', err);
			}
		}

		return NextResponse.json({
			success: true,
			alert,
			channelId,
		});
	} catch (error: any) {
		console.error('SOS error:', error);
		return NextResponse.json(
			{ error: 'server', message: error?.message || 'Erreur' },
			{ status: 500 },
		);
	}
}
