import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/lib/api-auth';
import { getPayloadClient } from '@/lib/payload';
import { sendModerationLog } from '@/lib/moderation';

// GET: list cases with optional filters
export async function GET(request: NextRequest) {
	const auth = await requireAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const { searchParams } = new URL(request.url);
	const status = searchParams.get('status');
	const targetDiscordId = searchParams.get('targetDiscordId');
	const moderator = searchParams.get('moderator');
	const page = parseInt(searchParams.get('page') || '1');
	const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

	const where: Record<string, any> = {};
	if (status) where.status = { equals: status };
	if (targetDiscordId) where.targetDiscordId = { equals: targetDiscordId };
	if (moderator) where.createdByDiscordId = { equals: moderator };

	try {
		const payload = await getPayloadClient();
		const result = await payload.find({
			collection: 'moderation-cases',
			where,
			sort: '-updatedAt',
			page,
			limit,
			depth: 0,
		});

		return NextResponse.json({
			cases: result.docs,
			totalDocs: result.totalDocs,
			totalPages: result.totalPages,
			page: result.page,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

// POST: create a new case (or reopen existing)
export async function POST(request: NextRequest) {
	const auth = await requireAdmin(request);
	if (isErrorResponse(auth)) return auth;
	const { session } = auth;

	try {
		const body = await request.json();
		const {
			targetDiscordId,
			targetDiscordUsername,
			targetServerUsername,
			targetDiscordAvatar,
			reason,
			reasonDetail,
		} = body;

		if (!targetDiscordId || !targetDiscordUsername || !reason) {
			return NextResponse.json(
				{ error: 'Champs requis manquants' },
				{ status: 400 },
			);
		}

		const payload = await getPayloadClient();

		// Check if target is an admin — cannot create cases on admins
		const targetUser = await payload.find({
			collection: 'users',
			where: { discordId: { equals: targetDiscordId } },
			limit: 1,
		});
		if (targetUser.docs[0]?.role === 'admin') {
			return NextResponse.json(
				{ error: 'Impossible de créer un dossier sur un administrateur' },
				{ status: 403 },
			);
		}

		// Also check Discord admin roles
		try {
			const roleplayConfig = await payload.findGlobal({ slug: 'roleplay' }) as any;
			const adminRoles = roleplayConfig?.adminRoles as { roleId: string }[] | undefined;
			if (adminRoles?.length) {
				const botToken = process.env.DISCORD_BOT_TOKEN;
				const guildId = process.env.DISCORD_GUILD_ID;
				if (botToken && guildId) {
					const memberRes = await fetch(
						`https://discord.com/api/v10/guilds/${guildId}/members/${targetDiscordId}`,
						{ headers: { Authorization: `Bot ${botToken}` } },
					);
					if (memberRes.ok) {
						const member = await memberRes.json();
						const targetRoles: string[] = member.roles || [];
						for (const role of adminRoles) {
							if (targetRoles.includes(role.roleId)) {
								return NextResponse.json(
									{ error: 'Impossible de créer un dossier sur un membre du staff' },
									{ status: 403 },
								);
							}
						}
					}
				}
			}
		} catch {
			// Config check failed, continue
		}

		// Check for existing case for this user
		const existing = await payload.find({
			collection: 'moderation-cases',
			where: { targetDiscordId: { equals: targetDiscordId } },
			sort: '-createdAt',
			limit: 1,
			depth: 0,
		});

		if (existing.docs.length > 0) {
			const existingCase = existing.docs[0];

			// If archived, reopen it
			if (existingCase.status === 'archived') {
				await payload.update({
					collection: 'moderation-cases',
					id: existingCase.id,
					data: { status: 'open' },
				});

				await payload.create({
					collection: 'moderation-events',
					data: {
						case: existingCase.id,
						type: 'case-reopened',
						content: `Dossier réouvert — Motif : ${reason}${reasonDetail ? ` — ${reasonDetail}` : ''}`,
						authorDiscordId: session.discordId,
						authorDiscordUsername: session.discordUsername,
						authorDiscordAvatar: session.discordAvatar,
					},
				});

				await sendModerationLog({
					title: '🔄 Dossier réouvert',
					description: `**Dossier #${existingCase.caseNumber}** pour **${targetDiscordUsername}** a été réouvert.`,
					color: 0xf0ad4e,
					fields: [
						{ name: 'Modérateur', value: session.discordUsername, inline: true },
						{ name: 'Motif', value: reason, inline: true },
					],
					timestamp: new Date().toISOString(),
				});

				return NextResponse.json({
					case: { ...existingCase, status: 'open' },
					reopened: true,
				});
			}

			// If active, just return the existing case
			if (existingCase.status === 'open' || existingCase.status === 'pending') {
				return NextResponse.json({ case: existingCase, existing: true });
			}
		}

		// Generate next case number
		const lastCase = await payload.find({
			collection: 'moderation-cases',
			sort: '-caseNumber',
			limit: 1,
			depth: 0,
		});
		const nextNumber =
			lastCase.docs.length > 0 ? (lastCase.docs[0].caseNumber || 0) + 1 : 1;

		const newCase = await payload.create({
			collection: 'moderation-cases',
			data: {
				caseNumber: nextNumber,
				targetDiscordId,
				targetDiscordUsername,
				targetServerUsername: targetServerUsername || targetDiscordUsername,
				targetDiscordAvatar: targetDiscordAvatar || '',
				createdByDiscordId: session.discordId,
				createdByDiscordUsername: session.discordUsername,
				reason,
				reasonDetail: reasonDetail || '',
				status: 'open',
				warnCount: 0,
			},
		});

		await payload.create({
			collection: 'moderation-events',
			data: {
				case: newCase.id,
				type: 'system',
				content: `Dossier #${nextNumber} créé — Motif : ${reason}${reasonDetail ? ` — ${reasonDetail}` : ''}`,
				authorDiscordId: session.discordId,
				authorDiscordUsername: session.discordUsername,
				authorDiscordAvatar: session.discordAvatar,
			},
		});

		await sendModerationLog({
			title: '📋 Nouveau dossier de modération',
			description: `**Dossier #${nextNumber}** créé pour **${targetDiscordUsername}**`,
			color: 0x5865f2,
			fields: [
				{ name: 'Modérateur', value: session.discordUsername, inline: true },
				{ name: 'Motif', value: reason, inline: true },
			],
			timestamp: new Date().toISOString(),
		});

		return NextResponse.json({ case: newCase, created: true });
	} catch (err: unknown) {
		console.error('Error creating moderation case:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
