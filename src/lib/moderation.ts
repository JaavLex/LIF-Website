import { getPayloadClient } from './payload';
import type { Roleplay } from '@/payload-types';

const DISCORD_API = 'https://discord.com/api/v10';

// Warn escalation: warn number → resulting sanction
export const WARN_ESCALATION: Record<
	number,
	{ action: string; duration: number | null; label: string }
> = {
	1: { action: 'warn', duration: null, label: 'Avertissement' },
	2: { action: 'kick', duration: null, label: 'Expulsion automatique' },
	3: { action: 'temp-ban', duration: 86400, label: 'Bannissement 24h' },
	4: { action: 'temp-ban', duration: 259200, label: 'Bannissement 3 jours' },
	5: { action: 'temp-ban', duration: 604800, label: 'Bannissement 7 jours' },
	6: { action: 'temp-ban', duration: 1209600, label: 'Bannissement 14 jours' },
	7: { action: 'perm-ban', duration: null, label: 'Bannissement définitif' },
};

export function getNextSanctionInfo(currentWarnCount: number): {
	action: string;
	duration: number | null;
	label: string;
} {
	const next = currentWarnCount + 1;
	if (next >= 7) return WARN_ESCALATION[7];
	return WARN_ESCALATION[next] || WARN_ESCALATION[7];
}

// Re-export from constants for backwards compatibility
import { formatDurationLong } from './constants';
export { formatDurationLong as formatDuration } from './constants';
const formatDuration = formatDurationLong;

export async function getWarnCount(discordId: string): Promise<number> {
	const payload = await getPayloadClient();
	const result = await payload.find({
		collection: 'moderation-sanctions',
		where: {
			targetDiscordId: { equals: discordId },
			type: { equals: 'warn' },
		},
		limit: 0,
	});
	return result.totalDocs;
}

export async function getModerationLogChannelId(): Promise<string | null> {
	try {
		const payload = await getPayloadClient();
		const config = await payload.findGlobal({ slug: 'roleplay' }) as Roleplay;
		return config?.moderationLogChannelId || null;
	} catch {
		return null;
	}
}

interface ModerationLogEmbed {
	title: string;
	description?: string;
	color?: number;
	fields?: { name: string; value: string; inline?: boolean }[];
	timestamp?: string;
}

export async function sendModerationLog(embed: ModerationLogEmbed) {
	const channelId = await getModerationLogChannelId();
	if (!channelId) return;

	const botToken = process.env.DISCORD_BOT_TOKEN;
	if (!botToken) return;

	try {
		await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bot ${botToken}`,
			},
			body: JSON.stringify({ embeds: [embed] }),
		});
	} catch (err) {
		console.error('Failed to send moderation log:', err);
	}
}

export async function discordWarnUser(
	userId: string,
	reason: string,
	warnNumber: number,
): Promise<{ success: boolean; error?: string }> {
	// Warns are tracked on the website only. Send DM to user.
	try {
		await sendDiscordDM(
			userId,
			`⚠️ **Avertissement** (${warnNumber}/7)\n\n**Raison :** ${reason}\n\nVous avez reçu un avertissement sur le serveur LIF.`,
		);
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err.message || 'Échec envoi DM' };
	}
}

export async function discordKickUser(
	userId: string,
	reason: string,
): Promise<{ success: boolean; error?: string }> {
	const botToken = process.env.DISCORD_BOT_TOKEN;
	const guildId = process.env.DISCORD_GUILD_ID;
	if (!botToken || !guildId) return { success: false, error: 'Bot non configuré' };

	try {
		// Send DM first (before kick, since they leave the server)
		await sendDiscordDM(
			userId,
			`👢 **Expulsion**\n\n**Raison :** ${reason}\n\nVous avez été expulsé du serveur LIF.`,
		).catch(() => {});

		const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bot ${botToken}`,
				'X-Audit-Log-Reason': encodeURIComponent(reason),
			},
		});

		if (!res.ok && res.status !== 404) {
			const text = await res.text();
			return { success: false, error: `Discord API ${res.status}: ${text}` };
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

export async function discordBanUser(
	userId: string,
	reason: string,
	durationSeconds: number | null,
): Promise<{ success: boolean; error?: string }> {
	const botToken = process.env.DISCORD_BOT_TOKEN;
	const guildId = process.env.DISCORD_GUILD_ID;
	if (!botToken || !guildId) return { success: false, error: 'Bot non configuré' };

	try {
		const durationText = durationSeconds
			? formatDuration(durationSeconds)
			: 'définitif';
		await sendDiscordDM(
			userId,
			`🔨 **Bannissement ${durationText}**\n\n**Raison :** ${reason}\n\nVous avez été banni du serveur LIF.`,
		).catch(() => {});

		const body: any = { delete_message_seconds: 0 };

		const res = await fetch(`${DISCORD_API}/guilds/${guildId}/bans/${userId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bot ${botToken}`,
				'X-Audit-Log-Reason': encodeURIComponent(reason),
			},
			body: JSON.stringify(body),
		});

		if (!res.ok && res.status !== 204) {
			const text = await res.text();
			return { success: false, error: `Discord API ${res.status}: ${text}` };
		}

		// For temp bans, we'd need a scheduler. For now, log that it needs manual unban.
		// A proper implementation would use a cron job or Discord's built-in timeout for short durations.

		return { success: true };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

export async function discordUnbanUser(
	userId: string,
	reason: string,
): Promise<{ success: boolean; error?: string }> {
	const botToken = process.env.DISCORD_BOT_TOKEN;
	const guildId = process.env.DISCORD_GUILD_ID;
	if (!botToken || !guildId) return { success: false, error: 'Bot non configuré' };

	try {
		const res = await fetch(`${DISCORD_API}/guilds/${guildId}/bans/${userId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bot ${botToken}`,
				'X-Audit-Log-Reason': encodeURIComponent(reason),
			},
		});

		if (!res.ok && res.status !== 404) {
			const text = await res.text();
			return { success: false, error: `Discord API ${res.status}: ${text}` };
		}
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
}

async function sendDiscordDM(userId: string, content: string): Promise<void> {
	const botToken = process.env.DISCORD_BOT_TOKEN;
	if (!botToken) throw new Error('Bot non configuré');

	// Create DM channel
	const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${botToken}`,
		},
		body: JSON.stringify({ recipient_id: userId }),
	});

	if (!dmRes.ok) throw new Error('Impossible de créer le canal DM');
	const dm = await dmRes.json();

	// Send message
	const msgRes = await fetch(`${DISCORD_API}/channels/${dm.id}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${botToken}`,
		},
		body: JSON.stringify({ content }),
	});

	if (!msgRes.ok) throw new Error("Impossible d'envoyer le DM");
}

export async function fetchGuildMembers(limit = 1000): Promise<any[]> {
	const botToken = process.env.DISCORD_BOT_TOKEN;
	const guildId = process.env.DISCORD_GUILD_ID;
	if (!botToken || !guildId) return [];

	const allMembers: any[] = [];
	let after = '0';

	while (allMembers.length < limit) {
		const res = await fetch(
			`${DISCORD_API}/guilds/${guildId}/members?limit=1000&after=${after}`,
			{ headers: { Authorization: `Bot ${botToken}` } },
		);
		if (!res.ok) break;
		const members: any[] = await res.json();
		if (members.length === 0) break;
		allMembers.push(...members);
		after = members[members.length - 1].user.id;
		if (members.length < 1000) break;
	}

	return allMembers;
}
