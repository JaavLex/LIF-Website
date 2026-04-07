import { NextRequest, NextResponse } from 'next/server';
import { signSession, verifySession } from '@/lib/session';
import { getGuildMember } from '@/lib/discord';
import { getPayloadClient } from '@/lib/payload';

export async function GET(request: NextRequest) {
	const token = request.cookies.get('roleplay-session')?.value;

	if (!token) {
		return NextResponse.json({ authenticated: false }, { status: 401 });
	}

	const session = verifySession(token);
	if (!session) {
		return NextResponse.json({ authenticated: false }, { status: 401 });
	}

	// When called with ?refresh=1, re-fetch the caller's Discord guild roles
	// so client-side rank detection uses up-to-date data instead of the
	// snapshot stored in the JWT at login time.
	const shouldRefresh = request.nextUrl.searchParams.get('refresh') === '1';
	if (shouldRefresh) {
		try {
			const member = await getGuildMember(session.discordId);
			if (member) {
				const freshRoles = member.roles || [];
				const refreshed = { ...session, roles: freshRoles };

				// Persist on the Payload user record so server-side reads stay
				// consistent with what we just handed back to the client.
				try {
					const payload = await getPayloadClient();
					await payload.update({
						collection: 'users',
						id: session.userId,
						data: { discordRoles: freshRoles, isGuildMember: true },
					});
				} catch {
					// Non-fatal: still return refreshed session below.
				}

				const newToken = signSession(refreshed);
				const response = NextResponse.json({
					authenticated: true,
					user: refreshed,
					refreshed: true,
				});
				response.cookies.set('roleplay-session', newToken, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 7,
					path: '/',
				});
				return response;
			}
		} catch {
			// Fall through and return the cached session.
		}
	}

	return NextResponse.json({
		authenticated: true,
		user: session,
	});
}
