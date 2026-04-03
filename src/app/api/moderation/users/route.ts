import { NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';
import { getGuildRoles } from '@/lib/discord';
import type { Character, ModerationCase, ModerationSanction, Roleplay } from '@/payload-types';

const DISCORD_API = 'https://discord.com/api/v10';

async function fetchAllMembers(): Promise<any[]> {
	const botToken = process.env.DISCORD_BOT_TOKEN;
	const guildId = process.env.DISCORD_GUILD_ID;
	if (!botToken || !guildId) return [];
	const all: any[] = [];
	let after = '0';
	try {
		while (true) {
			const res = await fetch(
				`${DISCORD_API}/guilds/${guildId}/members?limit=1000&after=${after}`,
				{ headers: { Authorization: `Bot ${botToken}` } },
			);
			if (!res.ok) break;
			const batch = await res.json();
			if (!Array.isArray(batch) || batch.length === 0) break;
			all.push(...batch);
			if (batch.length < 1000) break;
			after = batch[batch.length - 1].user.id;
		}
	} catch {}
	return all;
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
	const auth = await requireAdmin();
	if (isErrorResponse(auth)) return auth;

	const url = new URL(request.url);
	const searchQuery = url.searchParams.get('search') || '';

	try {
		const payload = await getPayloadClient();

		// Fetch guild roles and admin config in parallel
		const [guildRoles, roleplayConfig] = await Promise.all([
			getGuildRoles(),
			payload.findGlobal({ slug: 'roleplay' }).catch(() => null) as Promise<Roleplay | null>,
		]);

		const adminRoleIds = new Set<string>(
			(roleplayConfig?.adminRoles || []).map((r) => r.roleId),
		);

		// Build a compact role map: id -> { name, color, position }
		const guildRoleMap = guildRoles
			.filter(r => r.name !== '@everyone')
			.sort((a, b) => b.position - a.position)
			.map(r => ({
				id: r.id,
				name: r.name,
				color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#99aab5',
			}));

		// If search query provided, search Discord directly
		if (searchQuery.length >= 2) {
			const members = await searchMembers(searchQuery);

			// Get existing data for found members
			const discordIds = members.map((m: any) => m.user.id);

			const [cases, sanctions, characters] = await Promise.all([
				payload.find({
					collection: 'moderation-cases',
					where: { targetDiscordId: { in: discordIds } },
					limit: 10000,
					depth: 0,
				}),
				payload.find({
					collection: 'moderation-sanctions',
					where: { targetDiscordId: { in: discordIds }, type: { equals: 'warn' } },
					limit: 10000,
					depth: 0,
				}),
				payload.find({
					collection: 'characters',
					where: { discordId: { in: discordIds } },
					limit: 10000,
					depth: 1,
				}),
			]);

			const { warnMap, caseMap, charMap } = buildMaps(
				cases.docs,
				sanctions.docs,
				characters.docs,
			);

			const users = members.map((m: any) =>
				memberToUser(m, warnMap, caseMap, charMap),
			);
			users.sort((a: any, b: any) =>
				(a.serverNick || a.globalName).localeCompare(b.serverNick || b.globalName),
			);

			return NextResponse.json({
				users,
				source: 'search',
				guildRoles: guildRoleMap,
				adminRoleIds: Array.from(adminRoleIds),
			});
		}

		// Default: fetch ALL guild members
		const [cases, sanctions, characters, allMembers] = await Promise.all([
			payload.find({ collection: 'moderation-cases', limit: 10000, depth: 0 }),
			payload.find({
				collection: 'moderation-sanctions',
				where: { type: { equals: 'warn' } },
				limit: 10000,
				depth: 0,
			}),
			payload.find({ collection: 'characters', limit: 10000, depth: 1 }),
			fetchAllMembers(),
		]);

		const { warnMap, caseMap, charMap } = buildMaps(
			cases.docs,
			sanctions.docs,
			characters.docs,
		);

		// Build set of member IDs we got from Discord
		const memberIds = new Set(allMembers.map((m: any) => m.user.id));

		// Also find DB-only users who left the server
		const knownIds = new Set<string>();
		for (const c of cases.docs) {
			if (c.targetDiscordId) knownIds.add(c.targetDiscordId);
		}
		for (const s of sanctions.docs) {
			if (s.targetDiscordId) knownIds.add(s.targetDiscordId);
		}
		for (const ch of characters.docs) {
			if (ch.discordId) knownIds.add(ch.discordId);
		}

		const users: any[] = allMembers.map((m: any) =>
			memberToUser(m, warnMap, caseMap, charMap),
		);

		// Add users who left the server but have DB records
		for (const discordId of knownIds) {
			if (memberIds.has(discordId)) continue;
			const caseData = caseMap[discordId] || [];
			const caseName =
				caseData.length > 0
					? cases.docs.find(c => c.targetDiscordId === discordId)
							?.targetDiscordUsername
					: null;
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
		}

		users.sort((a: any, b: any) =>
			(a.serverNick || a.globalName).localeCompare(b.serverNick || b.globalName),
		);
		return NextResponse.json({
			users,
			source: 'known',
			guildRoles: guildRoleMap,
			adminRoleIds: Array.from(adminRoleIds),
		});
	} catch (err: any) {
		console.error('Error fetching moderation users:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

function buildMaps(caseDocs: ModerationCase[], sanctionDocs: ModerationSanction[], charDocs: Character[]) {
	const warnMap: Record<string, number> = {};
	for (const s of sanctionDocs) {
		warnMap[s.targetDiscordId] = (warnMap[s.targetDiscordId] || 0) + 1;
	}

	const caseMap: Record<
		string,
		{ id: number; status: string; caseNumber: number }[]
	> = {};
	for (const c of caseDocs) {
		if (!caseMap[c.targetDiscordId]) caseMap[c.targetDiscordId] = [];
		caseMap[c.targetDiscordId].push({
			id: c.id,
			status: c.status,
			caseNumber: c.caseNumber ?? 0,
		});
	}

	const charMap: Record<string, { id: number; fullName: string | null | undefined; status: string; isMainCharacter: boolean | null | undefined }[]> = {};
	for (const ch of charDocs) {
		if (!ch.discordId) continue;
		if (!charMap[ch.discordId]) charMap[ch.discordId] = [];
		charMap[ch.discordId].push({
			id: ch.id,
			fullName: ch.fullName,
			status: ch.status,
			isMainCharacter: ch.isMainCharacter,
		});
	}

	return { warnMap, caseMap, charMap };
}

function memberToUser(
	m: any,
	warnMap: Record<string, number>,
	caseMap: Record<string, any[]>,
	charMap: Record<string, any[]>,
) {
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
