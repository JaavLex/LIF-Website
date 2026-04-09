import type { PayloadRequest } from 'payload';

/**
 * Payload-level access helper: returns true when the Payload request carries
 * a logged-in user whose role is 'admin' in the `users` collection. Used by
 * collection-level `access.read` / `access.delete` rules. This does NOT check
 * Discord-session-based admin — our API routes enforce that separately via
 * requireFullAdmin(). This helper exists only so that full admins browsing
 * the Payload /admin UI can still read the collection.
 */
export function isFullAdmin(req: PayloadRequest): boolean {
	return req.user?.role === 'admin';
}
