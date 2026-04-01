import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { getPayloadClient } from '@/lib/payload';
import {
	getWarnCount,
	getNextSanctionInfo,
	discordWarnUser,
	discordKickUser,
	discordBanUser,
	sendModerationLog,
	formatDuration,
	WARN_ESCALATION,
} from '@/lib/moderation';

// GET: get case details + events
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

	const perms = await checkAdminPermissions(session);
	if (!perms.isAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

	const { id } = await params;
	const caseId = parseInt(id);
	if (isNaN(caseId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

	try {
		const payload = await getPayloadClient();

		const caseDoc = await payload.findByID({
			collection: 'moderation-cases',
			id: caseId,
			depth: 0,
		});

		if (!caseDoc) return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 });

		// Get events for this case
		const events = await payload.find({
			collection: 'moderation-events',
			where: { case: { equals: caseId } },
			sort: 'createdAt',
			limit: 500,
			depth: 1,
		});

		// Get sanctions for the target
		const targetDiscordId = (caseDoc as any).targetDiscordId;
		const sanctions = await payload.find({
			collection: 'moderation-sanctions',
			where: { targetDiscordId: { equals: targetDiscordId } },
			sort: '-createdAt',
			limit: 100,
			depth: 0,
		});

		const warnCount = sanctions.docs.filter((s: any) => s.type === 'warn').length;

		// Get characters
		const characters = await payload.find({
			collection: 'characters',
			where: { discordId: { equals: targetDiscordId } },
			depth: 1,
			limit: 50,
		});

		return NextResponse.json({
			case: caseDoc,
			events: events.docs,
			sanctions: sanctions.docs,
			warnCount,
			characters: characters.docs,
			nextSanction: getNextSanctionInfo(warnCount),
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

// PATCH: update case status
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

	const perms = await checkAdminPermissions(session);
	if (!perms.isAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

	const { id } = await params;
	const caseId = parseInt(id);
	if (isNaN(caseId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

	try {
		const body = await request.json();
		const { status } = body;

		if (!['open', 'pending', 'resolved', 'archived'].includes(status)) {
			return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
		}

		const payload = await getPayloadClient();

		const caseDoc = await payload.findByID({
			collection: 'moderation-cases',
			id: caseId,
		});
		if (!caseDoc) return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 });

		const oldStatus = (caseDoc as any).status;

		await payload.update({
			collection: 'moderation-cases',
			id: caseId,
			data: { status },
		});

		const statusLabels: Record<string, string> = {
			open: 'Ouvert',
			pending: 'En attente',
			resolved: 'Résolu',
			archived: 'Archivé',
		};

		// Add status change event
		const eventType = status === 'archived' ? 'case-archived' : status === 'open' && oldStatus === 'archived' ? 'case-reopened' : 'status-change';
		await payload.create({
			collection: 'moderation-events',
			data: {
				case: caseId,
				type: eventType,
				content: `Statut modifié : ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[status]}`,
				authorDiscordId: session.discordId,
				authorDiscordUsername: session.discordUsername,
				authorDiscordAvatar: session.discordAvatar,
			},
		});

		await sendModerationLog({
			title: status === 'archived' ? '📦 Dossier archivé' : '🔄 Statut modifié',
			description: `**Dossier #${(caseDoc as any).caseNumber}** — ${statusLabels[oldStatus]} → **${statusLabels[status]}**`,
			color: status === 'archived' ? 0x808080 : 0xf0ad4e,
			fields: [
				{ name: 'Cible', value: (caseDoc as any).targetDiscordUsername, inline: true },
				{ name: 'Modérateur', value: session.discordUsername, inline: true },
			],
			timestamp: new Date().toISOString(),
		});

		return NextResponse.json({ success: true });
	} catch (err: any) {
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

// POST: add event/comment or trigger moderation action on a case
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

	const perms = await checkAdminPermissions(session);
	if (!perms.isAdmin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

	const { id } = await params;
	const caseId = parseInt(id);
	if (isNaN(caseId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

	try {
		const body = await request.json();
		const { action } = body;

		const payload = await getPayloadClient();

		const caseDoc = await payload.findByID({
			collection: 'moderation-cases',
			id: caseId,
		}) as any;

		if (!caseDoc) return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 });

		// Action: add a comment or event
		if (action === 'comment') {
			const { content, eventType, attachments } = body;
			if (!content && !attachments?.length) {
				return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
			}

			const event = await payload.create({
				collection: 'moderation-events',
				data: {
					case: caseId,
					type: eventType || 'message',
					content: content || '',
					authorDiscordId: session.discordId,
					authorDiscordUsername: session.discordUsername,
					authorDiscordAvatar: session.discordAvatar,
					attachments: attachments || [],
				},
			});

			return NextResponse.json({ event });
		}

		// Action: link a transcript
		if (action === 'link-transcript') {
			const { transcriptUrl, transcriptName } = body;
			if (!transcriptUrl) return NextResponse.json({ error: 'URL de transcript requis' }, { status: 400 });

			const event = await payload.create({
				collection: 'moderation-events',
				data: {
					case: caseId,
					type: 'transcript-linked',
					content: `Transcript lié : ${transcriptName || transcriptUrl}`,
					authorDiscordId: session.discordId,
					authorDiscordUsername: session.discordUsername,
					authorDiscordAvatar: session.discordAvatar,
					transcriptUrl,
					transcriptName: transcriptName || '',
				},
			});

			await sendModerationLog({
				title: '📝 Transcript lié',
				description: `Transcript ajouté au **Dossier #${caseDoc.caseNumber}**`,
				color: 0x17a2b8,
				fields: [
					{ name: 'Cible', value: caseDoc.targetDiscordUsername, inline: true },
					{ name: 'Modérateur', value: session.discordUsername, inline: true },
					{ name: 'Transcript', value: transcriptName || transcriptUrl, inline: false },
				],
				timestamp: new Date().toISOString(),
			});

			return NextResponse.json({ event });
		}

		// Moderation actions (warn/kick/ban) — require full access
		if (action === 'warn' || action === 'kick' || action === 'temp-ban' || action === 'perm-ban') {
			if (perms.level !== 'full') {
				return NextResponse.json({ error: 'Accès insuffisant pour les actions de modération' }, { status: 403 });
			}

			const { reason: actionReason } = body;
			if (!actionReason) return NextResponse.json({ error: 'Raison requise' }, { status: 400 });

			const targetDiscordId = caseDoc.targetDiscordId;

			if (action === 'warn') {
				// Get current warn count and determine escalation
				const currentWarns = await getWarnCount(targetDiscordId);
				const newWarnNumber = currentWarns + 1;
				const escalation = WARN_ESCALATION[Math.min(newWarnNumber, 7)];

				// Send DM
				const warnResult = await discordWarnUser(targetDiscordId, actionReason, newWarnNumber);

				// Create warn sanction
				const sanction = await payload.create({
					collection: 'moderation-sanctions',
					data: {
						targetDiscordId,
						targetDiscordUsername: caseDoc.targetDiscordUsername,
						type: 'warn',
						reason: actionReason,
						case: caseId,
						moderatorDiscordId: session.discordId,
						moderatorDiscordUsername: session.discordUsername,
						warnNumber: newWarnNumber,
						discordSyncStatus: warnResult.success ? 'success' : 'failed',
						discordSyncError: warnResult.error || '',
					},
				});

				// Create warn event
				await payload.create({
					collection: 'moderation-events',
					data: {
						case: caseId,
						type: 'moderation-action',
						content: `Avertissement ${newWarnNumber}/7 — ${actionReason}`,
						authorDiscordId: session.discordId,
						authorDiscordUsername: session.discordUsername,
						authorDiscordAvatar: session.discordAvatar,
						actionType: 'warn',
						actionReason,
						warnCountAfter: newWarnNumber,
						discordSyncStatus: warnResult.success ? 'success' : 'failed',
						discordSyncError: warnResult.error || '',
					},
				});

				// Update warn count on case
				await payload.update({
					collection: 'moderation-cases',
					id: caseId,
					data: { warnCount: newWarnNumber },
				});

				await sendModerationLog({
					title: '⚠️ Avertissement appliqué',
					description: `**${caseDoc.targetDiscordUsername}** — Warn ${newWarnNumber}/7`,
					color: 0xffc107,
					fields: [
						{ name: 'Modérateur', value: session.discordUsername, inline: true },
						{ name: 'Raison', value: actionReason, inline: true },
						{ name: 'Dossier', value: `#${caseDoc.caseNumber}`, inline: true },
						{ name: 'Sync Discord', value: warnResult.success ? '✅ Succès' : `❌ ${warnResult.error}`, inline: false },
					],
					timestamp: new Date().toISOString(),
				});

				// Check for auto-escalation
				if (escalation.action !== 'warn') {
					let escalationResult: { success: boolean; error?: string };

					if (escalation.action === 'kick') {
						escalationResult = await discordKickUser(targetDiscordId, `Escalade automatique — ${newWarnNumber} avertissements — ${actionReason}`);
					} else if (escalation.action === 'temp-ban' && escalation.duration) {
						escalationResult = await discordBanUser(targetDiscordId, `Escalade automatique — ${newWarnNumber} avertissements — ${actionReason}`, escalation.duration);
					} else {
						escalationResult = await discordBanUser(targetDiscordId, `Escalade automatique — ${newWarnNumber} avertissements — ${actionReason}`, null);
					}

					// Create escalation sanction
					await payload.create({
						collection: 'moderation-sanctions',
						data: {
							targetDiscordId,
							targetDiscordUsername: caseDoc.targetDiscordUsername,
							type: escalation.action as 'warn' | 'kick' | 'temp-ban' | 'perm-ban',
							reason: `Escalade automatique (${newWarnNumber} warns) — ${actionReason}`,
							duration: escalation.duration || undefined,
							case: caseId,
							moderatorDiscordId: session.discordId,
							moderatorDiscordUsername: session.discordUsername,
							discordSyncStatus: escalationResult.success ? 'success' : 'failed',
							discordSyncError: escalationResult.error || '',
						},
					});

					// Create escalation event
					await payload.create({
						collection: 'moderation-events',
						data: {
							case: caseId,
							type: 'auto-escalation',
							content: `${escalation.label} déclenché automatiquement — ${newWarnNumber} avertissements`,
							authorDiscordId: 'system',
							authorDiscordUsername: 'Système',
								actionType: escalation.action as 'warn' | 'kick' | 'temp-ban' | 'perm-ban',
							actionReason: `Escalade automatique (${newWarnNumber} warns)`,
							actionDuration: escalation.duration || undefined,
							warnCountAfter: newWarnNumber,
							discordSyncStatus: escalationResult.success ? 'success' : 'failed',
							discordSyncError: escalationResult.error || '',
						},
					});

					const durationText = escalation.duration ? formatDuration(escalation.duration) : 'définitif';
					await sendModerationLog({
						title: `🔨 ${escalation.label}`,
						description: `**${caseDoc.targetDiscordUsername}** — Escalade automatique (${newWarnNumber} warns)`,
						color: escalation.action === 'perm-ban' ? 0x8b0000 : escalation.action === 'kick' ? 0xff6b35 : 0xdc3545,
						fields: [
							{ name: 'Action', value: escalation.label, inline: true },
							{ name: 'Dossier', value: `#${caseDoc.caseNumber}`, inline: true },
							{ name: 'Sync Discord', value: escalationResult.success ? '✅ Succès' : `❌ ${escalationResult.error}`, inline: false },
						],
						timestamp: new Date().toISOString(),
					});

					return NextResponse.json({ sanction, escalation: { ...escalation, syncResult: escalationResult }, warnCount: newWarnNumber });
				}

				return NextResponse.json({ sanction, warnCount: newWarnNumber });
			}

			// Direct kick/ban actions
			let result: { success: boolean; error?: string };
			let duration: number | null = null;

			if (action === 'kick') {
				result = await discordKickUser(targetDiscordId, actionReason);
			} else if (action === 'temp-ban') {
				duration = body.duration || 86400;
				result = await discordBanUser(targetDiscordId, actionReason, duration);
			} else {
				result = await discordBanUser(targetDiscordId, actionReason, null);
			}

			const sanction = await payload.create({
				collection: 'moderation-sanctions',
				data: {
					targetDiscordId,
					targetDiscordUsername: caseDoc.targetDiscordUsername,
					type: action,
					reason: actionReason,
					duration,
					case: caseId,
					moderatorDiscordId: session.discordId,
					moderatorDiscordUsername: session.discordUsername,
					discordSyncStatus: result.success ? 'success' : 'failed',
					discordSyncError: result.error || '',
				},
			});

			const actionLabels: Record<string, string> = {
				kick: 'Expulsion',
				'temp-ban': `Bannissement temporaire${duration ? ` (${formatDuration(duration)})` : ''}`,
				'perm-ban': 'Bannissement définitif',
			};

			await payload.create({
				collection: 'moderation-events',
				data: {
					case: caseId,
					type: 'moderation-action',
					content: `${actionLabels[action]} — ${actionReason}`,
					authorDiscordId: session.discordId,
					authorDiscordUsername: session.discordUsername,
					authorDiscordAvatar: session.discordAvatar,
					actionType: action,
					actionReason,
					actionDuration: duration || undefined,
					discordSyncStatus: result.success ? 'success' : 'failed',
					discordSyncError: result.error || '',
				},
			});

			const actionColors: Record<string, number> = {
				kick: 0xff6b35,
				'temp-ban': 0xdc3545,
				'perm-ban': 0x8b0000,
			};

			await sendModerationLog({
				title: `🔨 ${actionLabels[action]}`,
				description: `**${caseDoc.targetDiscordUsername}**`,
				color: actionColors[action] || 0xdc3545,
				fields: [
					{ name: 'Modérateur', value: session.discordUsername, inline: true },
					{ name: 'Raison', value: actionReason, inline: true },
					{ name: 'Dossier', value: `#${caseDoc.caseNumber}`, inline: true },
					{ name: 'Sync Discord', value: result.success ? '✅ Succès' : `❌ ${result.error}`, inline: false },
				],
				timestamp: new Date().toISOString(),
			});

			return NextResponse.json({ sanction, discordResult: result });
		}

		return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
	} catch (err: any) {
		console.error('Error processing case action:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
