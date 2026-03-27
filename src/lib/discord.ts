const DISCORD_API = 'https://discord.com/api/v10';

export interface DiscordUser {
	id: string;
	username: string;
	avatar: string | null;
	discriminator: string;
	global_name: string | null;
	email?: string;
}

export interface DiscordGuildMember {
	user?: DiscordUser;
	nick: string | null;
	roles: string[];
	joined_at: string;
}

export function getDiscordAvatarUrl(user: DiscordUser): string {
	if (user.avatar) {
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
	}
	const defaultIndex = Number(BigInt(user.id) >> BigInt(22)) % 6;
	return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

export async function getDiscordTokens(code: string, redirectUri: string) {
	const response = await fetch(`${DISCORD_API}/oauth2/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: process.env.DISCORD_CLIENT_ID!,
			client_secret: process.env.DISCORD_CLIENT_SECRET!,
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
		}),
	});

	if (!response.ok) {
		throw new Error(`Discord token exchange failed: ${response.status}`);
	}

	return response.json() as Promise<{
		access_token: string;
		token_type: string;
		expires_in: number;
		refresh_token: string;
		scope: string;
	}>;
}

export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
	const response = await fetch(`${DISCORD_API}/users/@me`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (!response.ok) {
		throw new Error(`Discord user fetch failed: ${response.status}`);
	}

	return response.json() as Promise<DiscordUser>;
}

export async function getGuildMember(userId: string): Promise<DiscordGuildMember | null> {
	const guildId = process.env.DISCORD_GUILD_ID;
	const botToken = process.env.DISCORD_BOT_TOKEN;

	if (!guildId || !botToken) return null;

	const response = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
		headers: { Authorization: `Bot ${botToken}` },
	});

	if (!response.ok) return null;

	return response.json() as Promise<DiscordGuildMember>;
}

export async function getGuildRoles(): Promise<Array<{ id: string; name: string; color: number; position: number }>> {
	const guildId = process.env.DISCORD_GUILD_ID;
	const botToken = process.env.DISCORD_BOT_TOKEN;

	if (!guildId || !botToken) return [];

	const response = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
		headers: { Authorization: `Bot ${botToken}` },
	});

	if (!response.ok) return [];

	return response.json();
}
