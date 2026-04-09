import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireSession, isErrorResponse } from '@/lib/api-auth';
import { notifyNewIntelligence } from '@/lib/discord-notify';
import { logAdminAction } from '@/lib/admin-log';
import type { Intelligence, Roleplay } from '@/payload-types';

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
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Erreur';
		return NextResponse.json({ message }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	const sessionResult = await requireSession(request);
	if (isErrorResponse(sessionResult)) return sessionResult;
	const session = sessionResult;

	try {
		const payload = await getPayloadClient();

		// Check if user has the intelligence role
		const roleplayConfig = await payload
			.findGlobal({ slug: 'roleplay' })
			.catch(() => null) as Roleplay | null;
		const intelligenceRoleId = roleplayConfig?.intelligenceRoleId;

		const hasIntelRole =
			intelligenceRoleId && session.roles?.includes(intelligenceRoleId);
		const user = await payload.find({
			collection: 'users',
			where: { discordId: { equals: session.discordId } },
			limit: 1,
		});
		const isAdmin = user.docs[0]?.role === 'admin';

		if (!hasIntelRole && !isAdmin) {
			return NextResponse.json(
				{
					message: "Vous n'avez pas le rôle requis pour publier des renseignements",
				},
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
		const fullDoc: Intelligence = await payload.findByID({
			collection: 'intelligence',
			id: doc.id,
			depth: 2,
		});
		notifyNewIntelligence({
			id: doc.id as number,
			title: fullDoc.title,
			type: fullDoc.type,
			classification: fullDoc.classification || 'public',
			postedBy:
				typeof fullDoc.postedBy === 'object'
					? fullDoc.postedBy
					: null,
		}).catch(() => {});

		// Only log when the creator is admin — intel-role-only users
		// publishing their own reports are not an "admin action".
		if (isAdmin) {
			void logAdminAction({
				session,
				action: 'intelligence.create',
				summary: `A créé le rapport de renseignement "${fullDoc.title}"`,
				entityType: 'intelligence',
				entityId: doc.id as number,
				entityLabel: fullDoc.title,
				after: fullDoc as unknown as Record<string, unknown>,
				request,
			});
		}

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Intelligence creation error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la création' },
			{ status: 400 },
		);
	}
}
