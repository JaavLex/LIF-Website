/**
 * Auto-generation of military-style callsigns.
 *
 * Used as a safety net when a character is missing a callsign (legacy rows
 * created before the field became mandatory). The user can change it later.
 */

const CALLSIGN_WORDS = [
	'ECHO', 'BRAVO', 'ALPHA', 'DELTA', 'FOX', 'RAVEN', 'WOLF', 'GHOST',
	'VIPER', 'HAWK', 'EAGLE', 'COBRA', 'TIGER', 'BEAR', 'LYNX', 'FALCON',
	'PHANTOM', 'STORM', 'BLADE', 'STEEL', 'IRON', 'NOVA', 'ORION', 'TITAN',
	'KILO', 'LIMA', 'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO',
	'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'XRAY', 'YANKEE', 'ZULU',
];

/**
 * Generates a random callsign of the form "ECHO-42". Not guaranteed unique on
 * its own — callers that need uniqueness should retry against the DB.
 */
export function generateCallsign(): string {
	const word = CALLSIGN_WORDS[Math.floor(Math.random() * CALLSIGN_WORDS.length)];
	const num = Math.floor(Math.random() * 90 + 10); // 10-99
	return `${word}-${num}`;
}

/**
 * Generates a callsign that doesn't collide with any existing callsign in the
 * characters collection. Tries up to 10 times before falling back to a
 * timestamp-suffixed value.
 */
export async function generateUniqueCallsign(payload: any): Promise<string> {
	for (let i = 0; i < 10; i++) {
		const candidate = generateCallsign();
		const existing = await payload.find({
			collection: 'characters',
			where: { callsign: { equals: candidate } },
			limit: 1,
			depth: 0,
		});
		if (existing.docs.length === 0) return candidate;
	}
	// Fallback: append last 4 of current ms timestamp to guarantee uniqueness
	return `${generateCallsign()}-${Date.now().toString().slice(-4)}`;
}
