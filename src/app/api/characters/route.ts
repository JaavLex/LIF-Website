import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';

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
