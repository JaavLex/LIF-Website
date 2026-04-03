import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

/**
 * Import and structure validation tests.
 * Verify that shared utilities are used consistently
 * and no regressions (duplicate definitions) are introduced.
 */

const SRC_DIR = resolve(__dirname, '..', 'src');

function getAllTsFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (entry === 'node_modules' || entry === '.next' || entry === 'payload-types.ts')
			continue;
		const stat = statSync(full);
		if (stat.isDirectory()) {
			files.push(...getAllTsFiles(full));
		} else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
			files.push(full);
		}
	}
	return files;
}

describe('No duplicate textToLexical/lexicalToText definitions', () => {
	it('only constants.ts defines textToLexical', () => {
		const files = getAllTsFiles(SRC_DIR);
		const definers = files.filter((f) => {
			if (f.endsWith('constants.ts')) return false;
			const content = readFileSync(f, 'utf-8');
			return /function textToLexical\b/.test(content);
		});
		expect(definers).toEqual([]);
	});

	it('only constants.ts defines lexicalToText', () => {
		const files = getAllTsFiles(SRC_DIR);
		const definers = files.filter((f) => {
			if (f.endsWith('constants.ts')) return false;
			const content = readFileSync(f, 'utf-8');
			return /function lexicalToText\b/.test(content);
		});
		expect(definers).toEqual([]);
	});
});

describe('No JSON.parse(JSON.stringify()) anti-pattern in pages', () => {
	it('page files use serialize() instead', () => {
		const files = getAllTsFiles(SRC_DIR);
		const pageFiles = files.filter(
			(f) => f.includes('/page.tsx') || f.includes('/page.ts'),
		);

		const violators = pageFiles.filter((f) => {
			const content = readFileSync(f, 'utf-8');
			return content.includes('JSON.parse(JSON.stringify(');
		});

		expect(violators).toEqual([]);
	});
});

describe('API routes use shared auth middleware', () => {
	it('no custom auth boilerplate in API routes', () => {
		const files = getAllTsFiles(SRC_DIR);
		const apiRoutes = files.filter(
			(f) => f.includes('/api/') && f.endsWith('route.ts'),
		);

		// Check that API routes don't define their own cookie/session logic
		// (they should import from api-auth.ts)
		const routesWithInlineAuth = apiRoutes.filter((f) => {
			const content = readFileSync(f, 'utf-8');
			// Skip the auth API routes themselves and the auto-sync route (uses CRON_SECRET)
			if (f.includes('/api/auth/')) return false;
			if (f.includes('auto-sync')) return false;
			// Check for inline cookie reading without importing api-auth
			const hasInlineCookies =
				content.includes("cookies()") &&
				!content.includes('api-auth') &&
				!content.includes('requireSession') &&
				!content.includes('requireAdmin') &&
				!content.includes('getSession');
			return hasInlineCookies;
		});

		expect(routesWithInlineAuth).toEqual([]);
	});
});

describe('Component file size limits', () => {
	it('no component file exceeds 1500 lines', () => {
		const files = getAllTsFiles(resolve(SRC_DIR, 'components'));
		const oversized = files
			.map((f) => ({
				file: f.replace(SRC_DIR + '/', ''),
				lines: readFileSync(f, 'utf-8').split('\n').length,
			}))
			.filter((f) => f.lines > 1500);

		if (oversized.length > 0) {
			const msg = oversized
				.map((f) => `${f.file}: ${f.lines} lines`)
				.join('\n');
			expect.fail(`Components exceeding 800 lines:\n${msg}`);
		}
	});
});
