import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { getPayloadClient } from '@/lib/payload';
import { sendModerationLog } from '@/lib/moderation';

// GET: list cases with optional filters
export async function GET(request: NextRequest) {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

	const perms = await checkAdminPermissions(session);
	if (!perms.isAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

	const { searchParams } = new URL(request.url);
	const status = searchParams.get('status');
	const targetDiscordId = searchParams.get('targetDiscordId');
	const moderator = searchParams.get('moderator');
	const page = parseInt(searchParams.get('page') || '1');
	const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

	const where: any = {};
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
	} catch (err: any) {
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

// POST: create a new case (or reopen existing)
export async function POST(request: NextRequest) {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

	const perms = await checkAdminPermissions(session);
	if (!perms.isAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

	try {
		const body = await request.json();
		const { targetDiscordId, targetDiscordUsername, targetServerUsername, targetDiscordAvatar, reason, reasonDetail } = body;

		if (!targetDiscordId || !targetDiscordUsername || !reason) {
			return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
		}

		const payload = await getPayloadClient();

		// Check for existing case for this user
		const existing = await payload.find({
			collection: 'moderation-cases',
			where: { targetDiscordId: { equals: targetDiscordId } },
			sort: '-createdAt',
			limit: 1,
			depth: 0,
		});

		if (existing.docs.length > 0) {
			const existingCase = existing.docs[0] as any;

			// If archived, reopen it
			if (existingCase.status === 'archived') {
				await payload.update({
					collection: 'moderation-cases',
					id: existingCase.id,
					data: { status: 'open' },
				});

				// Add reopen event
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

				return NextResponse.json({ case: { ...existingCase, status: 'open' }, reopened: true });
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
		const nextNumber = lastCase.docs.length > 0 ? ((lastCase.docs[0] as any).caseNumber || 0) + 1 : 1;

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

		// Add creation event
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
	} catch (err: any) {
		console.error('Error creating moderation case:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
