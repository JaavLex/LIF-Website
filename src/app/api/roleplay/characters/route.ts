import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireSession, isErrorResponse } from '@/lib/api-auth';
import { checkAdminPermissions } from '@/lib/admin';
import { notifyNewCharacter } from '@/lib/discord-notify';
import type { Character, Rank, Unit } from '@/payload-types';

export async function POST(request: NextRequest) {
	const sessionResult = await requireSession(request);
	if (isErrorResponse(sessionResult)) return sessionResult;
	const session = sessionResult;

	try {
		const body = await request.json();
		const payload = await getPayloadClient();

		// Callsign is mandatory
		if (!body.callsign || typeof body.callsign !== 'string' || !body.callsign.trim()) {
			return NextResponse.json(
				{ message: 'Le callsign est obligatoire.' },
				{ status: 400 },
			);
		}
		body.callsign = body.callsign.trim();

		// Check if user is admin (via DB role or Discord roles)
		const { isAdmin } = await checkAdminPermissions(session);

		// NPC creation: admin can create without discord link
		const isNpcCreation = isAdmin && body.isNpc;
		delete body.isNpc;

		if (!isNpcCreation) {
			// Ensure discordId matches session for non-NPC
			body.discordId = session.discordId;
			body.discordUsername = session.discordUsername;

			// Check: only one in-service character allowed per player
			const existing = await payload.find({
				collection: 'characters',
				where: {
					and: [
						{ discordId: { equals: session.discordId } },
						{ status: { equals: 'in-service' } },
					],
				},
				limit: 1,
				depth: 0,
			});
			if (existing.docs.length > 0) {
				return NextResponse.json(
					{ message: 'Vous ne pouvez pas avoir plus d\'un personnage actif à la fois.' },
					{ status: 400 },
				);
			}
		}

		// Main character is always true for new characters
		body.isMainCharacter = true;

		// Non-admins: strip admin-only fields, auto-assign rank from Discord roles
		if (!isAdmin) {
			delete body.status;
			delete body.rank;
			delete body.classification;
			delete body.militaryId;
			delete body.isArchived;
			delete body.isTarget;
			delete body.targetFaction;
			delete body.etatMajorNotes;
			delete body.faction;

			// Default faction for non-NPC characters
			body.faction = 'LIF';

			// Auto-assign rank from Discord roles
			if (session.roles?.length) {
				const ranks = await payload.find({
					collection: 'ranks',
					where: { discordRoleId: { in: session.roles } },
					sort: '-order',
					limit: 1,
				});
				if (ranks.docs.length > 0) {
					body.rank = ranks.docs[0].id;
				} else {
					// Default to lowest rank (Recrue)
					const defaultRank = await payload.find({
						collection: 'ranks',
						sort: 'order',
						limit: 1,
					});
					if (defaultRank.docs.length > 0) body.rank = defaultRank.docs[0].id;
				}
			}

			// Default status for new characters
			body.status = 'in-service';
		}

		// For admins creating their own (non-NPC) character, also auto-derive rank
		// from Discord roles unless rankOverride is enabled. Mirrors the non-admin path
		// so the form's "detected rank" matches the saved value.
		if (isAdmin && !isNpcCreation && !body.rankOverride && session.roles?.length) {
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

		const doc = await payload.create({
			collection: 'characters',
			data: body,
		});

		// Send Discord notification (non-blocking)
		const fullDoc: Character = await payload.findByID({
			collection: 'characters',
			id: doc.id,
			depth: 2,
		});
		notifyNewCharacter({
			id: doc.id as number,
			fullName: fullDoc.fullName || `${fullDoc.firstName} ${fullDoc.lastName}`,
			discordUsername: fullDoc.discordUsername || '',
			rank: typeof fullDoc.rank === 'object' ? fullDoc.rank : null,
			unit: typeof fullDoc.unit === 'object' ? fullDoc.unit : null,
		}).catch(() => {});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: any) {
		console.error('Character creation error:', error);
		return NextResponse.json(
			{ message: error.message || 'Erreur lors de la création' },
			{ status: 400 },
		);
	}
}
