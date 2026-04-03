import type { Roleplay } from '@/payload-types';

let intervalId: ReturnType<typeof setInterval> | null = null;
let currentIntervalMs: number = 15 * 60 * 1000;

async function getSyncInterval(): Promise<number> {
	try {
		const { getPayloadClient } = await import('@/lib/payload');
		const payload = await getPayloadClient();
		const roleplay = await payload.findGlobal({ slug: 'roleplay' }) as Roleplay;
		const minutes = roleplay.gameSyncInterval || 15;
		return minutes * 60 * 1000;
	} catch {
		return 15 * 60 * 1000;
	}
}

async function runSync() {
	try {
		const { isGameServerConfigured, readGamePersistence, setCustomName } =
			await import('@/lib/game-server');

		if (!(await isGameServerConfigured())) {
			console.log('[Game Sync Cron] Server not configured, skipping');
			return;
		}

		const { getPayloadClient } = await import('@/lib/payload');
		const payload = await getPayloadClient();

		const { players } = await readGamePersistence();
		if (!players.length) {
			console.log('[Game Sync Cron] No players found on server');
			return;
		}

		const { docs: characters } = await payload.find({
			collection: 'characters',
			where: { biId: { exists: true } },
			limit: 1000,
			depth: 1,
		});

		let synced = 0;
		const now = new Date().toISOString();

		for (const character of characters) {
			const biId = character.biId;
			if (!biId) continue;

			const playerData = players.find((p: any) => p.biId === biId);
			if (!playerData) continue;

			const money = Math.round(playerData.money * 100) / 100;
			const previousAmount = character.savedMoney ?? null;

			await payload.update({
				collection: 'characters',
				id: character.id,
				data: {
					savedMoney: money,
					lastMoneySyncAt: now,
				},
			});

			// Log to bank history (only if amount changed)
			if (previousAmount === null || previousAmount !== money) {
				await payload.create({
					collection: 'bank-history',
					data: {
						character: character.id,
						amount: money,
						previousAmount: previousAmount,
						source: 'auto-sync',
					},
				});
			}

			synced++;
		}

		// Sync character names to game server
		let namesSynced = 0;
		for (const character of characters) {
			const biId = character.biId;
			if (!biId) continue;

			const fullName =
				character.fullName ||
				`${character.firstName} ${character.lastName}`;
			let rankPrefix = 'LIF';
			const rank = character.rank;
			if (rank && typeof rank === 'object' && rank.abbreviation) {
				rankPrefix = rank.abbreviation;
			}

			try {
				await setCustomName(biId, fullName, rankPrefix);
				namesSynced++;
			} catch (err) {
				console.error(`[Game Sync Cron] Failed to sync name for ${fullName}:`, err);
			}
		}

		await payload.updateGlobal({
			slug: 'roleplay',
			data: { lastGlobalMoneySync: now } as any,
		});

		console.log(
			`[Game Sync Cron] OK: ${synced}/${characters.length} money synced, ${namesSynced} names synced`,
		);
	} catch (err) {
		console.error('[Game Sync Cron] Error:', err);
	}

	// Check if interval changed
	try {
		const newInterval = await getSyncInterval();
		if (newInterval !== currentIntervalMs) {
			console.log(
				`[Game Sync Cron] Interval changed: ${currentIntervalMs / 60000}m -> ${newInterval / 60000}m`,
			);
			currentIntervalMs = newInterval;
			if (intervalId) clearInterval(intervalId);
			intervalId = setInterval(runSync, currentIntervalMs);
		}
	} catch {}
}

export function startGameSyncCron() {
	if (intervalId) return; // Already running

	console.log('[Game Sync Cron] Scheduling start in 30s...');

	// Start after a 30s delay to let the server fully start
	setTimeout(async () => {
		currentIntervalMs = await getSyncInterval();
		console.log(
			`[Game Sync Cron] Started with ${currentIntervalMs / 60000}m interval`,
		);

		// Run first sync immediately
		runSync();

		// Then schedule recurring
		intervalId = setInterval(runSync, currentIntervalMs);
	}, 30000);
}
