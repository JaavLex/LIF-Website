import { NextResponse } from 'next/server';

export async function GET() {
	const clientId = process.env.DISCORD_CLIENT_ID;
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
	const redirectUri = `${baseUrl}/api/auth/discord/callback`;

	if (!clientId) {
		return NextResponse.json({ error: 'Discord not configured' }, { status: 500 });
	}

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'identify guilds.members.read',
	});

	return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}
