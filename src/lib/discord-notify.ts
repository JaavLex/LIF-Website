import { getPayloadClient } from './payload';
import type { Roleplay } from '@/payload-types';
import {
	CHARACTER_STATUS_LABELS,
	CHARACTER_STATUS_EMBED_COLORS,
	INTELLIGENCE_TYPE_LABELS,
	TIMELINE_TYPE_LABELS,
	TIMELINE_EMOJIS,
	PUBLIC_BASE_URL,
} from './constants';

const DISCORD_API = 'https://discord.com/api/v10';

interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

interface DiscordEmbed {
	title: string;
	description?: string;
	color?: number;
	fields?: EmbedField[];
	timestamp?: string;
	url?: string;
}

async function getNotificationChannelId(): Promise<string | null> {
	try {
		const payload = await getPayloadClient();
		const config = await payload.findGlobal({ slug: 'roleplay' }) as Roleplay;
		return config?.notificationChannelId || null;
	} catch {
		return null;
	}
}

async function sendToChannel(channelId: string, embeds: DiscordEmbed[]) {
	const botToken = process.env.DISCORD_BOT_TOKEN;
	if (!botToken) return;

	await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bot ${botToken}`,
		},
		body: JSON.stringify({ embeds }),
	});
}

// Alias kept to minimize diff noise on the notification builders below.
// See PUBLIC_BASE_URL in constants.ts for the resolution rules — most
// importantly, it MUST NOT fall back to process.env.SITE_URL, which is
// http://127.0.0.1:3001 in production.
const SITE_URL = PUBLIC_BASE_URL;

export async function notifyNewCharacter(character: {
	id: number;
	fullName: string;
	discordUsername?: string;
	rank?: { name?: string; abbreviation?: string } | null;
	unit?: { name?: string } | null;
}) {
	const channelId = await getNotificationChannelId();
	if (!channelId) return;

	const rank = character.rank
		? character.rank.abbreviation || character.rank.name
		: null;
	const fields: EmbedField[] = [];
	if (rank) fields.push({ name: 'Grade', value: rank, inline: true });
	if (character.unit?.name)
		fields.push({ name: 'Unité', value: character.unit.name, inline: true });
	if (character.discordUsername)
		fields.push({ name: 'Discord', value: character.discordUsername, inline: true });

	await sendToChannel(channelId, [
		{
			title: `📋 Nouvelle fiche de personnage`,
			description: `**${rank ? `${rank} ` : ''}${character.fullName}**\n\n[Voir le dossier](${SITE_URL}/roleplay/personnage/${character.id})`,
			color: 0x4a7c23,
			fields,
			timestamp: new Date().toISOString(),
		},
	]);
}

export async function notifyNewIntelligence(report: {
	id: number;
	title: string;
	type: string;
	classification: string;
	postedBy?: { fullName?: string | null } | null;
}) {
	const channelId = await getNotificationChannelId();
	if (!channelId) return;

	const postedByName = report.postedBy?.fullName || '—';
	const typeName = INTELLIGENCE_TYPE_LABELS[report.type] || report.type;

	await sendToChannel(channelId, [
		{
			title: `🔍 Nouveau rapport de renseignement`,
			description: `**${report.title}**\n\n[Voir le rapport](${SITE_URL}/roleplay/renseignement/${report.id})`,
			color: 0x8b4513,
			fields: [
				{ name: 'Type', value: typeName, inline: true },
				{ name: 'Classification', value: report.classification, inline: true },
				{ name: 'Rapporté par', value: postedByName, inline: true },
			],
			timestamp: new Date().toISOString(),
		},
	]);
}

export async function notifyStatusChange(character: {
	id: number;
	fullName: string;
	oldStatus: string;
	newStatus: string;
}) {
	const channelId = await getNotificationChannelId();
	if (!channelId) return;

	const oldLabel = CHARACTER_STATUS_LABELS[character.oldStatus] || character.oldStatus;
	const newLabel = CHARACTER_STATUS_LABELS[character.newStatus] || character.newStatus;

	await sendToChannel(channelId, [
		{
			title: `⚡ Changement de statut`,
			description: `**${character.fullName}**\n\n${oldLabel} → **${newLabel}**\n\n[Voir le dossier](${SITE_URL}/roleplay/personnage/${character.id})`,
			color: CHARACTER_STATUS_EMBED_COLORS[character.newStatus] || 0x808080,
			timestamp: new Date().toISOString(),
		},
	]);
}

export async function notifyTimelineEvent(event: {
	characterId: number;
	characterName: string;
	type: string;
	title: string;
	date: string;
}) {
	const channelId = await getNotificationChannelId();
	if (!channelId) return;

	const typeLabel = TIMELINE_TYPE_LABELS[event.type] || event.type;
	const emoji = TIMELINE_EMOJIS[event.type] || '📝';

	await sendToChannel(channelId, [
		{
			title: `${emoji} Événement : ${typeLabel}`,
			description: `**${event.characterName}**\n\n${event.title}\n\n[Voir le dossier](${SITE_URL}/roleplay/personnage/${event.characterId})`,
			color: 0x5865f2,
			fields: [
				{ name: 'Date', value: event.date, inline: true },
				{ name: 'Type', value: typeLabel, inline: true },
			],
			timestamp: new Date().toISOString(),
		},
	]);
}
