import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { getPayloadClient } from '@/lib/payload';
import {
	isGameServerConfigured,
	getPlayerMoney,
	setPlayerMoney,
	setCustomName,
} from '@/lib/game-server';

// GET: Read money from game server for this character
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

	if (!(await isGameServerConfigured())) {
		return NextResponse.json({ error: 'Serveur de jeu non configuré' }, { status: 503 });
	}

	const { id } = await params;
	const payload = await getPayloadClient();
	const character = await payload.findByID({ collection: 'characters', id: Number(id), depth: 0 });
	if (!character) return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 });

	// Only owner or admin can read game data
	const perms = await checkAdminPermissions(session);
	if (!perms.isAdmin && (character as any).discordId !== session.discordId) {
		return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
	}

	const biId = (character as any).biId;
	if (!biId) {
		return NextResponse.json({ error: 'Aucun BI ID lié à ce personnage' }, { status: 400 });
	}

	try {
		const result = await getPlayerMoney(biId);
		if (!result) {
			return NextResponse.json({
				error: 'Joueur non trouvé dans la persistence du serveur',
			}, { status: 404 });
		}

		return NextResponse.json({
			gameMoney: Math.round(result.money * 100) / 100,
			savedMoney: (character as any).savedMoney ?? null,
			lastSyncAt: (character as any).lastMoneySyncAt ?? null,
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
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

	const session = verifySession(token);
	if (!session) return NextResponse.json({ error: 'Session invalide' }, { status: 401 });

	if (!(await isGameServerConfigured())) {
		return NextResponse.json({ error: 'Serveur de jeu non configuré' }, { status: 503 });
	}

	const { id } = await params;
	const payload = await getPayloadClient();
	const character = await payload.findByID({ collection: 'characters', id: Number(id), depth: 1 });
	if (!character) return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 });

	const perms = await checkAdminPermissions(session);
	const isOwner = (character as any).discordId === session.discordId;

	const biId = (character as any).biId;
	if (!biId) {
		return NextResponse.json({ error: 'Aucun BI ID lié à ce personnage' }, { status: 400 });
	}

	const body = await request.json();
	const action = body.action;

	try {
		switch (action) {
			// Save current game money to website (backup)
			case 'save-money': {
				if (!perms.isAdmin && !isOwner) {
					return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
				}
				const result = await getPlayerMoney(biId);
				if (!result) {
					return NextResponse.json({ error: 'Joueur non trouvé dans la persistence' }, { status: 404 });
				}
				const money = Math.round(result.money * 100) / 100;
				await payload.update({
					collection: 'characters',
					id: Number(id),
					data: {
						savedMoney: money,
						lastMoneySyncAt: new Date().toISOString(),
					} as any,
				});
				return NextResponse.json({ success: true, savedMoney: money });
			}

			// Restore saved money back to game
			case 'restore-money': {
				if (!perms.isAdmin && !isOwner) {
					return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
				}
				const savedMoney = (character as any).savedMoney;
				if (savedMoney == null) {
					return NextResponse.json({ error: 'Aucun argent sauvegardé' }, { status: 400 });
				}
				await setPlayerMoney(biId, savedMoney);
				return NextResponse.json({ success: true, restoredMoney: savedMoney });
			}

			// Admin: set money to a specific amount on the game server
			case 'set-money': {
				if (!perms.isAdmin) {
					return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
				}
				const newMoney = parseFloat(body.amount);
				if (isNaN(newMoney) || newMoney < 0) {
					return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
				}
				await setPlayerMoney(biId, newMoney);
				return NextResponse.json({ success: true, newMoney });
			}

			// Sync character name to game server
			case 'sync-name': {
				if (!perms.isAdmin && !isOwner) {
					return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
				}
				const fullName = (character as any).fullName || `${(character as any).firstName} ${(character as any).lastName}`;
				// Get rank abbreviation for prefix
				let rankPrefix = 'LIF';
				const rank = (character as any).rank;
				if (rank && typeof rank === 'object' && rank.abbreviation) {
					rankPrefix = rank.abbreviation;
				}
				await setCustomName(biId, fullName, rankPrefix);
				return NextResponse.json({ success: true, name: fullName, prefix: rankPrefix });
			}

			default:
				return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
		}
	} catch (err: any) {
		console.error('Game sync error:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
