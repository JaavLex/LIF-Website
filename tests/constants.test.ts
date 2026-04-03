import { describe, it, expect } from 'vitest';
import {
	MODERATION_REASON_LABELS,
	MODERATION_STATUS_LABELS,
	MODERATION_EVENT_TYPE_LABELS,
	SANCTION_LABELS,
	SANCTION_LABELS_LONG,
	CHARACTER_STATUS_LABELS,
	CHARACTER_STATUS_COLORS,
	CHARACTER_STATUS_EMBED_COLORS,
	INTELLIGENCE_TYPE_LABELS,
	INTELLIGENCE_CLASSIFICATION_LABELS,
	TIMELINE_TYPE_LABELS,
	TIMELINE_EMOJIS,
	formatDuration,
	formatDurationLong,
	lexicalToText,
	textToLexical,
	serialize,
} from '@/lib/constants';

// ─── Label Maps ───

describe('Label maps', () => {
	it('MODERATION_REASON_LABELS has all expected keys', () => {
		expect(MODERATION_REASON_LABELS).toHaveProperty('joueur-problematique');
		expect(MODERATION_REASON_LABELS).toHaveProperty('surveillance');
		expect(MODERATION_REASON_LABELS).toHaveProperty('autre');
		// Values are French strings
		expect(typeof Object.values(MODERATION_REASON_LABELS)[0]).toBe('string');
	});

	it('MODERATION_STATUS_LABELS covers all statuses', () => {
		const keys = Object.keys(MODERATION_STATUS_LABELS);
		expect(keys).toContain('open');
		expect(keys).toContain('pending');
		expect(keys).toContain('resolved');
		expect(keys).toContain('archived');
		expect(keys).toHaveLength(4);
	});

	it('MODERATION_EVENT_TYPE_LABELS covers all event types', () => {
		const keys = Object.keys(MODERATION_EVENT_TYPE_LABELS);
		expect(keys).toContain('message');
		expect(keys).toContain('evidence');
		expect(keys).toContain('moderation-action');
		expect(keys).toContain('auto-escalation');
		expect(keys).toContain('system');
	});

	it('SANCTION_LABELS and SANCTION_LABELS_LONG have matching keys', () => {
		const shortKeys = Object.keys(SANCTION_LABELS);
		const longKeys = Object.keys(SANCTION_LABELS_LONG);
		expect(shortKeys).toEqual(longKeys);
		expect(shortKeys).toContain('warn');
		expect(shortKeys).toContain('kick');
		expect(shortKeys).toContain('temp-ban');
		expect(shortKeys).toContain('perm-ban');
	});

	it('CHARACTER_STATUS_LABELS covers all statuses', () => {
		const keys = Object.keys(CHARACTER_STATUS_LABELS);
		expect(keys).toContain('in-service');
		expect(keys).toContain('kia');
		expect(keys).toContain('mia');
		expect(keys).toContain('retired');
		expect(keys).toContain('executed');
	});

	it('CHARACTER_STATUS_COLORS has CSS variable values', () => {
		expect(CHARACTER_STATUS_COLORS['in-service']).toBe('var(--accent)');
		// Others are hex codes
		expect(CHARACTER_STATUS_COLORS['kia']).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('CHARACTER_STATUS_EMBED_COLORS has numeric values', () => {
		for (const val of Object.values(CHARACTER_STATUS_EMBED_COLORS)) {
			expect(typeof val).toBe('number');
		}
	});

	it('INTELLIGENCE_TYPE_LABELS covers all types', () => {
		const keys = Object.keys(INTELLIGENCE_TYPE_LABELS);
		expect(keys).toContain('observation');
		expect(keys).toContain('sigint');
		expect(keys).toContain('humint');
		expect(keys).toContain('other');
	});

	it('INTELLIGENCE_CLASSIFICATION_LABELS covers all levels', () => {
		const keys = Object.keys(INTELLIGENCE_CLASSIFICATION_LABELS);
		expect(keys).toContain('public');
		expect(keys).toContain('restricted');
		expect(keys).toContain('classified');
		expect(keys).toContain('top-secret');
	});

	it('TIMELINE_TYPE_LABELS and TIMELINE_EMOJIS have matching keys', () => {
		const labelKeys = Object.keys(TIMELINE_TYPE_LABELS);
		const emojiKeys = Object.keys(TIMELINE_EMOJIS);
		expect(labelKeys).toEqual(emojiKeys);
	});
});

// ─── formatDuration ───

describe('formatDuration', () => {
	it('formats seconds to minutes', () => {
		expect(formatDuration(120)).toBe('2 min');
		expect(formatDuration(3599)).toBe('59 min');
	});

	it('formats seconds to hours', () => {
		expect(formatDuration(3600)).toBe('1h');
		expect(formatDuration(7200)).toBe('2h');
	});

	it('formats seconds to days', () => {
		expect(formatDuration(86400)).toBe('1j');
		expect(formatDuration(259200)).toBe('3j');
	});
});

describe('formatDurationLong', () => {
	it('formats seconds to long French strings', () => {
		expect(formatDurationLong(120)).toBe('2 minutes');
		expect(formatDurationLong(3600)).toBe('1 heures');
		expect(formatDurationLong(86400)).toBe('1 jours');
	});
});

// ─── Lexical Utilities ───

describe('lexicalToText', () => {
	it('returns empty string for falsy input', () => {
		expect(lexicalToText(null)).toBe('');
		expect(lexicalToText(undefined)).toBe('');
		expect(lexicalToText('')).toBe('');
	});

	it('returns the string if input is already a string', () => {
		expect(lexicalToText('hello')).toBe('hello');
	});

	it('extracts text from Lexical JSON', () => {
		const lexical = {
			root: {
				children: [
					{ children: [{ text: 'Hello' }] },
					{ children: [{ text: 'World' }] },
				],
			},
		};
		expect(lexicalToText(lexical)).toBe('Hello\nWorld');
	});

	it('handles nodes without children', () => {
		const lexical = {
			root: {
				children: [{ children: [{ text: 'Line 1' }] }, {}],
			},
		};
		expect(lexicalToText(lexical)).toBe('Line 1\n');
	});
});

describe('textToLexical', () => {
	it('returns undefined for empty input', () => {
		expect(textToLexical('')).toBeUndefined();
		expect(textToLexical('   ')).toBeUndefined();
	});

	it('creates valid Lexical JSON from text', () => {
		const result = textToLexical('Hello\nWorld');
		expect(result).toBeDefined();
		expect(result!.root.type).toBe('root');
		expect(result!.root.children).toHaveLength(2);
		expect(result!.root.children[0].type).toBe('paragraph');
		expect(result!.root.children[0].children[0].text).toBe('Hello');
		expect(result!.root.children[1].children[0].text).toBe('World');
	});

	it('roundtrips with lexicalToText', () => {
		const text = 'First paragraph\nSecond paragraph';
		const lexical = textToLexical(text);
		expect(lexicalToText(lexical)).toBe(text);
	});
});

// ─── serialize ───

describe('serialize', () => {
	it('strips non-serializable properties', () => {
		const input = { a: 1, b: 'hello', c: undefined };
		const result = serialize(input);
		expect(result).toEqual({ a: 1, b: 'hello' });
		expect(result).not.toHaveProperty('c');
	});

	it('handles nested objects', () => {
		const input = { nested: { deep: { value: 42 } } };
		expect(serialize(input)).toEqual({ nested: { deep: { value: 42 } } });
	});

	it('handles arrays', () => {
		const input = [1, 2, { a: 3 }];
		expect(serialize(input)).toEqual([1, 2, { a: 3 }]);
	});

	it('removes functions', () => {
		const input = { fn: () => 'nope', val: 1 };
		const result = serialize(input);
		expect(result).not.toHaveProperty('fn');
		expect(result.val).toBe(1);
	});

	it('creates a deep copy', () => {
		const input = { nested: { val: 1 } };
		const result = serialize(input);
		result.nested.val = 999;
		expect(input.nested.val).toBe(1);
	});
});
