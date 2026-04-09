import { NextRequest, NextResponse } from 'next/server';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';
import { logAdminAction } from '@/lib/admin-log';

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
		// Capture snapshot before soft-delete (for log summary and diff)
		const snapshot = await payload.findByID({
			collection: 'comms-messages',
			id: messageId,
		}) as any;

		// Fetch the channel to get its name for the summary
		let channelName = `#${snapshot?.channelId ?? messageId}`;
		if (snapshot?.channelId) {
			try {
				const channel = await payload.findByID({
					collection: 'comms-channels',
					id: snapshot.channelId,
				}) as any;
				if (channel?.name) channelName = channel.name;
			} catch {
				// keep fallback name
			}
		}

		await payload.update({
			collection: 'comms-messages',
			id: messageId,
			data: {
				deletedAt: new Date().toISOString(),
				deletedBy: auth.session.discordUsername,
			} as any,
		});

		const preview = (snapshot?.body ?? '').slice(0, 60);
		void logAdminAction({
			session: auth.session,
			permissions: auth.permissions,
			action: 'comms_message.delete',
			summary: `A supprimé un message dans "${channelName}" ("${preview}...")`,
			entityType: 'comms_message',
			entityId: messageId,
			entityLabel: preview,
			before: snapshot as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ success: true });
	}
	if (action === 'restore') {
		// Capture snapshot before restore (for log diff)
		const snapshot = await payload.findByID({
			collection: 'comms-messages',
			id: messageId,
		}) as any;

		// Fetch the channel to get its name for the summary
		let channelName = `#${snapshot?.channelId ?? messageId}`;
		if (snapshot?.channelId) {
			try {
				const channel = await payload.findByID({
					collection: 'comms-channels',
					id: snapshot.channelId,
				}) as any;
				if (channel?.name) channelName = channel.name;
			} catch {
				// keep fallback name
			}
		}

		await payload.update({
			collection: 'comms-messages',
			id: messageId,
			data: { deletedAt: null, deletedBy: null } as any,
		});

		void logAdminAction({
			session: auth.session,
			permissions: auth.permissions,
			action: 'comms_message.restore',
			summary: `A restauré un message dans "${channelName}"`,
			entityType: 'comms_message',
			entityId: messageId,
			entityLabel: (snapshot?.body ?? '').slice(0, 60),
			before: snapshot as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ success: true });
	}
	return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
