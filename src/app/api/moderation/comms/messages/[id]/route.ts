import { NextRequest, NextResponse } from 'next/server';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = await requireFullAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const { id } = await params;
	const messageId = parseInt(id, 10);
	if (isNaN(messageId)) {
		return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
	}

	const { action } = await request.json();
	const payload = await getPayloadClient();

	if (action === 'delete') {
		await payload.update({
			collection: 'comms-messages',
			id: messageId,
			data: {
				deletedAt: new Date().toISOString(),
				deletedBy: auth.session.discordUsername,
			} as any,
		});
		return NextResponse.json({ success: true });
	}
	if (action === 'restore') {
		await payload.update({
			collection: 'comms-messages',
			id: messageId,
			data: { deletedAt: null, deletedBy: null } as any,
		});
		return NextResponse.json({ success: true });
	}
	return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
