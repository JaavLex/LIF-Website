// In-memory presence store for /comms.
//
// Maps characterId → expiresAtMs. Clients heartbeat every 30s; an entry
// older than PRESENCE_TTL_MS is considered offline. Lost on server restart.

const PRESENCE_TTL_MS = 60_000;

const presence = new Map<number, number>();

export function pingPresence(characterId: number): void {
	presence.set(characterId, Date.now() + PRESENCE_TTL_MS);
}

export function isOnline(characterId: number): boolean {
	const exp = presence.get(characterId);
	if (!exp) return false;
	if (exp <= Date.now()) {
		presence.delete(characterId);
		return false;
	}
	return true;
}

export function onlineSet(characterIds: number[]): Set<number> {
	const now = Date.now();
	const out = new Set<number>();
	for (const id of characterIds) {
		const exp = presence.get(id);
		if (exp && exp > now) out.add(id);
		else if (exp) presence.delete(id);
	}
	return out;
}
