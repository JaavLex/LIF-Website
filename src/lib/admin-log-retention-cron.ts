import { getPayloadClient } from './payload';

const RETENTION_DAYS = 180;
const INTERVAL_MS = 24 * 60 * 60 * 1000;

let started = false;
let timer: NodeJS.Timeout | null = null;
let bootDelay: NodeJS.Timeout | null = null;

/**
 * Delete admin_logs entries older than RETENTION_DAYS.
 *
 * Exported so tests and manual debug tooling can invoke the prune directly
 * without waiting for the 24h interval. Errors are swallowed with
 * console.error — audit-log retention failing must never crash the app.
 */
export async function pruneOnce(): Promise<void> {
	try {
		const payload = await getPayloadClient();
		const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
		const result = await payload.delete({
			collection: 'admin-logs',
			where: { createdAt: { less_than: cutoff.toISOString() } },
		});
		const count = Array.isArray((result as { docs?: unknown[] }).docs)
			? (result as { docs: unknown[] }).docs.length
			: 0;
		if (count > 0) {
			console.log(
				`[admin-log-retention] pruned ${count} entries older than ${RETENTION_DAYS}d`,
			);
		}
	} catch (err) {
		console.error('[admin-log-retention] prune failed:', err);
	}
}

/**
 * Start the 24h retention cron. Idempotent: subsequent calls are no-ops so
 * HMR double-imports and multiple bootstrap paths do not spawn parallel
 * timers. A 60s startup delay avoids racing the DB during boot.
 */
export function startAdminLogRetentionCron(): void {
	if (started) return;
	started = true;
	bootDelay = setTimeout(() => void pruneOnce(), 60_000);
	timer = setInterval(() => void pruneOnce(), INTERVAL_MS);
}

export function stopAdminLogRetentionCron(): void {
	if (bootDelay) clearTimeout(bootDelay);
	if (timer) clearInterval(timer);
	started = false;
	bootDelay = null;
	timer = null;
}
