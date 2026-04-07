import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireSession, isErrorResponse } from '@/lib/api-auth';
import { checkAdminPermissions } from '@/lib/admin';
import { notifyStatusChange } from '@/lib/discord-notify';

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const sessionResult = await requireSession(request);
	if (isErrorResponse(sessionResult)) return sessionResult;
	const session = sessionResult;

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
		// Never allow game money fields to be changed directly
		delete body.savedMoney;
		delete body.lastMoneySyncAt;

		// Convert empty biId to null (unique constraint rejects empty strings)
		if (body.biId !== undefined && !body.biId) {
			body.biId = null;
		}

		// Admin reassign: allow full admins to change linked Discord account
		if (isAdmin && body.linkedDiscordId !== undefined) {
			const { isAdmin: isFullAdmin, level } = await checkAdminPermissions(session);
			if (isFullAdmin && level === 'full') {
				body.discordId = body.linkedDiscordId || '';
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
			delete body.faction;
			delete body.rankOverride;
		}

		// Auto-derive rank from Discord roles unless rankOverride is explicitly enabled.
		// Applies on every edit so the saved rank stays in sync with the user's current roles.
		const overrideAfter =
			body.rankOverride !== undefined ? body.rankOverride : existing.rankOverride;
		if (!overrideAfter && isOwner && session.roles?.length) {
			const ranks = await payload.find({
				collection: 'ranks',
				where: { discordRoleId: { in: session.roles } },
				sort: '-order',
				limit: 1,
			});
			if (ranks.docs.length > 0) {
				body.rank = ranks.docs[0].id;
			} else {
				const defaultRank = await payload.find({
					collection: 'ranks',
					sort: 'order',
					limit: 1,
				});
				if (defaultRank.docs.length > 0) body.rank = defaultRank.docs[0].id;
			}
		}

		const oldStatus = existing.status;

		// When status changes away from in-service, unlink UUID and remove main character
		if (body.status && body.status !== 'in-service' && oldStatus === 'in-service') {
			body.biId = null;
			body.isMainCharacter = false;
			body.savedMoney = null;
			body.lastMoneySyncAt = null;
		}

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
	const { requireFullAdmin: requireFull, isErrorResponse: isErr } = await import('@/lib/api-auth');
	const auth = await requireFull(request);
	if (isErr(auth)) return auth;

	const characterId = parseInt(id, 10);
	if (isNaN(characterId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
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
			if (
				report.linkedTarget &&
				(typeof report.linkedTarget === 'number'
					? report.linkedTarget
					: report.linkedTarget.id) === characterId
			) {
				updates.linkedTarget = null;
			}
			if (
				report.postedBy &&
				(typeof report.postedBy === 'number'
					? report.postedBy
					: report.postedBy.id) === characterId
			) {
				updates.postedBy = null;
			}
			await payload.update({
				collection: 'intelligence',
				id: report.id,
				data: updates,
			});
		}

		// Nullify superiorOfficer references in other characters
		const subordinates = await payload.find({
			collection: 'characters',
			where: { superiorOfficer: { equals: characterId } },
			limit: 0,
		});
		for (const sub of subordinates.docs) {
			await payload.update({
				collection: 'characters',
				id: sub.id,
				data: { superiorOfficer: null },
			});
		}

		// Nullify unit commander references
		const units = await payload.find({
			collection: 'units',
			where: { commander: { equals: characterId } },
			limit: 0,
		});
		for (const unit of units.docs) {
			await payload.update({
				collection: 'units',
				id: unit.id,
				data: { commander: null },
			});
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
		const doc = (await payload.findByID({
			collection: 'characters',
			id: characterId,
			depth: 2,
		})) as any;

		// Resolve the faction logo by name (faction is stored as text on the
		// character; the Factions collection holds the upload).
		let factionLogoUrl: string | null = null;
		if (doc.faction) {
			const factionResult = await payload.find({
				collection: 'factions',
				where: { name: { equals: doc.faction } },
				limit: 1,
				depth: 1,
			});
			const f = factionResult.docs[0] as any;
			if (f && typeof f.logo === 'object') {
				factionLogoUrl = f.logo?.url || null;
			}
		}

		return NextResponse.json({ ...doc, factionLogoUrl });
	} catch {
		return NextResponse.json({ message: 'Non trouvé' }, { status: 404 });
	}
}
