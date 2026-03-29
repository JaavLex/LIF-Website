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
		const payload = await getPayloadClient();
		const { isAdmin } = await checkAdminPermissions(session);

		if (!isAdmin) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		const body = await request.json();

		if (!body.name || !body.slug) {
			return NextResponse.json({ message: 'Nom et slug requis' }, { status: 400 });
		}

		const doc = await payload.create({
			collection: 'units',
			data: {
				name: body.name,
				slug: body.slug,
				color: body.color || '#4a7c23',
			},
		});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Unit creation error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la création' },
			{ status: 400 },
		);
	}
}
