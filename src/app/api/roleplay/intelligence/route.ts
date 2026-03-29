import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';
import { notifyNewIntelligence } from '@/lib/discord-notify';

export async function GET() {
	try {
		const payload = await getPayloadClient();
		const docs = await payload.find({
			collection: 'intelligence',
			sort: '-date',
			limit: 100,
			depth: 2,
		});
		return NextResponse.json(docs);
	} catch (error: any) {
		return NextResponse.json(
			{ message: error.message || 'Erreur' },
			{ status: 500 },
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

		// Check if user has the intelligence role
		const roleplayConfig = await payload.findGlobal({ slug: 'roleplay' }).catch(() => null);
		const intelligenceRoleId = (roleplayConfig as any)?.intelligenceRoleId || '1424804277813248091';

		const hasIntelRole = session.roles?.includes(intelligenceRoleId);
		const user = await payload.find({
			collection: 'users',
			where: { discordId: { equals: session.discordId } },
			limit: 1,
		});
		const isAdmin = user.docs[0]?.role === 'admin';

		if (!hasIntelRole && !isAdmin) {
			return NextResponse.json(
				{ message: 'Vous n\'avez pas le rôle requis pour publier des renseignements' },
				{ status: 403 },
			);
		}

		const body = await request.json();

		// Set poster info
		body.postedByDiscordId = session.discordId;
		body.postedByDiscordUsername = session.discordUsername;

		// Non-admins cannot set admin-only fields
		if (!isAdmin) {
			delete body.status;
		}

		const doc = await payload.create({
			collection: 'intelligence',
			data: body,
		});

		// Send Discord notification (non-blocking)
		const fullDoc = await payload.findByID({ collection: 'intelligence', id: doc.id, depth: 2 });
		notifyNewIntelligence({
			id: doc.id as number,
			title: (fullDoc as any).title,
			type: (fullDoc as any).type,
			classification: (fullDoc as any).classification,
			postedBy: typeof (fullDoc as any).postedBy === 'object' ? (fullDoc as any).postedBy : null,
		}).catch(() => {});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Intelligence creation error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la création' },
			{ status: 400 },
		);
	}
}
