import { describe, it, expect } from 'vitest';
import { WARN_ESCALATION, getNextSanctionInfo } from '@/lib/moderation';

describe('WARN_ESCALATION', () => {
	it('has 7 escalation levels', () => {
		expect(Object.keys(WARN_ESCALATION)).toHaveLength(7);
	});

	it('level 1 is a warn', () => {
		expect(WARN_ESCALATION[1].action).toBe('warn');
		expect(WARN_ESCALATION[1].duration).toBeNull();
	});

	it('level 2 is a kick', () => {
		expect(WARN_ESCALATION[2].action).toBe('kick');
	});

	it('levels 3-6 are temp bans with increasing duration', () => {
		expect(WARN_ESCALATION[3].action).toBe('temp-ban');
		expect(WARN_ESCALATION[4].action).toBe('temp-ban');
		expect(WARN_ESCALATION[5].action).toBe('temp-ban');
		expect(WARN_ESCALATION[6].action).toBe('temp-ban');

		// Durations should increase
		expect(WARN_ESCALATION[3].duration!).toBeLessThan(WARN_ESCALATION[4].duration!);
		expect(WARN_ESCALATION[4].duration!).toBeLessThan(WARN_ESCALATION[5].duration!);
		expect(WARN_ESCALATION[5].duration!).toBeLessThan(WARN_ESCALATION[6].duration!);
	});

	it('level 7 is a permanent ban', () => {
		expect(WARN_ESCALATION[7].action).toBe('perm-ban');
		expect(WARN_ESCALATION[7].duration).toBeNull();
	});

	it('all levels have a label', () => {
		for (const level of Object.values(WARN_ESCALATION)) {
			expect(typeof level.label).toBe('string');
			expect(level.label.length).toBeGreaterThan(0);
		}
	});
});

describe('getNextSanctionInfo', () => {
	it('returns warn for first offense (0 current warns)', () => {
		const info = getNextSanctionInfo(0);
		expect(info.action).toBe('warn');
	});

	it('returns kick for second offense (1 current warn)', () => {
		const info = getNextSanctionInfo(1);
		expect(info.action).toBe('kick');
	});

	it('returns temp-ban for 3rd offense', () => {
		const info = getNextSanctionInfo(2);
		expect(info.action).toBe('temp-ban');
		expect(info.duration).toBe(86400); // 24h
	});

	it('returns perm-ban for 7+ offenses', () => {
		expect(getNextSanctionInfo(6).action).toBe('perm-ban');
		expect(getNextSanctionInfo(7).action).toBe('perm-ban');
		expect(getNextSanctionInfo(100).action).toBe('perm-ban');
	});
});
