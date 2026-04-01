import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { fetchGuildMembers, getWarnCount } from '@/lib/moderation';
import { getPayloadClient } from '@/lib/payload';

export async function GET() {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

	const perms = await checkAdminPermissions(session);
	if (!perms.isAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

	try {
		const members = await fetchGuildMembers();

		// Get all moderation cases to link
		const payload = await getPayloadClient();
		const cases = await payload.find({
			collection: 'moderation-cases',
			limit: 10000,
			depth: 0,
		});

		// Get all sanctions (warns) grouped by user
		const sanctions = await payload.find({
			collection: 'moderation-sanctions',
			where: { type: { equals: 'warn' } },
			limit: 10000,
			depth: 0,
		});

		// Build warn count map
		const warnMap: Record<string, number> = {};
		for (const s of sanctions.docs) {
			const id = (s as any).targetDiscordId;
			warnMap[id] = (warnMap[id] || 0) + 1;
		}

		// Build case map (active cases per user)
		const caseMap: Record<string, { id: number; status: string; caseNumber: number }[]> = {};
		for (const c of cases.docs) {
			const id = (c as any).targetDiscordId;
			if (!caseMap[id]) caseMap[id] = [];
			caseMap[id].push({
				id: c.id as number,
				status: (c as any).status,
				caseNumber: (c as any).caseNumber,
			});
		}

		// Get characters
		const characters = await payload.find({
			collection: 'characters',
			limit: 10000,
			depth: 1,
		});
		const charMap: Record<string, any[]> = {};
		for (const ch of characters.docs) {
			const id = (ch as any).discordId;
			if (!id) continue;
			if (!charMap[id]) charMap[id] = [];
			charMap[id].push({
				id: ch.id,
				fullName: (ch as any).fullName,
				status: (ch as any).status,
				isMainCharacter: (ch as any).isMainCharacter,
			});
		}

		const users = members.map((m: any) => {
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
		});

		// Sort by server nick / global name
		users.sort((a: any, b: any) =>
			(a.serverNick || a.globalName).localeCompare(b.serverNick || b.globalName),
		);

		return NextResponse.json({ users });
	} catch (err: any) {
		console.error('Error fetching moderation users:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
