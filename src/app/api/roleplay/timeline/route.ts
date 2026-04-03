import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireAdmin, isErrorResponse } from '@/lib/api-auth';
import { notifyTimelineEvent } from '@/lib/discord-notify';

export async function DELETE(request: NextRequest) {
	const auth = await requireAdmin(request);
	if (isErrorResponse(auth)) return auth;

	try {
		const payload = await getPayloadClient();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) {
			return NextResponse.json({ message: 'ID manquant' }, { status: 400 });
		}

		await payload.delete({
			collection: 'character-timeline',
			id: parseInt(id, 10),
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

		notifyTimelineEvent({
			characterId: character.id,
			characterName:
				character.fullName || `${character.firstName} ${character.lastName}`,
			type: body.type,
			title: body.title,
			date: body.date,
		}).catch(() => {});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: unknown) {
		console.error('Timeline creation error:', error);
		const message = error instanceof Error ? error.message : 'Erreur lors de la création';
		return NextResponse.json({ message }, { status: 400 });
	}
}
