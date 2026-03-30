import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

export async function DELETE(request: NextRequest) {
	const token = request.cookies.get('roleplay-session')?.value;
	if (!token) {
		return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
	}

	const session = verifySession(token);
	if (!session) {
		return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
	}

	try {
		const payload = await getPayloadClient();
		const { isAdmin } = await checkAdminPermissions(session);

		if (!isAdmin) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) {
			return NextResponse.json({ message: 'ID manquant' }, { status: 400 });
		}

		await payload.delete({
			collection: 'character-timeline',
			id: parseInt(id, 10),
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('Timeline deletion error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la suppression' },
			{ status: 400 },
		);
	}
}

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
		const payload = await getPayloadClient();
		const { isAdmin } = await checkAdminPermissions(session);

		if (!isAdmin) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		const body = await request.json();

		if (!body.character || !body.type || !body.title || !body.date) {
			return NextResponse.json(
				{ message: 'Champs requis manquants' },
				{ status: 400 },
			);
		}

		const doc = await payload.create({
			collection: 'character-timeline',
			data: body,
		});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Timeline creation error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la création' },
			{ status: 400 },
		);
	}
}
