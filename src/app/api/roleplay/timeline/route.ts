import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireAdmin, isErrorResponse } from '@/lib/api-auth';
import { notifyTimelineEvent } from '@/lib/discord-notify';
import { logAdminAction } from '@/lib/admin-log';

export async function DELETE(request: NextRequest) {
	const auth = await requireAdmin(request);
	if (isErrorResponse(auth)) return auth;
	const { session } = auth;

	try {
		const payload = await getPayloadClient();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) {
			return NextResponse.json({ message: 'ID manquant' }, { status: 400 });
		}

		// Capture snapshot before deletion for the audit log
		const existing = await payload.findByID({
			collection: 'character-timeline',
			id: parseInt(id, 10),
			depth: 1,
		});
		const characterName =
			typeof existing.character === 'object' && existing.character !== null
				? (existing.character as { fullName?: string; firstName?: string; lastName?: string }).fullName ||
					`${(existing.character as { firstName?: string }).firstName ?? ''} ${(existing.character as { lastName?: string }).lastName ?? ''}`.trim()
				: `personnage #${typeof existing.character === 'number' ? existing.character : '?'}`;

		await payload.delete({
			collection: 'character-timeline',
			id: parseInt(id, 10),
		});

		void logAdminAction({
			session,
			action: 'character_timeline.delete',
			summary: `A supprimé un événement du timeline de ${characterName}`,
			entityType: 'character_timeline',
			entityId: existing.id,
			entityLabel: `${characterName} — ${existing.title}`,
			before: existing as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		console.error('Timeline deletion error:', error);
		const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
		return NextResponse.json({ message }, { status: 400 });
	}
}

export async function POST(request: NextRequest) {
	const auth = await requireAdmin(request);
	if (isErrorResponse(auth)) return auth;
	const { session } = auth;

	try {
		const payload = await getPayloadClient();
		const body = await request.json();

		if (!body.character || !body.type || !body.title || !body.date) {
			return NextResponse.json(
				{ message: 'Champs requis manquants' },
				{ status: 400 },
			);
		}

		const doc = await payload.create({
			collection: 'character-timeline',
			data: body,
		});

		const character = await payload.findByID({
			collection: 'characters',
			id:
				typeof body.character === 'number'
					? body.character
					: parseInt(body.character, 10),
		});

		const characterName =
			character.fullName || `${character.firstName} ${character.lastName}`;

		notifyTimelineEvent({
			characterId: character.id,
			characterName,
			type: body.type,
			title: body.title,
			date: body.date,
		}).catch(() => {});

		void logAdminAction({
			session,
			action: 'character_timeline.create',
			summary: `A ajouté l'événement "${doc.title}" au timeline de ${characterName}`,
			entityType: 'character_timeline',
			entityId: doc.id,
			entityLabel: `${characterName} — ${doc.title}`,
			after: doc as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: unknown) {
		console.error('Timeline creation error:', error);
		const message = error instanceof Error ? error.message : 'Erreur lors de la création';
		return NextResponse.json({ message }, { status: 400 });
	}
}
