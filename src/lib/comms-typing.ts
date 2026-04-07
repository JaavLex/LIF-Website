// In-memory typing indicator store for /comms.
//
// Keyed by channelId → Map<characterId, expiresAtMs>. Typing entries
// expire after TYPING_TTL_MS (5s) — clients are expected to re-ping
// while still typing. State is lost on server restart, which is fine
// for ephemeral indicators.

const TYPING_TTL_MS = 5_000;

const typingByChannel = new Map<number, Map<number, number>>();

export function setTyping(channelId: number, characterId: number): void {
	let inner = typingByChannel.get(channelId);
	if (!inner) {
		inner = new Map();
		typingByChannel.set(channelId, inner);
	}
	inner.set(characterId, Date.now() + TYPING_TTL_MS);
}

export function clearTyping(channelId: number, characterId: number): void {
	const inner = typingByChannel.get(channelId);
	if (inner) {
		inner.delete(characterId);
		if (inner.size === 0) typingByChannel.delete(channelId);
	}
}

export function getTyping(channelId: number, excludeCharacterId?: number): number[] {
	const inner = typingByChannel.get(channelId);
	if (!inner) return [];
	const now = Date.now();
	const out: number[] = [];
	for (const [id, exp] of inner.entries()) {
		if (exp <= now) {
			inner.delete(id);
			continue;
		}
		if (id === excludeCharacterId) continue;
		out.push(id);
	}
	if (inner.size === 0) typingByChannel.delete(channelId);
	return out;
}
