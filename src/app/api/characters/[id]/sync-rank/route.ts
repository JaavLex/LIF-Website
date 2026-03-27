import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';
import { getGuildMember } from '@/lib/discord';

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const token = request.cookies.get('roleplay-session')?.value;
	if (!token) {
		return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
	}

	const session = verifySession(token);
	if (!session) {
		return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
	}

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
			return NextResponse.json({ message: 'Personnage non trouvé' }, { status: 404 });
		}

		// Only owner can sync their own rank
		if (character.discordId !== session.discordId) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		// Fetch current Discord roles via bot API
		const member = await getGuildMember(session.discordId);
		if (!member) {
			return NextResponse.json(
				{ message: 'Impossible de récupérer vos rôles Discord. Vérifiez que vous êtes sur le serveur.' },
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
				return NextResponse.json({ message: 'Aucun grade configuré' }, { status: 500 });
			}
			rankId = defaultRank.docs[0].id;
		}

		const doc = await payload.update({
			collection: 'characters',
			id: characterId,
			data: { rank: rankId },
		});

		return NextResponse.json({ id: doc.id, rank: rankId, doc });
	} catch (error: any) {
		console.error('Rank sync error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la synchronisation' },
			{ status: 500 },
		);
	}
}
