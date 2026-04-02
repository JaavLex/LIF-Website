const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://127.0.0.1:3001';
const CRON_SECRET = process.env.CRON_SECRET || 'internal-cron-secret';

let intervalId: ReturnType<typeof setInterval> | null = null;
let currentIntervalMs: number = 15 * 60 * 1000;

async function getSyncInterval(): Promise<number> {
	try {
		const { getPayloadClient } = await import('@/lib/payload');
		const payload = await getPayloadClient();
		const roleplay = await payload.findGlobal({ slug: 'roleplay' }) as any;
		const minutes = roleplay.gameSyncInterval || 15;
		return minutes * 60 * 1000;
	} catch {
		return 15 * 60 * 1000;
	}
}

async function runSync() {
	try {
		const res = await fetch(`${SITE_URL}/api/roleplay/characters/auto-sync`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${CRON_SECRET}` },
		});
		const data = await res.json();
		if (res.ok) {
			console.log(`[Game Sync Cron] OK: ${data.synced} characters synced`);
		} else {
			console.error(`[Game Sync Cron] Error: ${data.error}`);
		}
	} catch (err) {
		console.error('[Game Sync Cron] Fetch error:', err);
	}

	// Check if interval changed
	const newInterval = await getSyncInterval();
	if (newInterval !== currentIntervalMs) {
		console.log(`[Game Sync Cron] Interval changed: ${currentIntervalMs / 60000}m -> ${newInterval / 60000}m`);
		currentIntervalMs = newInterval;
		if (intervalId) clearInterval(intervalId);
		intervalId = setInterval(runSync, currentIntervalMs);
	}
}

export function startGameSyncCron() {
	if (intervalId) return; // Already running

	// Start after a 30s delay to let the server fully start
	setTimeout(async () => {
		currentIntervalMs = await getSyncInterval();
		console.log(`[Game Sync Cron] Started with ${currentIntervalMs / 60000}m interval`);

		// Run first sync immediately
		runSync();

		// Then schedule recurring
		intervalId = setInterval(runSync, currentIntervalMs);
	}, 30000);
}
