import { describe, it, expect, beforeAll } from 'vitest';
import { signSession, verifySession, type SessionData } from '@/lib/session';

// Set a test secret so session signing works
beforeAll(() => {
	process.env.PAYLOAD_SECRET = 'test-secret-for-vitest-session-tests';
});

const mockSession: SessionData = {
	userId: 1,
	discordId: '123456789',
	discordUsername: 'testuser',
	discordAvatar: 'abc123',
	roles: ['role1', 'role2'],
};

describe('signSession', () => {
	it('returns a string with payload.signature format', () => {
		const token = signSession(mockSession);
		expect(typeof token).toBe('string');
		expect(token).toContain('.');
		const parts = token.split('.');
		expect(parts).toHaveLength(2);
		expect(parts[0].length).toBeGreaterThan(0);
		expect(parts[1].length).toBeGreaterThan(0);
	});

	it('produces different signatures for different data', () => {
		const token1 = signSession(mockSession);
		const token2 = signSession({ ...mockSession, discordId: '987654321' });
		expect(token1).not.toBe(token2);
	});

	it('produces consistent tokens for same data', () => {
		const token1 = signSession(mockSession);
		const token2 = signSession(mockSession);
		expect(token1).toBe(token2);
	});
});

describe('verifySession', () => {
	it('returns session data for valid token', () => {
		const token = signSession(mockSession);
		const result = verifySession(token);
		expect(result).not.toBeNull();
		expect(result!.userId).toBe(mockSession.userId);
		expect(result!.discordId).toBe(mockSession.discordId);
		expect(result!.discordUsername).toBe(mockSession.discordUsername);
		expect(result!.discordAvatar).toBe(mockSession.discordAvatar);
		expect(result!.roles).toEqual(mockSession.roles);
	});

	it('returns null for tampered payload', () => {
		const token = signSession(mockSession);
		const [, signature] = token.split('.');
		const tamperedPayload = Buffer.from(
			JSON.stringify({ ...mockSession, discordId: 'hacked' }),
		).toString('base64url');
		const result = verifySession(`${tamperedPayload}.${signature}`);
		expect(result).toBeNull();
	});

	it('returns null for tampered signature', () => {
		const token = signSession(mockSession);
		const [payload] = token.split('.');
		const result = verifySession(`${payload}.tampered-sig`);
		expect(result).toBeNull();
	});

	it('returns null for empty string', () => {
		expect(verifySession('')).toBeNull();
	});

	it('returns null for malformed token (no dot)', () => {
		expect(verifySession('nodothere')).toBeNull();
	});

	it('returns null for token with empty parts', () => {
		expect(verifySession('.')).toBeNull();
		expect(verifySession('.abc')).toBeNull();
		expect(verifySession('abc.')).toBeNull();
	});
});
