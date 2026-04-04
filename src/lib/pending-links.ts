/**
 * In-memory store for pending account link codes.
 * When a player clicks "Link" in-game, the mod POSTs to /api/roleplay/link/generate
 * which creates a code + biId mapping here. The player then enters the code on the website
 * (while logged in via Discord) to complete the link.
 *
 * Codes expire after 15 minutes. If the server restarts, pending codes are lost
 * (the player just re-clicks in-game).
 */

interface PendingLink {
	biId: string;
	code: string;
	createdAt: number;
}

const EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const pendingLinks = new Map<string, PendingLink>();

function generateCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

function cleanup() {
	const now = Date.now();
	for (const [code, link] of pendingLinks) {
		if (now - link.createdAt > EXPIRY_MS) {
			pendingLinks.delete(code);
		}
	}
}

/**
 * Create a pending link code for a given BI ID.
 * Returns the 6-character code.
 */
export function createPendingLink(biId: string): string {
	cleanup();

	// Remove any existing pending link for this biId
	for (const [code, link] of pendingLinks) {
		if (link.biId === biId) {
			pendingLinks.delete(code);
		}
	}

	let code = generateCode();
	// Ensure uniqueness
	while (pendingLinks.has(code)) {
		code = generateCode();
	}

	pendingLinks.set(code, {
		biId,
		code,
		createdAt: Date.now(),
	});

	return code;
}

/**
 * Consume a pending link code. Returns the biId if valid, null if expired/invalid.
 * The code is deleted after use (one-time use).
 */
export function consumePendingLink(code: string): string | null {
	cleanup();

	const upperCode = code.toUpperCase().trim();
	const link = pendingLinks.get(upperCode);
	if (!link) return null;

	pendingLinks.delete(upperCode);
	return link.biId;
}

/**
 * Peek at a pending link code without consuming it.
 * Returns the biId if valid, null if expired/invalid.
 */
export function peekPendingLink(code: string): string | null {
	cleanup();

	const upperCode = code.toUpperCase().trim();
	const link = pendingLinks.get(upperCode);
	if (!link) return null;

	return link.biId;
}

/**
 * Check if a biId has a pending link code.
 */
export function hasPendingLink(biId: string): boolean {
	cleanup();
	for (const link of pendingLinks.values()) {
		if (link.biId === biId) return true;
	}
	return false;
}
