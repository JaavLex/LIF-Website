export async function register() {
	// Only run cron in the Node.js runtime (not edge)
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { startGameSyncCron } = await import('@/lib/game-sync-cron');
		startGameSyncCron();
	}
}
