import { NextResponse } from 'next/server';
import { requireSession, isErrorResponse } from '@/lib/api-auth';
import { checkAdminPermissions } from '@/lib/admin';
import { getPayloadClient } from '@/lib/payload';
import {
	isGameServerConfigured,
	getPlayerMoney,
	setPlayerMoney,
	setCustomName,
} from '@/lib/game-server';
import type { Character, Rank, Roleplay } from '@/payload-types';

// GET: Read money from game server for this character
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const sessionResult = await requireSession();
	if (isErrorResponse(sessionResult)) return sessionResult;
	const session = sessionResult;

	if (!(await isGameServerConfigured())) {
		return NextResponse.json(
			{ error: 'Serveur de jeu non configuré' },
			{ status: 503 },
		);
	}

	const { id } = await params;
	const payload = await getPayloadClient();
	const character: Character = await payload.findByID({
		collection: 'characters',
		id: Number(id),
		depth: 0,
	});
	if (!character)
		return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 });

	// Only owner or admin can read game data
	const perms = await checkAdminPermissions(session);
	if (!perms.isAdmin && character.discordId !== session.discordId) {
		return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
	}

	const biId = character.biId;
	if (!biId) {
		return NextResponse.json(
			{ error: 'Aucun BI ID lié à ce personnage' },
			{ status: 400 },
		);
	}

	try {
		let gameMoney: number | null = null;
		try {
			const result = await getPlayerMoney(biId);
			if (result) {
				gameMoney = Math.round(result.money * 100) / 100;
			}
		} catch (err: any) {
			console.warn('Game sync: could not fetch player money, defaulting to 0:', err.message);
		}

		// Get global sync info for countdown
		const roleplay = await payload.findGlobal({ slug: 'roleplay' }) as Roleplay;

		// Fetch bank history for admins
		let bankHistory: any[] = [];
		if (perms.isAdmin) {
			const historyResult = await payload.find({
				collection: 'bank-history',
				where: { character: { equals: Number(id) } },
				sort: '-createdAt',
				limit: 50,
				depth: 0,
			});
			bankHistory = historyResult.docs.map((h: any) => ({
				amount: h.amount,
				previousAmount: h.previousAmount,
				source: h.source,
				date: h.createdAt,
			}));
		}

		return NextResponse.json({
			gameMoney: gameMoney ?? 0,
			savedMoney: character.savedMoney ?? null,
			lastSyncAt: character.lastMoneySyncAt ?? null,
			lastGlobalSync: roleplay.lastGlobalMoneySync ?? null,
			syncIntervalMinutes: roleplay.gameSyncInterval ?? 15,
			bankHistory,
		});
	} catch (err: any) {
		console.error('Game sync error:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}

// POST: Actions on game data
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const sessionResult2 = await requireSession();
	if (isErrorResponse(sessionResult2)) return sessionResult2;
	const session = sessionResult2;

	if (!(await isGameServerConfigured())) {
		return NextResponse.json(
			{ error: 'Serveur de jeu non configuré' },
			{ status: 503 },
		);
	}

	const { id } = await params;
	const payload = await getPayloadClient();
	const character: Character = await payload.findByID({
		collection: 'characters',
		id: Number(id),
		depth: 1,
	});
	if (!character)
		return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 });

	const perms = await checkAdminPermissions(session);
	const isOwner = character.discordId === session.discordId;

	const biId = character.biId;
	if (!biId) {
		return NextResponse.json(
			{ error: 'Aucun BI ID lié à ce personnage' },
			{ status: 400 },
		);
	}

	const body = await request.json();
	const action = body.action;

	try {
		switch (action) {
			// Save current game money to website (backup) — admin only
			case 'save-money': {
				if (!perms.isAdmin) {
					return NextResponse.json(
						{ error: 'Réservé aux administrateurs' },
						{ status: 403 },
					);
				}
				const result = await getPlayerMoney(biId);
				if (!result) {
					return NextResponse.json(
						{ error: 'Joueur non trouvé dans la persistence' },
						{ status: 404 },
					);
				}
				const money = Math.round(result.money * 100) / 100;
				const prevMoney = character.savedMoney ?? null;
				await payload.update({
					collection: 'characters',
					id: Number(id),
					data: {
						savedMoney: money,
						lastMoneySyncAt: new Date().toISOString(),
					},
				});
				await payload.create({
					collection: 'bank-history',
					data: {
						character: Number(id),
						amount: money,
						previousAmount: prevMoney,
						source: 'manual-save',
					},
				});
				return NextResponse.json({ success: true, savedMoney: money });
			}

			// Restore saved money back to game — admin only
			case 'restore-money': {
				if (!perms.isAdmin) {
					return NextResponse.json(
						{ error: 'Réservé aux administrateurs' },
						{ status: 403 },
					);
				}
				const savedMoney = character.savedMoney;
				if (savedMoney == null) {
					return NextResponse.json(
						{ error: 'Aucun argent sauvegardé' },
						{ status: 400 },
					);
				}
				await setPlayerMoney(biId, savedMoney);
				await payload.create({
					collection: 'bank-history',
					data: {
						character: Number(id),
						amount: savedMoney,
						previousAmount: savedMoney,
						source: 'restore',
					},
				});
				return NextResponse.json({ success: true, restoredMoney: savedMoney });
			}

			// Admin: set money to a specific amount on the game server
			case 'set-money': {
				if (!perms.isAdmin) {
					return NextResponse.json(
						{ error: 'Réservé aux administrateurs' },
						{ status: 403 },
					);
				}
				const newMoney = parseFloat(body.amount);
				if (isNaN(newMoney) || newMoney < 0) {
					return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
				}
				const prevAmount = character.savedMoney ?? null;
				await setPlayerMoney(biId, newMoney);
				await payload.create({
					collection: 'bank-history',
					data: {
						character: Number(id),
						amount: newMoney,
						previousAmount: prevAmount,
						source: 'admin-set',
					},
				});
				return NextResponse.json({ success: true, newMoney });
			}

			// Sync character name to game server
			case 'sync-name': {
				if (!perms.isAdmin && !isOwner) {
					return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
				}
				const fullName =
					character.fullName ||
					`${character.firstName} ${character.lastName}`;
				// Get rank abbreviation for prefix
				let rankPrefix = 'LIF';
				const rank = character.rank;
				if (rank && typeof rank === 'object' && rank.abbreviation) {
					rankPrefix = rank.abbreviation;
				}
				await setCustomName(biId, fullName, rankPrefix);
				return NextResponse.json({
					success: true,
					name: fullName,
					prefix: rankPrefix,
				});
			}

			default:
				return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
		}
	} catch (err: any) {
		console.error('Game sync error:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
