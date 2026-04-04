import { NextRequest, NextResponse } from 'next/server';
import { requireSession, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';
import { peekPendingLink, consumePendingLink } from '@/lib/pending-links';

/**
 * POST /api/roleplay/link/confirm
 * Called from the website /lier page by an authenticated user to confirm a linking code.
 * Body: { code: string, characterId?: number }
 * Response: { success: true, biId: string, characterName: string }
 */
export async function POST(request: NextRequest) {
	const sessionResult = await requireSession(request);
	if (isErrorResponse(sessionResult)) return sessionResult;
	const session = sessionResult;

	try {
		const body = await request.json();
		const { code, characterId } = body;

		if (!code || typeof code !== 'string') {
			return NextResponse.json({ error: 'Code requis' }, { status: 400 });
		}

		// Peek at the code first (don't consume yet)
		const biId = peekPendingLink(code);
		if (!biId) {
			return NextResponse.json(
				{ error: 'Code invalide ou expiré. Veuillez en générer un nouveau en jeu.' },
				{ status: 400 },
			);
		}

		const payload = await getPayloadClient();

		// Check if this biId is already linked to another character
		const existingLink = await payload.find({
			collection: 'characters',
			where: {
				biId: { equals: biId },
			},
			limit: 1,
		});

		if (existingLink.docs.length > 0) {
			// Consume the code so it can't be retried
			consumePendingLink(code);
			return NextResponse.json(
				{ error: 'Cet identifiant Bohemia est déjà lié à un autre personnage.' },
				{ status: 409 },
			);
		}

		// Find the user's characters
		const userCharacters = await payload.find({
			collection: 'characters',
			where: {
				discordId: { equals: session.discordId },
				...(characterId ? { id: { equals: characterId } } : {}),
			},
			limit: 10,
		});

		if (userCharacters.docs.length === 0) {
			return NextResponse.json(
				{ error: 'Aucun personnage trouvé. Créez d\'abord une fiche de personnage.' },
				{ status: 404 },
			);
		}

		// If user has multiple unlinked characters and didn't specify which one, return the list
		const unlinkedCharacters = userCharacters.docs.filter((c) => !c.biId);
		if (!characterId && unlinkedCharacters.length > 1) {
			// Don't consume the code - let them re-submit with a characterId
			return NextResponse.json({
				needsSelection: true,
				characters: unlinkedCharacters.map((c) => ({
					id: c.id,
					fullName: c.fullName,
				})),
			});
		}

		// Pick the target character
		const targetCharacter = characterId
			? userCharacters.docs.find((c) => c.id === characterId)
			: unlinkedCharacters[0] || userCharacters.docs[0];

		if (!targetCharacter) {
			return NextResponse.json(
				{ error: 'Personnage non trouvé.' },
				{ status: 404 },
			);
		}

		// Now consume the code (one-time use) and link
		consumePendingLink(code);

		await payload.update({
			collection: 'characters',
			id: targetCharacter.id,
			data: {
				biId,
			},
		});

		return NextResponse.json({
			success: true,
			biId,
			characterName: targetCharacter.fullName,
		});
	} catch {
		return NextResponse.json(
			{ error: 'Erreur interne' },
			{ status: 500 },
		);
	}
}
