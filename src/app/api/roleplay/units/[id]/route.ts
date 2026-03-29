import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

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
		const { isAdmin } = await checkAdminPermissions(session);

		if (!isAdmin) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		await payload.delete({
			collection: 'units',
			id: docId,
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('Unit deletion error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la suppression' },
			{ status: 400 },
		);
	}
}
