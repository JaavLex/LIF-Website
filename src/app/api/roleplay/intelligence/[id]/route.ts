import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const docId = parseInt(id, 10);
	if (isNaN(docId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();
		const doc = await payload.findByID({
			collection: 'intelligence',
			id: docId,
			depth: 2,
		});
		return NextResponse.json(doc);
	} catch {
		return NextResponse.json({ message: 'Non trouvé' }, { status: 404 });
	}
}

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

	const docId = parseInt(id, 10);
	if (isNaN(docId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();

		// Check admin status (DB role + Discord roles)
		const { isAdmin } = await checkAdminPermissions(session);

		// Get existing report to check ownership
		const existing = await payload.findByID({ collection: 'intelligence', id: docId, depth: 0 });

		// Check if user owns this report (postedByDiscordId matches session)
		const isOwner = (existing as any).postedByDiscordId === session.discordId;

		if (!isAdmin && !isOwner) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		const body = await request.json();

		// Non-admins cannot update status
		if (!isAdmin) {
			delete body.status;
			delete body.postedByDiscordId;
			delete body.postedByDiscordUsername;
		}

		const doc = await payload.update({
			collection: 'intelligence',
			id: docId,
			data: body,
		});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Intelligence update error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la mise à jour' },
			{ status: 400 },
		);
	}
}

export async function DELETE(
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

	const docId = parseInt(id, 10);
	if (isNaN(docId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();

		const { isAdmin: isDeleteAdmin } = await checkAdminPermissions(session);

		if (!isDeleteAdmin) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		await payload.delete({
			collection: 'intelligence',
			id: docId,
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la suppression' },
			{ status: 400 },
		);
	}
}
