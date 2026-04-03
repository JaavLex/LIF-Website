import { NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/lib/api-auth';

const DISCORD_API = 'https://discord.com/api/v10';
const TRANSCRIPT_CHANNEL_ID = process.env.DISCORD_TRANSCRIPT_CHANNEL_ID || '';

interface TranscriptInfo {
	messageId: string;
	ticketOwner: string;
	ticketOwnerAvatar: string;
	ticketName: string;
	panelName: string;
	participants: { count: number; name: string }[];
	transcriptUrl: string;
	downloadUrl: string;
	filename: string;
	size: number;
	timestamp: string;
}

function getEmbedField(embed: any, name: string): string {
	const field = embed.fields?.find((f: any) => f.name === name);
	return field?.value || '';
}

function parseParticipants(value: string): { count: number; name: string }[] {
	if (!value) return [];
	return value
		.split('\n')
		.map(line => {
			const trimmed = line.trim();
			// Format: "9 - <@id> - username#0"
			const match = trimmed.match(/^(\d+)\s*-\s*(?:<@!?\d+>\s*-\s*)?(.+)$/);
			if (match) {
				return { count: parseInt(match[1], 10), name: match[2].trim() };
			}
			return { count: 0, name: trimmed };
		})
		.filter(p => p.name);
}

function getTranscriptUrl(msg: any): string {
	// Look for the link button (style 5) in components
	for (const row of msg.components || []) {
		for (const comp of row.components || []) {
			if (comp.style === 5 && comp.url) {
				return comp.url;
			}
		}
	}
	return '';
}

async function fetchAllMessages(botToken: string): Promise<TranscriptInfo[]> {
	const transcripts: TranscriptInfo[] = [];
	let lastMessageId: string | undefined;
	let hasMore = true;

	while (hasMore) {
		const params = new URLSearchParams({ limit: '100' });
		if (lastMessageId) params.set('before', lastMessageId);

		const response = await fetch(
			`${DISCORD_API}/channels/${TRANSCRIPT_CHANNEL_ID}/messages?${params}`,
			{ headers: { Authorization: `Bot ${botToken}` } },
		);

		if (!response.ok) {
			console.error('Discord API error:', response.status, await response.text());
			break;
		}

		const messages: any[] = await response.json();
		if (messages.length === 0) {
			hasMore = false;
			break;
		}

		for (const msg of messages) {
			const embed = msg.embeds?.[0];
			if (!embed) continue;

			const ticketOwner = embed.author?.name || '';
			const ticketOwnerAvatar = embed.author?.icon_url || '';
			const ticketName = getEmbedField(embed, 'Ticket Name');
			const panelName = getEmbedField(embed, 'Panel Name');
			const participantsRaw = getEmbedField(embed, 'Users in transcript');
			const participants = parseParticipants(participantsRaw);

			const transcriptUrl = getTranscriptUrl(msg);
			const attachment = msg.attachments?.find((a: any) =>
				a.filename?.toLowerCase().endsWith('.html'),
			);

			transcripts.push({
				messageId: msg.id,
				ticketOwner,
				ticketOwnerAvatar,
				ticketName: ticketName || attachment?.filename || '',
				panelName,
				participants,
				transcriptUrl,
				downloadUrl: attachment?.url || '',
				filename: attachment?.filename || '',
				size: attachment?.size || 0,
				timestamp: msg.timestamp,
			});
		}

		lastMessageId = messages[messages.length - 1].id;

		if (messages.length < 100) {
			hasMore = false;
		}
	}

	return transcripts;
}

export async function GET() {
	const auth = await requireAdmin();
	if (isErrorResponse(auth)) return auth;

	const botToken = process.env.DISCORD_BOT_TOKEN;
	if (!botToken || !TRANSCRIPT_CHANNEL_ID) {
		return NextResponse.json({ error: 'Transcripts non configurés' }, { status: 500 });
	}

	try {
		const transcripts = await fetchAllMessages(botToken);

		// Sort by timestamp descending
		transcripts.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);

		return NextResponse.json({ transcripts });
	} catch (error) {
		console.error('Error fetching transcripts:', error);
		return NextResponse.json(
			{ error: 'Erreur lors de la récupération des transcripts' },
			{ status: 500 },
		);
	}
}
