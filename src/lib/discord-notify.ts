import { getPayloadClient } from './payload';

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
		const config = await payload.findGlobal({ slug: 'roleplay' });
		return (config as any)?.notificationChannelId || null;
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

const SITE_URL =
	process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://lif-arma.com';

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
	postedBy?: { fullName?: string } | null;
}) {
	const channelId = await getNotificationChannelId();
	if (!channelId) return;

	const TYPE_LABELS: Record<string, string> = {
		observation: 'Observation',
		interception: 'Interception',
		reconnaissance: 'Reconnaissance',
		infiltration: 'Infiltration',
		sigint: 'SIGINT',
		humint: 'HUMINT',
		other: 'Autre',
	};

	const postedByName = report.postedBy?.fullName || '—';
	const typeName = TYPE_LABELS[report.type] || report.type;

	await sendToChannel(channelId, [
		{
			title: `🔍 Nouveau rapport de renseignement`,
			description: `**${report.title}**`,
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

const STATUS_LABELS: Record<string, string> = {
	'in-service': 'En service',
	kia: 'Tué au combat (KIA)',
	mia: 'Porté disparu (MIA)',
	retired: 'Retraité',
	'honourable-discharge': 'Décharge honorable',
	'dishonourable-discharge': 'Décharge déshonorante',
	executed: 'Exécuté',
};

export async function notifyStatusChange(character: {
	id: number;
	fullName: string;
	oldStatus: string;
	newStatus: string;
}) {
	const channelId = await getNotificationChannelId();
	if (!channelId) return;

	const oldLabel = STATUS_LABELS[character.oldStatus] || character.oldStatus;
	const newLabel = STATUS_LABELS[character.newStatus] || character.newStatus;

	const STATUS_COLORS: Record<string, number> = {
		'in-service': 0x4a7c23,
		kia: 0x8b0000,
		mia: 0xb8860b,
		retired: 0x4682b4,
		executed: 0x2f0000,
	};

	await sendToChannel(channelId, [
		{
			title: `⚡ Changement de statut`,
			description: `**${character.fullName}**\n\n${oldLabel} → **${newLabel}**\n\n[Voir le dossier](${SITE_URL}/roleplay/personnage/${character.id})`,
			color: STATUS_COLORS[character.newStatus] || 0x808080,
			timestamp: new Date().toISOString(),
		},
	]);
}

const TIMELINE_TYPE_LABELS: Record<string, string> = {
	promotion: 'Promotion',
	mutation: 'Mutation',
	blessure: 'Blessure',
	medaille: 'Médaille',
	sanction: 'Sanction',
	autre: 'Autre',
};

const TIMELINE_EMOJIS: Record<string, string> = {
	promotion: '⬆️',
	mutation: '🔄',
	blessure: '🩹',
	medaille: '🎖️',
	sanction: '⚠️',
	autre: '📝',
};

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
