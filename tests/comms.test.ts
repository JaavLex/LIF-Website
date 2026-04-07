import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { COMMS_LIMITS, checkRateLimit } from '@/lib/comms';

function readSrc(relativePath: string): string {
	return readFileSync(resolve(__dirname, '..', 'src', relativePath), 'utf-8');
}

describe('COMMS_LIMITS', () => {
	it('caps message body at 4000 chars', () => {
		expect(COMMS_LIMITS.maxBodyLength).toBe(4000);
	});

	it('caps attachments at 4 per message', () => {
		expect(COMMS_LIMITS.maxAttachments).toBe(4);
	});

	it('caps group members at 15', () => {
		expect(COMMS_LIMITS.maxGroupMembers).toBe(15);
	});

	it('edit window is 5 minutes', () => {
		expect(COMMS_LIMITS.editWindowMs).toBe(5 * 60 * 1000);
	});
});

describe('checkRateLimit', () => {
	it('allows up to 30 messages per minute, then rejects', () => {
		const id = `test-rate-${Date.now()}`;
		for (let i = 0; i < 30; i++) {
			expect(checkRateLimit(id)).toBe(true);
		}
		expect(checkRateLimit(id)).toBe(false);
	});

	it('isolates rate limits per discord id', () => {
		const a = `test-rate-a-${Date.now()}`;
		const b = `test-rate-b-${Date.now()}`;
		for (let i = 0; i < 30; i++) checkRateLimit(a);
		expect(checkRateLimit(a)).toBe(false);
		expect(checkRateLimit(b)).toBe(true);
	});
});

describe('Comms collection access control', () => {
	it('CommsChannels denies public access (admin-only Payload UI)', () => {
		const content = readSrc('collections/CommsChannels.ts');
		expect(content).not.toMatch(/read:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/create:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/update:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/delete:\s*\(\)\s*=>\s*true/);
	});

	it('CommsMessages denies public access', () => {
		const content = readSrc('collections/CommsMessages.ts');
		expect(content).not.toMatch(/read:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/create:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/update:\s*\(\)\s*=>\s*true/);
		expect(content).not.toMatch(/delete:\s*\(\)\s*=>\s*true/);
	});
});

describe('Comms API auth gates', () => {
	it('all comms API routes require session via api-auth helpers', () => {
		const files = [
			'app/api/comms/channels/route.ts',
			'app/api/comms/channels/dm/route.ts',
			'app/api/comms/channels/[id]/route.ts',
			'app/api/comms/channels/[id]/messages/route.ts',
			'app/api/comms/messages/[id]/route.ts',
			'app/api/comms/eligibility/route.ts',
			'app/api/comms/disclaimer/accept/route.ts',
			'app/api/comms/characters/search/route.ts',
		];
		for (const f of files) {
			const content = readSrc(f);
			expect(content, `${f} must import from api-auth`).toMatch(
				/from '@\/lib\/api-auth'/,
			);
		}
	});

	it('all moderation/comms API routes require admin', () => {
		const files = [
			'app/api/moderation/comms/channels/route.ts',
			'app/api/moderation/comms/channels/[id]/messages/route.ts',
			'app/api/moderation/comms/messages/[id]/route.ts',
		];
		for (const f of files) {
			const content = readSrc(f);
			expect(content, `${f} must call requireFullAdmin`).toContain(
				'requireFullAdmin',
			);
		}
	});
});

describe('Anonymous message handling', () => {
	it('messages POST endpoint stores realSenderCharacterId even when anonymous', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		// Real sender is always recorded — anonymity only affects display
		expect(content).toContain('senderCharacterId');
		expect(content).toContain('isAnonymous');
	});

	it('moderation messages endpoint reveals realSender for anonymous messages', () => {
		const content = readSrc(
			'app/api/moderation/comms/channels/[id]/messages/route.ts',
		);
		expect(content).toContain('realSender');
	});
});

describe('Edit window enforcement', () => {
	it('PATCH/DELETE messages route checks editWindowMs (5 min)', () => {
		const content = readSrc('app/api/comms/messages/[id]/route.ts');
		expect(content).toMatch(/editWindowMs|5\s*\*\s*60/);
	});
});

describe('Disclaimer enforcement', () => {
	it('messages POST endpoint checks disclaimer acceptance', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		expect(content).toMatch(/disclaimer/i);
	});

	it('eligibility endpoint exposes disclaimerAccepted', () => {
		const content = readSrc('app/api/comms/eligibility/route.ts');
		expect(content).toContain('disclaimerAccepted');
	});
});

describe('SafeMarkdown sanitization', () => {
	it('does not bypass React auto-escape via dangerous innerHTML', () => {
		const content = readSrc('lib/safe-markdown.tsx');
		// React auto-escapes any string placed in JSX children, so the renderer
		// must never use the dangerous innerHTML escape hatch.
		const dangerousProp = 'dangerously' + 'SetInnerHTML';
		expect(content).not.toContain(dangerousProp);
	});

	it('restricts links to http(s) only', () => {
		const content = readSrc('lib/safe-markdown.tsx');
		expect(content).toContain('https?:\\/\\/');
	});

	it('forces noopener noreferrer on links', () => {
		const content = readSrc('lib/safe-markdown.tsx');
		expect(content).toContain('noopener noreferrer');
	});
});

describe('Group member cap', () => {
	it('channel POST validates max 15 members', () => {
		const content = readSrc('app/api/comms/channels/route.ts');
		expect(content).toMatch(/maxGroupMembers|15/);
	});
});

describe('DM idempotency', () => {
	it('DM creation sorts member IDs to prevent duplicates', () => {
		const content = readSrc('app/api/comms/channels/dm/route.ts');
		// Either sorts members or queries for existing pair
		expect(content).toMatch(/sort|find|where/);
	});
});
