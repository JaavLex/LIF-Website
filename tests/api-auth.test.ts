import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import { isErrorResponse } from '@/lib/api-auth';

describe('isErrorResponse', () => {
	it('returns true for NextResponse instances', () => {
		const response = NextResponse.json({ error: 'test' }, { status: 401 });
		expect(isErrorResponse(response)).toBe(true);
	});

	it('returns false for session data objects', () => {
		const session = {
			userId: 1,
			discordId: '123',
			discordUsername: 'test',
			discordAvatar: 'abc',
			roles: [],
		};
		expect(isErrorResponse(session)).toBe(false);
	});

	it('returns false for admin context objects', () => {
		const adminCtx = {
			session: {
				userId: 1,
				discordId: '123',
				discordUsername: 'test',
				discordAvatar: 'abc',
				roles: [],
			},
			permissions: {
				isAdmin: true,
				level: 'full' as const,
				roleName: 'Admin',
			},
		};
		expect(isErrorResponse(adminCtx)).toBe(false);
	});
});
