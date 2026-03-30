import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

const DISCORD_API = 'https://discord.com/api/v10';
const TRANSCRIPT_CHANNEL_ID = '1435918189589696644';

interface TranscriptInfo {
	messageId: string;
	filename: string;
	url: string;
	size: number;
	timestamp: string;
	ticketOwner: string;
	participants: string[];
}

function extractTicketOwner(filename: string): string {
	// Typical Ticket Tool filenames: transcript-entree-en-service-username.html
	// or transcript-ticket-0001-username.html
	const name = filename.replace(/\.html$/i, '');
	const parts = name.split('-');
	// The last meaningful part is often the username
	if (parts.length > 1) {
		return parts[parts.length - 1];
	}
	return name;
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
			if (msg.attachments?.length) {
				for (const att of msg.attachments) {
					if (att.filename?.toLowerCase().endsWith('.html')) {
						transcripts.push({
							messageId: msg.id,
							filename: att.filename,
							url: att.url,
							size: att.size || 0,
							timestamp: msg.timestamp,
							ticketOwner: extractTicketOwner(att.filename),
							participants: [],
						});
					}
				}
			}
		}

		lastMessageId = messages[messages.length - 1].id;

		// Discord rate limit safety
		if (messages.length < 100) {
			hasMore = false;
		}
	}

	return transcripts;
}

async function parseTranscriptParticipants(url: string): Promise<{ owner: string; participants: string[] }> {
	try {
		const response = await fetch(url);
		if (!response.ok) return { owner: '', participants: [] };
		const html = await response.text();

		// Extract participants from Ticket Tool HTML transcripts
		// Common patterns: author names in spans, divs with author info
		const participants = new Set<string>();
		let owner = '';

		// Pattern: <span class="chatlog__author" ...>Username</span>
		const authorPattern = /class="chatlog__author[^"]*"[^>]*title="([^"]+)"/g;
		let match;
		while ((match = authorPattern.exec(html)) !== null) {
			participants.add(match[1]);
		}

		// Pattern: data-user-id with author name nearby
		const authorPattern2 = /class="chatlog__author-name"[^>]*>([^<]+)</g;
		while ((match = authorPattern2.exec(html)) !== null) {
			participants.add(match[1].trim());
		}

		// Try to find ticket owner from the HTML title or header
		const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
		if (titleMatch) {
			const titleParts = titleMatch[1].split(/[-–—]/);
			if (titleParts.length > 1) {
				owner = titleParts[titleParts.length - 1].trim();
			}
		}

		// Fallback: first participant is often the ticket creator (after the bot)
		const participantArr = Array.from(participants).filter(
			p => !p.toLowerCase().includes('ticket tool') && !p.toLowerCase().includes('bot'),
		);

		if (!owner && participantArr.length > 0) {
			owner = participantArr[0];
		}

		return { owner, participants: participantArr };
	} catch {
		return { owner: '', participants: [] };
	}
}

export async function GET() {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) {
		return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
	}

	const session = verifySession(token);
	if (!session) {
		return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
	}

	const adminPerms = await checkAdminPermissions(session);
	if (!adminPerms.isAdmin) {
		return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
	}

	const botToken = process.env.DISCORD_BOT_TOKEN;
	if (!botToken) {
		return NextResponse.json({ error: 'Bot token non configuré' }, { status: 500 });
	}

	try {
		const transcripts = await fetchAllMessages(botToken);

		// Parse participants for each transcript (in parallel, batched)
		const batchSize = 5;
		for (let i = 0; i < transcripts.length; i += batchSize) {
			const batch = transcripts.slice(i, i + batchSize);
			const results = await Promise.all(
				batch.map(t => parseTranscriptParticipants(t.url)),
			);
			for (let j = 0; j < batch.length; j++) {
				const { owner, participants } = results[j];
				if (owner) batch[j].ticketOwner = owner;
				batch[j].participants = participants;
			}
		}

		// Sort by timestamp descending
		transcripts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

		return NextResponse.json({ transcripts });
	} catch (error) {
		console.error('Error fetching transcripts:', error);
		return NextResponse.json({ error: 'Erreur lors de la récupération des transcripts' }, { status: 500 });
	}
}
