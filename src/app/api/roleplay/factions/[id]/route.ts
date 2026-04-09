import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';
import { logAdminAction } from '@/lib/admin-log';

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const auth = await requireFullAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const docId = parseInt(id, 10);
	if (isNaN(docId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();
		const body = await request.json();
		const updateData: Record<string, any> = {};
		if (body.name) updateData.name = body.name;
		if (body.slug) updateData.slug = body.slug;
		if (body.type) updateData.type = body.type;
		if (body.color) updateData.color = body.color;
		if (body.logo !== undefined) updateData.logo = body.logo || null;
		if (body.description !== undefined) updateData.description = body.description;

		const existing = await payload.findByID({ collection: 'factions', id: docId });

		const doc = await payload.update({
			collection: 'factions',
			id: docId,
			data: updateData,
		});

		void logAdminAction({
			session: auth.session,
			action: 'faction.update',
			summary: `A modifié la faction "${doc.name}"`,
			entityType: 'faction',
			entityId: doc.id,
			entityLabel: doc.name,
			before: existing as unknown as Record<string, unknown>,
			after: doc as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: unknown) {
		console.error('Faction update error:', error);
		const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
		return NextResponse.json({ message }, { status: 400 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const auth = await requireFullAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const docId = parseInt(id, 10);
	if (isNaN(docId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();
		const deletedSnapshot = await payload.findByID({ collection: 'factions', id: docId });
		await payload.delete({ collection: 'factions', id: docId });

		void logAdminAction({
			session: auth.session,
			action: 'faction.delete',
			summary: `A supprimé la faction "${deletedSnapshot.name}"`,
			entityType: 'faction',
			entityId: docId,
			entityLabel: deletedSnapshot.name,
			before: deletedSnapshot as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		console.error('Faction deletion error:', error);
		const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
		return NextResponse.json({ message }, { status: 400 });
	}
}
