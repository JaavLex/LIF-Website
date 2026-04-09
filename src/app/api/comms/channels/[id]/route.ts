import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { checkAdminPermissions } from '@/lib/admin';
import { checkCommsEligibility, COMMS_LIMITS } from '@/lib/comms';
import { getPayloadClient } from '@/lib/payload';
import { logAdminAction } from '@/lib/admin-log';

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const channelId = parseInt(id, 10);
	if (isNaN(channelId)) {
		return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
	}

	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}
	const isAdmin = (await checkAdminPermissions(session!)).isAdmin;

	const payload = await getPayloadClient();
	const channel = (await payload
		.findByID({ collection: 'comms-channels', id: channelId })
		.catch(() => null)) as any;
	if (!channel)
		return NextResponse.json({ error: 'Canal introuvable' }, { status: 404 });

	if (channel.type !== 'group') {
		return NextResponse.json(
			{ error: 'Seuls les groupes sont modifiables' },
			{ status: 400 },
		);
	}

	const isCreator = channel.createdByCharacterId === eligibility.character.id;
	if (!isCreator && !isAdmin) {
		return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
	}

	const body = await request.json();
	const update: any = {};
	if (typeof body.name === 'string' && body.name.trim()) {
		update.name = body.name.trim();
	}
	if (Array.isArray(body.members)) {
		const members = Array.from(
			new Set(body.members.map(Number).filter((n: number) => !isNaN(n))),
		);
		// Always include creator
		if (!members.includes(channel.createdByCharacterId)) {
			members.push(channel.createdByCharacterId);
		}
		if (members.length > COMMS_LIMITS.maxGroupMembers) {
			return NextResponse.json(
				{ error: `Maximum ${COMMS_LIMITS.maxGroupMembers} membres par groupe` },
				{ status: 400 },
			);
		}
		update.members = members;
	}

	const updated = await payload.update({ collection: 'comms-channels', id: channelId, data: update });

	if (isAdmin) {
		void logAdminAction({
			session: session!,
			action: 'comms_channel.update',
			summary: `A modifié le canal "${channel.name}"`,
			entityType: 'comms_channel',
			entityId: channelId,
			entityLabel: channel.name,
			before: channel as unknown as Record<string, unknown>,
			after: updated as unknown as Record<string, unknown>,
			request,
		});
	}

	return NextResponse.json({ success: true });
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const channelId = parseInt(id, 10);
	if (isNaN(channelId)) {
		return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
	}

	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}
	const isAdmin = (await checkAdminPermissions(session!)).isAdmin;

	const payload = await getPayloadClient();
	const channel = (await payload
		.findByID({ collection: 'comms-channels', id: channelId })
		.catch(() => null)) as any;
	if (!channel)
		return NextResponse.json({ error: 'Canal introuvable' }, { status: 404 });

	const members: number[] = Array.isArray(channel.members) ? channel.members : [];
	const isCreator = channel.createdByCharacterId === eligibility.character.id;

	// Auto channels can't be deleted by users
	if ((channel.type === 'faction' || channel.type === 'unit') && !isAdmin) {
		return NextResponse.json({ error: 'Canal automatique' }, { status: 403 });
	}

	// Group: creator or admin can hard delete; any member can leave (with notice)
	if (channel.type === 'group') {
		if (isCreator || isAdmin) {
			await payload.delete({ collection: 'comms-channels', id: channelId });
			if (isAdmin) {
				void logAdminAction({
					session: session!,
					action: 'comms_channel.delete',
					summary: `A supprimé le canal "${channel.name}"`,
					entityType: 'comms_channel',
					entityId: channelId,
					entityLabel: channel.name,
					before: channel as unknown as Record<string, unknown>,
					request,
				});
			}
			return NextResponse.json({ success: true, deleted: true });
		}
		if (!members.includes(eligibility.character.id)) {
			return NextResponse.json({ error: 'Non membre' }, { status: 403 });
		}
		// Post a system-style notice from the leaving character before removal so
		// the remaining members see who left in the channel history.
		await payload.create({
			collection: 'comms-messages',
			data: {
				channelId,
				senderCharacterId: eligibility.character.id,
				senderDiscordId: session!.discordId,
				isAnonymous: false,
				body: `*${eligibility.character.fullName} a quitté le canal.*`,
			} as any,
		});
		const newMembers = members.filter((m) => m !== eligibility.character.id);
		await payload.update({
			collection: 'comms-channels',
			id: channelId,
			data: {
				members: newMembers,
				lastMessageAt: new Date().toISOString(),
			} as any,
		});
		return NextResponse.json({ success: true, left: true });
	}

	// DM: any participant can close it for everyone (deletes the channel record).
	// Admins can always delete.
	if (channel.type === 'dm') {
		const isParticipant = members.includes(eligibility.character.id);
		if (!isParticipant && !isAdmin) {
			return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
		}
		await payload.delete({ collection: 'comms-channels', id: channelId });
		if (isAdmin) {
			void logAdminAction({
				session: session!,
				action: 'comms_channel.delete',
				summary: `A supprimé le canal "${channel.name}"`,
				entityType: 'comms_channel',
				entityId: channelId,
				entityLabel: channel.name,
				before: channel as unknown as Record<string, unknown>,
				request,
			});
		}
		return NextResponse.json({ success: true, deleted: true });
	}

	return NextResponse.json({ error: 'Action non supportée' }, { status: 400 });
}
