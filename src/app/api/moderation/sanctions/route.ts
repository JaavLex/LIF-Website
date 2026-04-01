import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { getPayloadClient } from '@/lib/payload';

// GET: list sanctions with optional filters
export async function GET(request: NextRequest) {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

	const perms = await checkAdminPermissions(session);
	if (!perms.isAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

	const { searchParams } = new URL(request.url);
	const targetDiscordId = searchParams.get('targetDiscordId');
	const type = searchParams.get('type');

	const where: any = {};
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
	} catch (err: any) {
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
