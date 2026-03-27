import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import {
	getDiscordTokens,
	getDiscordUser,
	getGuildMember,
	getDiscordAvatarUrl,
} from '@/lib/discord';
import { signSession } from '@/lib/session';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
	const code = request.nextUrl.searchParams.get('code');
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
	const redirectUri = `${baseUrl}/api/auth/discord/callback`;
	const requiredRoleId = process.env.DISCORD_REQUIRED_ROLE_ID;

	if (!code) {
		return NextResponse.redirect(`${baseUrl}/?error=no_code`);
	}

	try {
		// Exchange code for tokens
		const tokens = await getDiscordTokens(code, redirectUri);
		const discordUser = await getDiscordUser(tokens.access_token);

		// Check guild membership and roles via bot
		const guildMember = await getGuildMember(discordUser.id);

		if (!guildMember) {
			return NextResponse.redirect(`${baseUrl}/?error=not_member`);
		}

		// Check required role
		if (requiredRoleId && !guildMember.roles.includes(requiredRoleId)) {
			return NextResponse.redirect(`${baseUrl}/?error=missing_role`);
		}

		const payload = await getPayloadClient();

		// Find or create user
		const existingUsers = await payload.find({
			collection: 'users',
			where: {
				discordId: { equals: discordUser.id },
			},
			limit: 1,
		});

		const avatarUrl = getDiscordAvatarUrl(discordUser);
		const displayName = discordUser.global_name || discordUser.username;

		let user;
		if (existingUsers.docs.length > 0) {
			user = await payload.update({
				collection: 'users',
				id: existingUsers.docs[0].id,
				data: {
					discordUsername: discordUser.username,
					discordAvatar: avatarUrl,
					discordRoles: guildMember.roles,
					isGuildMember: true,
					name: displayName,
				},
			});
		} else {
			const randomPassword = crypto.randomBytes(32).toString('hex');
			user = await payload.create({
				collection: 'users',
				data: {
					email: `${discordUser.id}@discord.placeholder`,
					password: randomPassword,
					name: displayName,
					role: 'user',
					discordId: discordUser.id,
					discordUsername: discordUser.username,
					discordAvatar: avatarUrl,
					discordRoles: guildMember.roles,
					isGuildMember: true,
				},
			});
		}

		const sessionToken = signSession({
			userId: user.id,
			discordId: discordUser.id,
			discordUsername: discordUser.username,
			discordAvatar: avatarUrl,
			roles: guildMember.roles,
		});

		const response = NextResponse.redirect(`${baseUrl}/roleplay`);

		response.cookies.set('roleplay-session', sessionToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7, // 7 days
			path: '/',
		});

		return response;
	} catch (error) {
		console.error('Discord OAuth error:', error);
		return NextResponse.redirect(`${baseUrl}/?error=auth_failed`);
	}
}
