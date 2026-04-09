import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireAdmin, isErrorResponse } from '@/lib/api-auth';
import { logAdminAction } from '@/lib/admin-log';

export async function GET() {
	try {
		const payload = await getPayloadClient();
		const factions = await payload.find({
			collection: 'factions',
			limit: 100,
			sort: 'name',
		});
		return NextResponse.json(factions.docs);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Erreur';
		return NextResponse.json({ message }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	const auth = await requireAdmin(request);
	if (isErrorResponse(auth)) return auth;

	try {
		const payload = await getPayloadClient();
		const body = await request.json();

		if (!body.name || !body.slug) {
			return NextResponse.json({ message: 'Nom et slug requis' }, { status: 400 });
		}

		const doc = await payload.create({
			collection: 'factions',
			data: {
				name: body.name,
				slug: body.slug,
				type: body.type || 'neutral',
				color: body.color || '#8b4513',
				...(body.logo ? { logo: body.logo } : {}),
				...(body.description ? { description: body.description } : {}),
			},
		});

		void logAdminAction({
			session: auth.session,
			action: 'faction.create',
			summary: `A créé la faction "${doc.name}"`,
			entityType: 'faction',
			entityId: doc.id,
			entityLabel: doc.name,
			after: doc as unknown as Record<string, unknown>,
			request,
		});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: unknown) {
		console.error('Faction creation error:', error);
		const message = error instanceof Error ? error.message : 'Erreur lors de la création';
		return NextResponse.json({ message }, { status: 400 });
	}
}
