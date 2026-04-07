import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { checkAdminPermissions } from '@/lib/admin';
import { checkCommsEligibility, COMMS_LIMITS } from '@/lib/comms';
import { getPayloadClient } from '@/lib/payload';

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const messageId = parseInt(id, 10);
	if (isNaN(messageId)) {
		return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
	}

	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}

	const payload = await getPayloadClient();
	const msg = (await payload
		.findByID({ collection: 'comms-messages', id: messageId })
		.catch(() => null)) as any;
	if (!msg)
		return NextResponse.json({ error: 'Message introuvable' }, { status: 404 });

	if (msg.senderCharacterId !== eligibility.character.id) {
		return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
	}

	const ageMs = Date.now() - new Date(msg.createdAt).getTime();
	if (ageMs > COMMS_LIMITS.editWindowMs) {
		return NextResponse.json(
			{ error: 'Fenêtre d\'édition expirée' },
			{ status: 403 },
		);
	}

	const { body } = await request.json();
	if (typeof body !== 'string' || !body.trim()) {
		return NextResponse.json({ error: 'Corps requis' }, { status: 400 });
	}
	if (body.length > COMMS_LIMITS.maxBodyLength) {
		return NextResponse.json({ error: 'Trop long' }, { status: 400 });
	}

	await payload.update({
		collection: 'comms-messages',
		id: messageId,
		data: { body, editedAt: new Date().toISOString() } as any,
	});
	return NextResponse.json({ success: true });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const messageId = parseInt(id, 10);
	if (isNaN(messageId)) {
		return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
	}

	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}
	const isAdmin = (await checkAdminPermissions(session!)).isAdmin;

	const payload = await getPayloadClient();
	const msg = (await payload
		.findByID({ collection: 'comms-messages', id: messageId })
		.catch(() => null)) as any;
	if (!msg)
		return NextResponse.json({ error: 'Message introuvable' }, { status: 404 });

	const isOwn = msg.senderCharacterId === eligibility.character.id;
	const ageMs = Date.now() - new Date(msg.createdAt).getTime();
	const canDeleteOwn = isOwn && ageMs <= COMMS_LIMITS.editWindowMs;

	if (!canDeleteOwn && !isAdmin) {
		return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
	}

	await payload.update({
		collection: 'comms-messages',
		id: messageId,
		data: {
			deletedAt: new Date().toISOString(),
			deletedBy: session!.discordUsername,
		} as any,
	});
	return NextResponse.json({ success: true });
}
