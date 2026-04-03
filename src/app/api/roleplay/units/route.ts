import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireAdmin, isErrorResponse } from '@/lib/api-auth';

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
			collection: 'units',
			data: {
				name: body.name,
				slug: body.slug,
				color: body.color || '#4a7c23',
				...(body.insignia ? { insignia: body.insignia } : {}),
				...(body.parentFaction ? { parentFaction: body.parentFaction } : {}),
				...(body.description ? { description: body.description } : {}),
			},
		});

		return NextResponse.json({ id: doc.id, doc });
	} catch (error: unknown) {
		console.error('Unit creation error:', error);
		const message = error instanceof Error ? error.message : 'Erreur lors de la création';
		return NextResponse.json({ message }, { status: 400 });
	}
}
