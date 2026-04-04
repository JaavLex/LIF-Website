import { NextRequest, NextResponse } from 'next/server';
import { createPendingLink } from '@/lib/pending-links';

const MOD_API_KEY = process.env.GAME_MOD_API_KEY || 'CHANGE_ME_TO_A_SECURE_KEY';

/**
 * POST /api/roleplay/link/generate
 * Called by the Arma Reforger mod to generate a 6-character linking code.
 * Body: { biId: string, apiKey: string }
 * Response: { code: string }
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

		// Validate biId looks like a UUID
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(biId)) {
			return NextResponse.json(
				{ error: 'Format biId invalide (UUID attendu)' },
				{ status: 400 },
			);
		}

		const code = createPendingLink(biId);

		return NextResponse.json({ code });
	} catch {
		return NextResponse.json(
			{ error: 'Erreur interne' },
			{ status: 500 },
		);
	}
}
