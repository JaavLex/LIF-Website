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
		if (body.color) updateData.color = body.color;
		if (body.insignia !== undefined) updateData.insignia = body.insignia || null;
		if (body.parentFaction !== undefined)
			updateData.parentFaction = body.parentFaction || null;
		if (body.description !== undefined) updateData.description = body.description;

		const existing = await payload.findByID({ collection: 'units', id: docId });

		const doc = await payload.update({
			collection: 'units',
			id: docId,
			data: updateData,
		});

		void logAdminAction({
			session: auth.session,
			action: 'unit.update',
			summary: `A modifié l'unité "${doc.name}"`,
			entityType: 'unit',
			entityId: doc.id,
			entityLabel: doc.name,
			before: existing as unknown as Record<string, unknown>,
			after: doc as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: unknown) {
		console.error('Unit update error:', error);
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
		const deletedSnapshot = await payload.findByID({ collection: 'units', id: docId });
		await payload.delete({ collection: 'units', id: docId });

		void logAdminAction({
			session: auth.session,
			action: 'unit.delete',
			summary: `A supprimé l'unité "${deletedSnapshot.name}"`,
			entityType: 'unit',
			entityId: docId,
			entityLabel: deletedSnapshot.name,
			before: deletedSnapshot as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		console.error('Unit deletion error:', error);
		const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
		return NextResponse.json({ message }, { status: 400 });
	}
}
