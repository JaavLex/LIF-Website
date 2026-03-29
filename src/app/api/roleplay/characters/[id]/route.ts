import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

export async function PATCH(
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

		// Check ownership
		const existing = await payload.findByID({
			collection: 'characters',
			id: characterId,
		});

		if (!existing) {
			return NextResponse.json(
				{ message: 'Personnage non trouvé' },
				{ status: 404 },
			);
		}

		// Check if user is admin (via DB role or Discord roles) or owner
		const { isAdmin } = await checkAdminPermissions(session);
		const isOwner = existing.discordId === session.discordId;

		if (!isAdmin && !isOwner) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		const body = await request.json();

		// Don't allow non-admins to change certain fields
		if (!isAdmin) {
			delete body.classification;
			delete body.militaryId;
			delete body.isArchived;
			delete body.status;
			delete body.rank;
			delete body.isTarget;
			delete body.targetFaction;
			delete body.etatMajorNotes;
		}

		const doc = await payload.update({
			collection: 'characters',
			id: characterId,
			data: body,
		});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Character update error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la mise à jour' },
			{ status: 400 },
		);
	}
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const characterId = parseInt(id, 10);
	if (isNaN(characterId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();
		const doc = await payload.findByID({
			collection: 'characters',
			id: characterId,
			depth: 2,
		});
		return NextResponse.json(doc);
	} catch {
		return NextResponse.json({ message: 'Non trouvé' }, { status: 404 });
	}
}
