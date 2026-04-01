import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { getPayloadClient } from '@/lib/payload';

const DISCORD_API = 'https://discord.com/api/v10';

async function fetchMember(discordId: string): Promise<any | null> {
	const botToken = process.env.DISCORD_BOT_TOKEN;
	const guildId = process.env.DISCORD_GUILD_ID;
	if (!botToken || !guildId) return null;
	try {
		const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordId}`, {
			headers: { Authorization: `Bot ${botToken}` },
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

async function searchMembers(query: string): Promise<any[]> {
	const botToken = process.env.DISCORD_BOT_TOKEN;
	const guildId = process.env.DISCORD_GUILD_ID;
	if (!botToken || !guildId) return [];
	try {
		const res = await fetch(
			`${DISCORD_API}/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=20`,
			{ headers: { Authorization: `Bot ${botToken}` } },
		);
		if (!res.ok) return [];
		return await res.json();
	} catch {
		return [];
	}
}

export async function GET(request: Request) {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

	const perms = await checkAdminPermissions(session);
	if (!perms.isAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

	const url = new URL(request.url);
	const searchQuery = url.searchParams.get('search') || '';

	try {
		const payload = await getPayloadClient();

		// If search query provided, search Discord directly
		if (searchQuery.length >= 2) {
			const members = await searchMembers(searchQuery);

			// Get existing data for found members
			const discordIds = members.map((m: any) => m.user.id);

			const [cases, sanctions, characters] = await Promise.all([
				payload.find({ collection: 'moderation-cases', where: { targetDiscordId: { in: discordIds } }, limit: 10000, depth: 0 }),
				payload.find({ collection: 'moderation-sanctions', where: { targetDiscordId: { in: discordIds }, type: { equals: 'warn' } }, limit: 10000, depth: 0 }),
				payload.find({ collection: 'characters', where: { discordId: { in: discordIds } }, limit: 10000, depth: 1 }),
			]);

			const { warnMap, caseMap, charMap } = buildMaps(cases.docs, sanctions.docs, characters.docs);

			const users = members.map((m: any) => memberToUser(m, warnMap, caseMap, charMap));
			users.sort((a: any, b: any) => (a.serverNick || a.globalName).localeCompare(b.serverNick || b.globalName));

			return NextResponse.json({ users, source: 'search' });
		}

		// Default: get known users from DB (characters + cases + sanctions)
		const [cases, sanctions, characters] = await Promise.all([
			payload.find({ collection: 'moderation-cases', limit: 10000, depth: 0 }),
			payload.find({ collection: 'moderation-sanctions', where: { type: { equals: 'warn' } }, limit: 10000, depth: 0 }),
			payload.find({ collection: 'characters', limit: 10000, depth: 1 }),
		]);

		const { warnMap, caseMap, charMap } = buildMaps(cases.docs, sanctions.docs, characters.docs);

		// Collect all unique Discord IDs from DB
		const knownIds = new Set<string>();
		for (const c of cases.docs) { const id = (c as any).targetDiscordId; if (id) knownIds.add(id); }
		for (const s of sanctions.docs) { const id = (s as any).targetDiscordId; if (id) knownIds.add(id); }
		for (const ch of characters.docs) { const id = (ch as any).discordId; if (id) knownIds.add(id); }

		// Fetch member info for each known ID (in parallel batches)
		const ids = Array.from(knownIds);
		const memberResults = await Promise.all(ids.map((id) => fetchMember(id)));

		const users: any[] = [];
		for (let i = 0; i < ids.length; i++) {
			const member = memberResults[i];
			if (!member) {
				// Member left the server — still show with basic info from DB
				const discordId = ids[i];
				const caseData = caseMap[discordId] || [];
				const caseName = caseData.length > 0 ? (cases.docs.find((c: any) => c.targetDiscordId === discordId) as any)?.targetDiscordUsername : null;
				users.push({
					discordId,
					discordUsername: caseName || discordId,
					globalName: caseName || discordId,
					serverNick: null,
					avatar: `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordId) >> BigInt(22)) % 6}.png`,
					joinedAt: null,
					roles: [],
					warnCount: warnMap[discordId] || 0,
					cases: caseMap[discordId] || [],
					characters: charMap[discordId] || [],
					leftServer: true,
				});
			} else {
				users.push(memberToUser(member, warnMap, caseMap, charMap));
			}
		}

		users.sort((a: any, b: any) => (a.serverNick || a.globalName).localeCompare(b.serverNick || b.globalName));
		return NextResponse.json({ users, source: 'known' });
	} catch (err: any) {
		console.error('Error fetching moderation users:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

function buildMaps(caseDocs: any[], sanctionDocs: any[], charDocs: any[]) {
	const warnMap: Record<string, number> = {};
	for (const s of sanctionDocs) {
		const id = (s as any).targetDiscordId;
		warnMap[id] = (warnMap[id] || 0) + 1;
	}

	const caseMap: Record<string, { id: number; status: string; caseNumber: number }[]> = {};
	for (const c of caseDocs) {
		const id = (c as any).targetDiscordId;
		if (!caseMap[id]) caseMap[id] = [];
		caseMap[id].push({ id: c.id as number, status: (c as any).status, caseNumber: (c as any).caseNumber });
	}

	const charMap: Record<string, any[]> = {};
	for (const ch of charDocs) {
		const id = (ch as any).discordId;
		if (!id) continue;
		if (!charMap[id]) charMap[id] = [];
		charMap[id].push({ id: ch.id, fullName: (ch as any).fullName, status: (ch as any).status, isMainCharacter: (ch as any).isMainCharacter });
	}

	return { warnMap, caseMap, charMap };
}

function memberToUser(m: any, warnMap: Record<string, number>, caseMap: Record<string, any[]>, charMap: Record<string, any[]>) {
	const discordId = m.user.id;
	const avatar = m.user.avatar
		? `https://cdn.discordapp.com/avatars/${discordId}/${m.user.avatar}.png?size=128`
		: `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordId) >> BigInt(22)) % 6}.png`;

	return {
		discordId,
		discordUsername: m.user.username,
		globalName: m.user.global_name || m.user.username,
		serverNick: m.nick,
		avatar,
		joinedAt: m.joined_at,
		roles: m.roles,
		warnCount: warnMap[discordId] || 0,
		cases: caseMap[discordId] || [],
		characters: charMap[discordId] || [],
	};
}
