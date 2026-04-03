import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';

export async function GET(request: NextRequest) {
	const auth = await requireAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const { searchParams } = new URL(request.url);
	const targetDiscordId = searchParams.get('targetDiscordId');
	const type = searchParams.get('type');

	const where: Record<string, unknown> = {};
	if (targetDiscordId) where.targetDiscordId = { equals: targetDiscordId };
	if (type) where.type = { equals: type };

	try {
		const payload = await getPayloadClient();
		const result = await payload.find({
			collection: 'moderation-sanctions',
			where,
			sort: '-createdAt',
			limit: 200,
			depth: 0,
		});

		return NextResponse.json({ sanctions: result.docs, total: result.totalDocs });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
