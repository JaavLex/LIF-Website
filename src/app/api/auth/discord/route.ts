import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	const clientId = process.env.DISCORD_CLIENT_ID;
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

	// Capture the redirect destination from query params
	const returnTo = request.nextUrl.searchParams.get('redirect') || '';
	const callbackUrl = new URL(`${baseUrl}/api/auth/discord/callback`);
	if (returnTo) callbackUrl.searchParams.set('redirect', returnTo);
	const redirectUri = `${baseUrl}/api/auth/discord/callback`;

	if (!clientId) {
		return NextResponse.json({ error: 'Discord not configured' }, { status: 500 });
	}

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'identify guilds.members.read',
		state: returnTo,
	});

	return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}
