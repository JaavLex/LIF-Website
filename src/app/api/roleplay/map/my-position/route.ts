import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';
import { getMapState } from '@/lib/map-state';

export const dynamic = 'force-dynamic';

/**
 * Resolves the currently logged-in user's in-game position by:
 *   session → character (via discordId) → biId → live map state player entry
 * Returns { deployed: false } if the user has no linked character or
 * the game server has no player entry matching their biId.
 */
export async function GET(request: NextRequest) {
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
		const character = charRes.docs[0] as { biId?: string | null } | undefined;
		if (!character?.biId) {
			return NextResponse.json({ deployed: false, reason: 'no-character' });
		}

		const state = getMapState();
		const entry = state.players.find(p => p.biId === character.biId);
		if (!entry) {
			return NextResponse.json({ deployed: false, reason: 'not-in-game' });
		}

		return NextResponse.json({
			deployed: true,
			x: Math.round(entry.x),
			z: Math.round(entry.z),
		});
	} catch (error: any) {
		console.error('my-position error:', error);
		return NextResponse.json(
			{ deployed: false, reason: 'error', error: error?.message || 'Erreur' },
			{ status: 500 },
		);
	}
}
