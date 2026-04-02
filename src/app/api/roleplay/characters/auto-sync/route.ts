import { NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { isGameServerConfigured, readGamePersistence } from '@/lib/game-server';

// Internal endpoint for auto-syncing all players' money
// Called by the cron scheduler or manually by admins
export async function POST(request: Request) {
	// Verify internal cron secret or admin auth
	const authHeader = request.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET || 'internal-cron-secret';
	if (authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
	}

	if (!(await isGameServerConfigured())) {
		return NextResponse.json({ error: 'Serveur de jeu non configuré' }, { status: 503 });
	}

	try {
		const payload = await getPayloadClient();

		// Read all players from game server
		const { players } = await readGamePersistence();
		if (!players.length) {
			return NextResponse.json({ synced: 0, message: 'Aucun joueur trouvé' });
		}

		// Find all characters with biId set
		const { docs: characters } = await payload.find({
			collection: 'characters',
			where: {
				biId: { exists: true },
			},
			limit: 1000,
			depth: 0,
		});

		let synced = 0;
		const now = new Date().toISOString();

		for (const character of characters) {
			const biId = (character as any).biId;
			if (!biId) continue;

			const playerData = players.find((p) => p.biId === biId);
			if (!playerData) continue;

			const money = Math.round(playerData.money * 100) / 100;
			await payload.update({
				collection: 'characters',
				id: character.id,
				data: {
					savedMoney: money,
					lastMoneySyncAt: now,
				} as any,
			});
			synced++;
		}

		// Update global last sync timestamp
		await payload.updateGlobal({
			slug: 'roleplay',
			data: { lastGlobalMoneySync: now } as any,
		});

		console.log(`[Auto-sync] Synced money for ${synced}/${characters.length} characters`);
		return NextResponse.json({ synced, total: characters.length, timestamp: now });
	} catch (err: any) {
		console.error('[Auto-sync] Error:', err);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
