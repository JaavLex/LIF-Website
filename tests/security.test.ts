import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { glob } from 'vitest/utils' with { type: 'not-available' };

/**
 * Security regression tests.
 * These verify that security-critical patterns remain in the codebase
 * and dangerous patterns are not reintroduced.
 */

function readSrc(relativePath: string): string {
	return readFileSync(resolve(__dirname, '..', 'src', relativePath), 'utf-8');
}

describe('Collection access control', () => {
	it('ModerationCases requires admin for read/create/update/delete', () => {
		const content = readSrc('collections/ModerationCases.ts');
		// Must NOT contain () => true for any access method
		expect(content).not.toMatch(/read:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/create:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/update:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/delete:\s*\(\)\s*=>\s*true/);
		// Must check req.user.role
		expect(content).toContain("req.user?.role === 'admin'");
	});

	it('ModerationEvents requires admin for read/create/delete', () => {
		const content = readSrc('collections/ModerationEvents.ts');
		expect(content).not.toMatch(/read:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/create:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/delete:\s*\(\)\s*=>\s*true/);
		expect(content).toContain("req.user?.role === 'admin'");
	});

	it('ModerationSanctions requires admin', () => {
		const content = readSrc('collections/ModerationSanctions.ts');
		expect(content).not.toMatch(/read:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/create:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/delete:\s*\(\)\s*=>\s*true/);
		expect(content).toContain("req.user?.role === 'admin'");
	});

	it('BankHistory requires admin for read/create/delete', () => {
		const content = readSrc('collections/BankHistory.ts');
		expect(content).not.toMatch(/read:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/create:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/delete:\s*\(\)\s*=>\s*true/);
		expect(content).toContain("req.user?.role === 'admin'");
	});

	it('Characters requires authentication to create', () => {
		const content = readSrc('collections/Characters.ts');
		// create must NOT be open
		expect(content).not.toMatch(/create:\s*\(\)\s*=>\s*true/);
		// Must check req.user
		expect(content).toMatch(/create:\s*\(\{.*req.*\}\)\s*=>\s*!!req\.user/s);
	});
});

describe('Cron secret', () => {
	it('auto-sync does not have hardcoded fallback secret', () => {
		const content = readSrc('app/api/roleplay/characters/auto-sync/route.ts');
		expect(content).not.toContain("'internal-cron-secret'");
		expect(content).not.toContain('"internal-cron-secret"');
		// Must check CRON_SECRET env var
		expect(content).toContain('process.env.CRON_SECRET');
	});
});

describe('Admin permission defaults', () => {
	it('defaults to limited, not full', () => {
		const content = readSrc('lib/admin.ts');
		expect(content).toContain("|| 'limited'");
		expect(content).not.toMatch(/permissionLevel\s*\|\|\s*'full'/);
	});
});

describe('Moderation layout auth gate', () => {
	it('has server-side auth check in moderation layout', () => {
		const content = readSrc('app/(frontend)/moderation/layout.tsx');
		expect(content).toContain('checkAdminPermissions');
		expect(content).toContain("redirect(");
	});
});

describe('No hardcoded secrets in source', () => {
	const srcFiles = [
		'lib/session.ts',
		'lib/admin.ts',
		'lib/api-auth.ts',
		'lib/moderation.ts',
		'app/api/roleplay/characters/auto-sync/route.ts',
	];

	for (const file of srcFiles) {
		it(`${file} has no hardcoded tokens or passwords`, () => {
			const content = readSrc(file);
			// Should not contain Discord bot tokens (starts with M and has dots)
			expect(content).not.toMatch(/M[A-Za-z0-9]{23,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/);
			// Should not contain known test secrets
			expect(content).not.toContain('LIF-Arma-Production-Secret');
			expect(content).not.toContain('LIFWebsite2026');
		});
	}
});

describe('Upload route security', () => {
	it('rejects SVG uploads', () => {
		const content = readSrc('app/api/upload/route.ts');
		expect(content).toMatch(/svg/i);
	});

	it('requires authentication', () => {
		const content = readSrc('app/api/upload/route.ts');
		expect(content).toMatch(/requireSession|getSession|verifySession/);
	});
});
