import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireAdmin, isErrorResponse } from '@/lib/api-auth';
import { logAdminAction } from '@/lib/admin-log';
import { sendDiscordDM } from '@/lib/moderation';
import { PUBLIC_BASE_URL } from '@/lib/constants';

/**
 * POST /api/roleplay/characters/[id]/require-improvements
 *
 * Admin action: flag a character sheet as "requires improvements". The
 * character is forced to the dishonourable-discharge status AND marked with
 * requiresImprovements=true so that:
 *   - the auto-clear logic in the main PATCH route (which normally clears
 *     biId / isMainCharacter when moving out of in-service) is bypassed
 *   - the owner can edit the sheet and, once it meets the validation rules
 *     (avatar + 500-char backgrounds), the flag auto-clears and the status
 *     reverts to in-service
 *
 * The character's Discord owner also receives a DM with the reason so they
 * know what to fix.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const auth = await requireAdmin(request);
	if (isErrorResponse(auth)) return auth;
	const { session } = auth;

	const characterId = parseInt(id, 10);
	if (isNaN(characterId)) {
		return NextResponse.json({ message: 'ID invalide' }, { status: 400 });
	}

	let reason: string;
	try {
		const body = await request.json();
		reason = typeof body.reason === 'string' ? body.reason.trim() : '';
	} catch {
		return NextResponse.json({ message: 'Corps de requête invalide' }, { status: 400 });
	}
	if (!reason) {
		return NextResponse.json(
			{ message: 'Une raison est obligatoire.' },
			{ status: 400 },
		);
	}
	if (reason.length > 2000) {
		return NextResponse.json(
			{ message: 'La raison est trop longue (max 2000 caractères).' },
			{ status: 400 },
		);
	}

	try {
		const payload = await getPayloadClient();
		const existing = await payload.findByID({
			collection: 'characters',
			id: characterId,
		});
		if (!existing) {
			return NextResponse.json({ message: 'Personnage non trouvé' }, { status: 404 });
		}
		if (!existing.discordId) {
			return NextResponse.json(
				{ message: 'Ce dossier n\'est pas lié à un compte Discord (PNJ).' },
				{ status: 400 },
			);
		}

		const doc = await payload.update({
			collection: 'characters',
			id: characterId,
			data: {
				status: 'dishonourable-discharge',
				requiresImprovements: true,
				improvementReason: reason,
				improvementRequestedAt: new Date().toISOString(),
				improvementRequestedBy: session.discordUsername || session.discordId,
			},
		});

		// Send Discord DM to the character owner — best effort, never block
		// the admin action on a DM failure.
		const fullName = doc.fullName || `${doc.firstName} ${doc.lastName}`;
		const sheetUrl = `${PUBLIC_BASE_URL}/roleplay/personnage/${characterId}/modifier`;
		const dmContent = [
			`**Votre dossier personnel « ${fullName} » nécessite des améliorations.**`,
			'',
			`Un administrateur (${session.discordUsername || 'Admin'}) vous demande de retravailler votre fiche.`,
			'',
			'**Raison :**',
			`> ${reason.replace(/\n/g, '\n> ')}`,
			'',
			`Votre personnage est actuellement marqué comme **réformé sans honneur** et le restera jusqu\'à ce que vous modifiez le dossier pour qu\'il respecte les règles de validation (photo de profil obligatoire, parcours civil et militaire d\'au moins 500 caractères chacun).`,
			'',
			`Modifier le dossier : ${sheetUrl}`,
		].join('\n');

		let dmDelivered = false;
		try {
			await sendDiscordDM(existing.discordId, dmContent);
			dmDelivered = true;
		} catch (err) {
			console.error('[require-improvements] DM failed:', err);
		}

		void logAdminAction({
			session,
			permissions: auth.permissions,
			action: 'character.require_improvements',
			summary: `A demandé des améliorations sur le dossier ${fullName}`,
			entityType: 'character',
			entityId: characterId,
			entityLabel: fullName,
			before: existing as unknown as Record<string, unknown>,
			after: doc as unknown as Record<string, unknown>,
			metadata: { reason, dmDelivered },
			request,
		});

		return NextResponse.json({ success: true, dmDelivered });
	} catch (error: any) {
		console.error('require-improvements error:', error);
		return NextResponse.json(
			{ message: error.message || "Erreur lors de l'enregistrement" },
			{ status: 500 },
		);
	}
}
