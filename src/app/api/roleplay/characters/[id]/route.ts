import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { notifyStatusChange } from '@/lib/discord-notify';

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

	const characterId = parseInt(id, 10);
	if (isNaN(characterId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();

		// Check ownership
		const existing = await payload.findByID({
			collection: 'characters',
			id: characterId,
		});

		if (!existing) {
			return NextResponse.json(
				{ message: 'Personnage non trouvé' },
				{ status: 404 },
			);
		}

		// Check if user is admin (via DB role or Discord roles) or owner
		const { isAdmin } = await checkAdminPermissions(session);
		const isOwner = existing.discordId === session.discordId;

		if (!isAdmin && !isOwner) {
			return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });
		}

		const body = await request.json();

		// Never allow discordId/discordUsername to be changed through normal fields
		delete body.discordId;
		delete body.discordUsername;

		// Admin reassign: allow full admins to change linked Discord account
		if (isAdmin && body.linkedDiscordId) {
			const { isAdmin: isFullAdmin, level } = await checkAdminPermissions(session);
			if (isFullAdmin && level === 'full') {
				body.discordId = body.linkedDiscordId;
				body.discordUsername = body.linkedDiscordUsername || '';
			}
		}
		delete body.linkedDiscordId;
		delete body.linkedDiscordUsername;

		// Don't allow non-admins to change certain fields
		if (!isAdmin) {
			delete body.classification;
			delete body.militaryId;
			delete body.isArchived;
			delete body.status;
			delete body.rank;
			delete body.isTarget;
			delete body.targetFaction;
			delete body.etatMajorNotes;
		}

		const oldStatus = existing.status;

		const doc = await payload.update({
			collection: 'characters',
			id: characterId,
			data: body,
		});

		if (body.status && body.status !== oldStatus) {
			notifyStatusChange({
				id: characterId,
				fullName: doc.fullName || `${doc.firstName} ${doc.lastName}`,
				oldStatus: oldStatus || 'in-service',
				newStatus: body.status,
			}).catch(() => {});
		}

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Character update error:', error);
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

	const characterId = parseInt(id, 10);
	if (isNaN(characterId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	// Only full-permission admins can delete
	const adminPerms = await checkAdminPermissions(session);
	if (!adminPerms.isAdmin || adminPerms.level !== 'full') {
		return NextResponse.json(
			{
				message:
					'Non autorisé — seuls les administrateurs peuvent supprimer un dossier',
			},
			{ status: 403 },
		);
	}

	try {
		const payload = await getPayloadClient();

		// Delete timeline events referencing this character
		const timeline = await payload.find({
			collection: 'character-timeline',
			where: { character: { equals: characterId } },
			limit: 0,
		});
		for (const event of timeline.docs) {
			await payload.delete({ collection: 'character-timeline', id: event.id });
		}

		// Nullify intelligence references
		const linkedIntel = await payload.find({
			collection: 'intelligence',
			where: {
				or: [
					{ linkedTarget: { equals: characterId } },
					{ postedBy: { equals: characterId } },
				],
			},
			limit: 0,
		});
		for (const report of linkedIntel.docs) {
			const updates: Record<string, null> = {};
			if (report.linkedTarget && (typeof report.linkedTarget === 'number' ? report.linkedTarget : report.linkedTarget.id) === characterId) {
				updates.linkedTarget = null;
			}
			if (report.postedBy && (typeof report.postedBy === 'number' ? report.postedBy : report.postedBy.id) === characterId) {
				updates.postedBy = null;
			}
			await payload.update({ collection: 'intelligence', id: report.id, data: updates });
		}

		// Nullify superiorOfficer references in other characters
		const subordinates = await payload.find({
			collection: 'characters',
			where: { superiorOfficer: { equals: characterId } },
			limit: 0,
		});
		for (const sub of subordinates.docs) {
			await payload.update({ collection: 'characters', id: sub.id, data: { superiorOfficer: null } });
		}

		// Nullify unit commander references
		const units = await payload.find({
			collection: 'units',
			where: { commander: { equals: characterId } },
			limit: 0,
		});
		for (const unit of units.docs) {
			await payload.update({ collection: 'units', id: unit.id, data: { commander: null } });
		}

		await payload.delete({
			collection: 'characters',
			id: characterId,
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('Character deletion error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la suppression' },
			{ status: 400 },
		);
	}
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const characterId = parseInt(id, 10);
	if (isNaN(characterId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	try {
		const payload = await getPayloadClient();
		const doc = await payload.findByID({
			collection: 'characters',
			id: characterId,
			depth: 2,
		});
		return NextResponse.json(doc);
	} catch {
		return NextResponse.json({ message: 'Non trouvé' }, { status: 404 });
	}
}
