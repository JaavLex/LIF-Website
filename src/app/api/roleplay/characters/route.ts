import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { notifyNewCharacter } from '@/lib/discord-notify';

export async function POST(request: NextRequest) {
	const token = request.cookies.get('roleplay-session')?.value;
	if (!token) {
		return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
	}

	const session = verifySession(token);
	if (!session) {
		return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const payload = await getPayloadClient();

		// Check if user is admin (via DB role or Discord roles)
		const { isAdmin } = await checkAdminPermissions(session);

		// NPC creation: admin can create without discord link
		const isNpcCreation = isAdmin && body.isNpc;
		delete body.isNpc;

		if (!isNpcCreation) {
			// Ensure discordId matches session for non-NPC
			body.discordId = session.discordId;
			body.discordUsername = session.discordUsername;
		}

		// Non-admins: strip admin-only fields, auto-assign rank from Discord roles
		if (!isAdmin) {
			delete body.status;
			delete body.rank;
			delete body.classification;
			delete body.militaryId;
			delete body.isArchived;
			delete body.isTarget;
			delete body.targetFaction;
			delete body.etatMajorNotes;

			// Auto-assign rank from Discord roles
			if (session.roles?.length) {
				const ranks = await payload.find({
					collection: 'ranks',
					where: { discordRoleId: { in: session.roles } },
					sort: '-order',
					limit: 1,
				});
				if (ranks.docs.length > 0) {
					body.rank = ranks.docs[0].id;
				} else {
					// Default to lowest rank (Recrue)
					const defaultRank = await payload.find({
						collection: 'ranks',
						sort: 'order',
						limit: 1,
					});
					if (defaultRank.docs.length > 0) body.rank = defaultRank.docs[0].id;
				}
			}

			// Default status for new characters
			body.status = 'in-service';
		}

		const doc = await payload.create({
			collection: 'characters',
			data: body,
		});

		// Send Discord notification (non-blocking)
		const fullDoc = await payload.findByID({
			collection: 'characters',
			id: doc.id,
			depth: 2,
		});
		notifyNewCharacter({
			id: doc.id as number,
			fullName: (fullDoc as any).fullName,
			discordUsername: (fullDoc as any).discordUsername,
			rank: typeof (fullDoc as any).rank === 'object' ? (fullDoc as any).rank : null,
			unit: typeof (fullDoc as any).unit === 'object' ? (fullDoc as any).unit : null,
		}).catch(() => {});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Character creation error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la création' },
			{ status: 400 },
		);
	}
}
