import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireSession, isErrorResponse } from '@/lib/api-auth';
import { getGuildMember } from '@/lib/discord';

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const sessionResult = await requireSession(request);
	if (isErrorResponse(sessionResult)) return sessionResult;
	const session = sessionResult;

	const characterId = parseInt(id, 10);
	if (isNaN(characterId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();

		const character = await payload.findByID({
			collection: 'characters',
			id: characterId,
		});

		if (!character) {
			return NextResponse.json(
				{ message: 'Personnage non trouvé' },
				{ status: 404 },
			);
		}

		// Only owner can sync their own rank
		if (character.discordId !== session.discordId) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		// Fetch current Discord roles via bot API
		const member = await getGuildMember(session.discordId);
		if (!member) {
			return NextResponse.json(
				{
					message:
						'Impossible de récupérer vos rôles Discord. Vérifiez que vous êtes sur le serveur.',
				},
				{ status: 400 },
			);
		}

		// Find highest matching rank
		const ranks = await payload.find({
			collection: 'ranks',
			where: { discordRoleId: { in: member.roles } },
			sort: '-order',
			limit: 1,
		});

		let rankId: number;
		if (ranks.docs.length > 0) {
			rankId = ranks.docs[0].id;
		} else {
			// Default to lowest rank
			const defaultRank = await payload.find({
				collection: 'ranks',
				sort: 'order',
				limit: 1,
			});
			if (defaultRank.docs.length === 0) {
				return NextResponse.json(
					{ message: 'Aucun grade configuré' },
					{ status: 500 },
				);
			}
			rankId = defaultRank.docs[0].id;
		}

		const doc = await payload.update({
			collection: 'characters',
			id: characterId,
			data: { rank: rankId },
		});

		return NextResponse.json({ id: doc.id, rank: rankId, doc });
	} catch (error: unknown) {
		console.error('Rank sync error:', error);
		const message = error instanceof Error ? error.message : 'Erreur lors de la synchronisation';
		return NextResponse.json({ message }, { status: 500 });
	}
}
