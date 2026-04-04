import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';

const MOD_API_KEY = process.env.GAME_MOD_API_KEY || 'CHANGE_ME_TO_A_SECURE_KEY';

/**
 * POST /api/roleplay/link/check
 * Called by the Arma Reforger mod to check if a BI ID is already linked to a character.
 * Body: { biId: string, apiKey: string }
 * Response: { linked: boolean }
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { biId, apiKey } = body;

		if (!biId || typeof biId !== 'string') {
			return NextResponse.json({ error: 'biId requis' }, { status: 400 });
		}

		if (apiKey !== MOD_API_KEY) {
			return NextResponse.json({ error: 'Clé API invalide' }, { status: 403 });
		}

		const payload = await getPayloadClient();

		const result = await payload.find({
			collection: 'characters',
			where: {
				biId: { equals: biId },
			},
			limit: 1,
		});

		return NextResponse.json({ linked: result.docs.length > 0 });
	} catch {
		return NextResponse.json(
			{ error: 'Erreur interne' },
			{ status: 500 },
		);
	}
}
