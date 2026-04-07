import { NextRequest, NextResponse } from 'next/server';
import { requireSession, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';

export async function POST(request: NextRequest) {
	const sessionResult = await requireSession(request);
	if (isErrorResponse(sessionResult)) return sessionResult;

	const payload = await getPayloadClient();
	const result = await payload.find({
		collection: 'users',
		where: { discordId: { equals: sessionResult.discordId } },
		limit: 1,
	});
	const user = result.docs[0];
	if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

	await payload.update({
		collection: 'users',
		id: user.id,
		data: { commsDisclaimerAcceptedAt: new Date().toISOString() } as any,
	});
	return NextResponse.json({ success: true });
}
