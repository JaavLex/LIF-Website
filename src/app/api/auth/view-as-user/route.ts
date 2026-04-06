import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { getPayloadClient } from '@/lib/payload';
import type { Roleplay } from '@/payload-types';

/**
 * POST /api/auth/view-as-user
 * Toggle "view as user" mode for admins (dev environment only).
 */
export async function POST(request: NextRequest) {
	if (process.env.NEXT_PUBLIC_LIF_ENVIRONMENT !== 'dev') {
		return NextResponse.json({ error: 'Dev only' }, { status: 403 });
	}

	const token = request.cookies.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	// Verify the user is actually an admin (DB role or Discord roles, bypass view-as-user cookie)
	const payload = await getPayloadClient();
	const user = await payload.find({
		collection: 'users',
		where: { discordId: { equals: session.discordId } },
		limit: 1,
	});
	let isRealAdmin = user.docs[0]?.role === 'admin';

	if (!isRealAdmin) {
		try {
			const roleplayConfig = await payload.findGlobal({ slug: 'roleplay' }) as Roleplay;
			const adminRoles = roleplayConfig?.adminRoles;
			if (adminRoles?.length) {
				for (const role of adminRoles) {
					if (session.roles?.includes(role.roleId)) {
						isRealAdmin = true;
						break;
					}
				}
			}
		} catch {}
	}

	if (!isRealAdmin) {
		return NextResponse.json({ error: 'Admin requis' }, { status: 403 });
	}

	const currentValue = request.cookies.get('view-as-user')?.value;
	const newValue = currentValue === '1' ? '0' : '1';

	const response = NextResponse.json({ viewAsUser: newValue === '1' });
	response.cookies.set('view-as-user', newValue, {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		maxAge: newValue === '1' ? 86400 : 0, // 24h or delete
	});

	return response;
}
