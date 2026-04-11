import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set(['bar', 'shop', 'gas', 'city']);

export async function GET() {
	try {
		const payload = await getPayloadClient();
		const result = await payload.find({
			collection: 'map-poi' as any,
			limit: 500,
			depth: 0,
		});
		const pois = result.docs.map((p: any) => ({
			id: p.id,
			name: p.name,
			type: p.type,
			description: p.description || null,
			x: p.x,
			z: p.z,
		}));
		return NextResponse.json(
			{ pois },
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	} catch (error) {
		console.error('POI list error:', error);
		return NextResponse.json({ pois: [] });
	}
}

export async function POST(request: NextRequest) {
	const guard = await requireAdmin(request);
	if (guard instanceof NextResponse) return guard;

	try {
		const body = await request.json();
		const { name, type, x, z, description } = body;
		if (
			!name ||
			typeof name !== 'string' ||
			!type ||
			!VALID_TYPES.has(type) ||
			typeof x !== 'number' ||
			typeof z !== 'number'
		) {
			return NextResponse.json(
				{ error: 'name, type (bar|shop|gas), x, z requis' },
				{ status: 400 },
			);
		}
		const payload = await getPayloadClient();
		const created = await payload.create({
			collection: 'map-poi' as any,
			data: { name, type, x, z, description: description || null } as any,
		});
		return NextResponse.json({ success: true, id: created.id });
	} catch (error: any) {
		console.error('POI create error:', error);
		return NextResponse.json(
			{ error: error.message || 'Erreur création POI' },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	const guard = await requireAdmin(request);
	if (guard instanceof NextResponse) return guard;

	try {
		const body = await request.json();
		const { id } = body;
		if (!id) {
			return NextResponse.json({ error: 'id requis' }, { status: 400 });
		}
		const payload = await getPayloadClient();
		await payload.delete({ collection: 'map-poi' as any, id });
		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('POI delete error:', error);
		return NextResponse.json(
			{ error: error.message || 'Erreur suppression POI' },
			{ status: 500 },
		);
	}
}
