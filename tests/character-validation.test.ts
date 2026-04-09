import { describe, it, expect } from 'vitest';
import {
	sanitizeCallsign,
	sanitizeCallsignLive,
	backgroundCharCount,
	validateBackground,
	BACKGROUND_MIN_LENGTH,
} from '@/lib/character-validation';
import { textToLexical } from '@/lib/constants';

describe('sanitizeCallsign', () => {
	it('strips French guillemets', () => {
		expect(sanitizeCallsign('« le fourbe »')).toBe('le fourbe');
	});

	it('strips surrounding straight double-quotes', () => {
		expect(sanitizeCallsign('"Ghost"')).toBe('Ghost');
	});

	it('strips straight single-quotes / apostrophes', () => {
		// U+0027 straight apostrophe - a character you cannot decorate a callsign with
		expect(sanitizeCallsign("'Eagle'")).toBe('Eagle');
	});

	it('strips curly double-quotes', () => {
		expect(sanitizeCallsign('“Sniper”')).toBe('Sniper');
	});

	it('strips curly single-quotes', () => {
		expect(sanitizeCallsign('‘Wolf’')).toBe('Wolf');
	});

	it('strips backticks', () => {
		expect(sanitizeCallsign('`Raven`')).toBe('Raven');
	});

	it('collapses internal whitespace', () => {
		expect(sanitizeCallsign('  le    fourbe  ')).toBe('le fourbe');
	});

	it('preserves single internal spaces (multi-word callsigns are legal)', () => {
		expect(sanitizeCallsign('le fourbe')).toBe('le fourbe');
		expect(sanitizeCallsign('Eagle 01')).toBe('Eagle 01');
		expect(sanitizeCallsign('Alpha Bravo Charlie')).toBe('Alpha Bravo Charlie');
	});

	it('returns empty string for empty / whitespace-only / quotes-only input', () => {
		expect(sanitizeCallsign('')).toBe('');
		expect(sanitizeCallsign('   ')).toBe('');
		expect(sanitizeCallsign('«»')).toBe('');
		expect(sanitizeCallsign('""')).toBe('');
	});

	it('leaves a clean callsign unchanged', () => {
		expect(sanitizeCallsign('Eagle-01')).toBe('Eagle-01');
	});

	it('preserves accented Latin characters (the point of French RP callsigns)', () => {
		expect(sanitizeCallsign('Égide')).toBe('Égide');
	});
});

describe('sanitizeCallsignLive', () => {
	it('preserves a trailing space so users can type multi-word callsigns', () => {
		// Regression: the submit-time sanitizer trims, which wiped the space
		// on every keystroke and made "le fourbe" impossible to type.
		expect(sanitizeCallsignLive('le ')).toBe('le ');
		expect(sanitizeCallsignLive('le fourbe ')).toBe('le fourbe ');
	});

	it('preserves internal single spaces mid-typing', () => {
		expect(sanitizeCallsignLive('le fourbe')).toBe('le fourbe');
		expect(sanitizeCallsignLive('Alpha Bravo')).toBe('Alpha Bravo');
	});

	it('still strips quote characters while typing', () => {
		expect(sanitizeCallsignLive('« le fourbe »')).toBe('le fourbe ');
		expect(sanitizeCallsignLive('"Ghost"')).toBe('Ghost');
	});

	it('drops leading whitespace (field should never start with a space)', () => {
		expect(sanitizeCallsignLive('   le fourbe')).toBe('le fourbe');
	});

	it('collapses runs of internal whitespace to a single space', () => {
		expect(sanitizeCallsignLive('le    fourbe')).toBe('le fourbe');
	});

	it('returns empty string for empty input', () => {
		expect(sanitizeCallsignLive('')).toBe('');
	});
});

describe('backgroundCharCount', () => {
	it('returns 0 for empty / null / undefined', () => {
		expect(backgroundCharCount('')).toBe(0);
		expect(backgroundCharCount(null)).toBe(0);
		expect(backgroundCharCount(undefined)).toBe(0);
	});

	it('counts plain-string length after trimming', () => {
		expect(backgroundCharCount('   hello   ')).toBe(5);
	});

	it('counts characters inside a Lexical JSON payload', () => {
		const lex = textToLexical('hello world');
		expect(backgroundCharCount(lex)).toBe(11);
	});

	it('agrees across plain and lexical representations of the same text', () => {
		const txt = 'a'.repeat(600);
		expect(backgroundCharCount(txt)).toBe(600);
		expect(backgroundCharCount(textToLexical(txt))).toBe(600);
	});
});

describe('validateBackground', () => {
	it('accepts a string of exactly the minimum length', () => {
		const min = 'x'.repeat(BACKGROUND_MIN_LENGTH);
		expect(validateBackground(min, 'parcours civil')).toBeNull();
	});

	it('rejects a too-short string and mentions the field label', () => {
		const err = validateBackground('too short', 'parcours militaire');
		expect(err).toBeTruthy();
		expect(err).toContain('parcours militaire');
		expect(err).toContain(String(BACKGROUND_MIN_LENGTH));
	});

	it('rejects undefined / null input', () => {
		expect(validateBackground(undefined, 'parcours civil')).not.toBeNull();
		expect(validateBackground(null, 'parcours civil')).not.toBeNull();
	});

	it('rejects a long string that is mostly whitespace', () => {
		const padded = '   ' + 'x'.repeat(10) + '   ';
		expect(validateBackground(padded, 'parcours civil')).not.toBeNull();
	});

	it('enforces the advertised 500-character minimum', () => {
		expect(BACKGROUND_MIN_LENGTH).toBe(500);
	});
});

// ─── Source-level regression guards ───

import { readFileSync } from 'fs';
import { resolve } from 'path';

function readSrc(rel: string): string {
	return readFileSync(resolve(__dirname, '..', 'src', rel), 'utf-8');
}

describe('Character routes wire validation', () => {
	it('POST /api/roleplay/characters uses sanitizeCallsign + validateBackground', () => {
		const src = readSrc('app/api/roleplay/characters/route.ts');
		expect(src).toContain('sanitizeCallsign');
		expect(src).toContain('validateBackground');
		expect(src).toContain('photo de profil est obligatoire');
	});

	it('POST route bypasses 500-char background rule for admins', () => {
		const src = readSrc('app/api/roleplay/characters/route.ts');
		// Validation call must be inside a !isAdmin branch so admins skip it.
		expect(src).toMatch(/!isNpcCreation && !isAdmin[\s\S]*validateBackground/);
	});

	it('PATCH /api/roleplay/characters/[id] uses the same validators', () => {
		const src = readSrc('app/api/roleplay/characters/[id]/route.ts');
		expect(src).toContain('sanitizeCallsign');
		expect(src).toContain('validateBackground');
		expect(src).toContain('photo de profil est obligatoire');
	});

	it('PATCH route bypasses 500-char background rule for admins', () => {
		const src = readSrc('app/api/roleplay/characters/[id]/route.ts');
		expect(src).toMatch(/!isAdmin && body\.civilianBackground/);
		expect(src).toMatch(/!isAdmin && body\.militaryBackground/);
	});

	it('PATCH route strips isMainCharacter for non-admins', () => {
		const src = readSrc('app/api/roleplay/characters/[id]/route.ts');
		// Ensure the delete happens inside the non-admin branch
		expect(src).toMatch(/if \(!isAdmin\)[\s\S]*delete body\.isMainCharacter/);
	});

	it('PATCH route bypasses auto-clear when requiresImprovements is set', () => {
		const src = readSrc('app/api/roleplay/characters/[id]/route.ts');
		expect(src).toContain('wasFlaggedForImprovements');
		// auto-clear condition must include the flag
		expect(src).toMatch(/!wasFlaggedForImprovements/);
	});

	it('PATCH route auto-clears improvement flag when owner edits & validates', () => {
		const src = readSrc('app/api/roleplay/characters/[id]/route.ts');
		expect(src).toContain('body.requiresImprovements = false');
		expect(src).toContain("body.status = 'in-service'");
	});
});

describe('Require improvements admin route', () => {
	it('exists and is gated behind requireAdmin', () => {
		const src = readSrc(
			'app/api/roleplay/characters/[id]/require-improvements/route.ts',
		);
		expect(src).toContain('requireAdmin');
		expect(src).toContain("status: 'dishonourable-discharge'");
		expect(src).toContain('sendDiscordDM');
		expect(src).toContain('requiresImprovements: true');
	});

	it('refuses to flag an NPC (no discordId)', () => {
		const src = readSrc(
			'app/api/roleplay/characters/[id]/require-improvements/route.ts',
		);
		expect(src).toContain('!existing.discordId');
	});

	it('requires a non-empty reason', () => {
		const src = readSrc(
			'app/api/roleplay/characters/[id]/require-improvements/route.ts',
		);
		expect(src).toContain('Une raison est obligatoire');
	});
});

describe('CharacterForm wires validation', () => {
	it('sanitizes callsign onChange', () => {
		const src = readSrc('components/roleplay/CharacterForm.tsx');
		expect(src).toContain("target.name === 'callsign'");
		expect(src).toContain('sanitizeCallsign');
	});

	it('enforces backgrounds + avatar client-side', () => {
		const src = readSrc('components/roleplay/CharacterForm.tsx');
		expect(src).toContain('BACKGROUND_MIN_LENGTH');
		expect(src).toContain('photo de profil est obligatoire');
	});

	it('exposes isMainCharacter toggle in the admin edit section', () => {
		const src = readSrc('components/roleplay/CharacterForm.tsx');
		expect(src).toMatch(/name="isMainCharacter"/);
	});
});
