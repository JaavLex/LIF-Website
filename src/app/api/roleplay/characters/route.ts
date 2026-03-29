import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

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

		// Ensure discordId matches session
		body.discordId = session.discordId;
		body.discordUsername = session.discordUsername;

		// Check if user is admin (via DB role or Discord roles)
		const { isAdmin } = await checkAdminPermissions(session);

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

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Character creation error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la création' },
			{ status: 400 },
		);
	}
}
