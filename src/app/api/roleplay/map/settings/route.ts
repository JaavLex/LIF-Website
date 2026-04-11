import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';

export const dynamic = 'force-dynamic';

/**
 * Admin-only toggle endpoint for runtime map settings stored on the
 * Roleplay global (currently: `publicPlayerPositions`).
 */
export async function POST(request: NextRequest) {
	const guard = await requireAdmin(request);
	if (guard instanceof NextResponse) return guard;

	try {
		const body = await request.json();
		const { publicPlayerPositions } = body as { publicPlayerPositions?: unknown };
		if (typeof publicPlayerPositions !== 'boolean') {
			return NextResponse.json(
				{ error: 'publicPlayerPositions (boolean) requis' },
				{ status: 400 },
			);
		}

		const payload = await getPayloadClient();
		await payload.updateGlobal({
			slug: 'roleplay',
			data: { publicPlayerPositions } as any,
		});

		return NextResponse.json({ success: true, publicPlayerPositions });
	} catch (error: any) {
		console.error('Map settings update error:', error);
		return NextResponse.json(
			{ error: error?.message || 'Erreur mise à jour' },
			{ status: 500 },
		);
	}
}
