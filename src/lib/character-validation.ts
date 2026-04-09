/**
 * Shared validation helpers for character sheets.
 * Used by both the client form and the server API routes so the rules
 * stay in sync.
 */
import { lexicalToText } from '@/lib/constants';

export const BACKGROUND_MIN_LENGTH = 500;

/**
 * Quote characters that must NOT appear in a callsign.
 * Covers guillemets, straight quotes, curly quotes and a few visually similar
 * punctuation marks that players use to "style" their callsign
 * (e.g. « le fourbe »).
 */
const CALLSIGN_QUOTE_CHARS =
	/[\u00AB\u00BB"'\u201C\u201D\u2018\u2019\u2039\u203A\u201E\u201F\u201B`\u00B4]/g;

/**
 * Strip all quote-like characters from a callsign and collapse whitespace.
 * Trailing whitespace is removed — use this at submit/server time, NOT on
 * every keystroke (a trailing space is a legitimate intermediate state
 * while the user is typing a multi-word callsign like "le fourbe").
 */
export function sanitizeCallsign(raw: string): string {
	if (!raw) return '';
	return raw
		.replace(CALLSIGN_QUOTE_CHARS, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Live, keystroke-safe variant of {@link sanitizeCallsign}. Strips the
 * forbidden quote characters and normalizes repeated whitespace into a
 * single space, but PRESERVES a single trailing space so the user can
 * type a multi-word callsign without the space disappearing on every
 * keypress. The final trim happens in {@link sanitizeCallsign} on submit.
 */
export function sanitizeCallsignLive(raw: string): string {
	if (!raw) return '';
	const noQuotes = raw.replace(CALLSIGN_QUOTE_CHARS, '');
	// Collapse runs of whitespace to a single space, preserving leading /
	// trailing single space. Then drop any leading space so the field never
	// *starts* with whitespace.
	return noQuotes.replace(/\s+/g, ' ').replace(/^\s+/, '');
}

/**
 * Count the visible characters of a character-sheet background field.
 * Accepts either a Lexical JSON payload (as stored in Payload) or a plain
 * string (as held by the form state). Whitespace is counted, but leading /
 * trailing whitespace is ignored.
 */
export function backgroundCharCount(value: unknown): number {
	if (!value) return 0;
	if (typeof value === 'string') return value.trim().length;
	return lexicalToText(value).trim().length;
}

/**
 * Validate a background field against the 500-character minimum.
 * Returns `null` if valid, or a human-readable French error message.
 */
export function validateBackground(value: unknown, label: string): string | null {
	const count = backgroundCharCount(value);
	if (count < BACKGROUND_MIN_LENGTH) {
		return `Le ${label} doit contenir au moins ${BACKGROUND_MIN_LENGTH} caractères (actuellement ${count}).`;
	}
	return null;
}
