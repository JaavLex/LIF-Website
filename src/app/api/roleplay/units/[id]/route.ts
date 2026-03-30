import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

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
		const { isAdmin, level } = await checkAdminPermissions(session);

		if (!isAdmin || level !== 'full') {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		const body = await request.json();
		const updateData: Record<string, unknown> = {};
		if (body.name) updateData.name = body.name;
		if (body.slug) updateData.slug = body.slug;
		if (body.color) updateData.color = body.color;
		if (body.insignia !== undefined) updateData.insignia = body.insignia || null;
		if (body.parentFaction !== undefined) updateData.parentFaction = body.parentFaction || null;
		if (body.description !== undefined) updateData.description = body.description;

		const doc = await payload.update({
			collection: 'units',
			id: docId,
			data: updateData,
		});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Unit update error:', error);
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
		const { isAdmin, level } = await checkAdminPermissions(session);

		if (!isAdmin || level !== 'full') {
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
