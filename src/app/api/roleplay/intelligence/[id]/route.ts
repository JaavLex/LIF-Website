import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireSession, requireAdmin, isErrorResponse } from '@/lib/api-auth';
import { checkAdminPermissions } from '@/lib/admin';
import { logAdminAction } from '@/lib/admin-log';

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
	const sessionResult = await requireSession(request);
	if (isErrorResponse(sessionResult)) return sessionResult;
	const session = sessionResult;

	const docId = parseInt(id, 10);
	if (isNaN(docId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();
		const { isAdmin } = await checkAdminPermissions(session);

		const existing = await payload.findByID({
			collection: 'intelligence',
			id: docId,
			depth: 0,
		});

		const isOwner = (existing as Record<string, any>).postedByDiscordId === session.discordId;

		if (!isAdmin && !isOwner) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		const body = await request.json();

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

		if (isAdmin) {
			void logAdminAction({
				session,
				action: 'intelligence.update',
				summary: `A modifié le rapport de renseignement "${(existing as Record<string, any>).title}"`,
				entityType: 'intelligence',
				entityId: docId,
				entityLabel: (existing as Record<string, any>).title,
				before: existing as unknown as Record<string, unknown>,
				after: doc as unknown as Record<string, unknown>,
				request,
			});
		}

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: unknown) {
		console.error('Intelligence update error:', error);
		const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
		return NextResponse.json({ message }, { status: 400 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const auth = await requireAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const docId = parseInt(id, 10);
	if (isNaN(docId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();

		const existing = await payload.findByID({
			collection: 'intelligence',
			id: docId,
			depth: 0,
		});

		await payload.delete({ collection: 'intelligence', id: docId });

		void logAdminAction({
			session: auth.session,
			permissions: auth.permissions,
			action: 'intelligence.delete',
			summary: `A supprimé le rapport de renseignement "${(existing as Record<string, any>).title}"`,
			entityType: 'intelligence',
			entityId: docId,
			entityLabel: (existing as Record<string, any>).title,
			before: existing as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
		return NextResponse.json({ message }, { status: 400 });
	}
}
