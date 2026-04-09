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

describe('@everyone parsing in messages POST handler', () => {
	it('declares the @everyone regex at word boundaries', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		// Regex: @everyone at start-of-string or after whitespace, ending at \b or EOS.
		expect(content).toMatch(/@everyone/);
		expect(content).toMatch(/\(\?:\^\|\\s\)@everyone\(\?:\\b\|\$\)/);
	});

	it('expands @everyone to channel members in non-DM channels', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		// The handler must branch on channel.type !== 'dm' before expanding.
		expect(content).toMatch(/channel\.type[^'"]*['"]dm['"]/);
		// isEveryoneMention flag must exist and be set to true in the expansion block.
		expect(content).toContain('isEveryoneMention');
		expect(content).toMatch(/isEveryoneMention\s*=\s*true/);
	});

	it('excludes the sender from the expanded @everyone member list', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		// The expansion loop must skip the sender — look for a continue/skip
		// guarded by a comparison with eligibility.character.id.
		expect(content).toMatch(/eligibility\.character\.id/);
		// And the expansion must dedupe against existing mentionIds to avoid
		// double-adding an explicitly @-mentioned user.
		expect(content).toMatch(/mentionIds\.includes/);
	});

	it('skips offline Discord DM fanout when @everyone is set', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		// The offline-DM loop must be guarded by !isEveryoneMention.
		expect(content).toMatch(/!\s*isEveryoneMention/);
	});
});

describe('@everyone in MessageComposer', () => {
	it('offers an @everyone suggestion in non-DM channels', () => {
		const content = readSrc('components/comms/MessageComposer.tsx');
		// A synthetic @everyone entry (label with the literal text).
		expect(content).toContain('@everyone');
		// Must be gated on non-DM channel type — the composer receives the
		// channel type via props; a guard should reference it.
		expect(content).toMatch(/channelType|channel\.type|['"]dm['"]/);
	});

	it('inserts the literal text "@everyone " on selection, not a bracketed id', () => {
		const content = readSrc('components/comms/MessageComposer.tsx');
		// Insertion must be the literal "@everyone " string, not the
		// @[Name](id) format used for character mentions.
		expect(content).toMatch(/['"]@everyone ['"]/);
	});

	it('passes channelType from CommsLayout to MessageComposer', () => {
		const layout = readSrc('components/comms/CommsLayout.tsx');
		// CommsLayout must forward channelType to MessageComposer
		expect(layout).toMatch(/channelType=\{[^}]*activeChannel[^}]*type/);
	});
});

describe('Mod notifications/pending endpoint — duplicate delivery fix', () => {
	it('clamps the query with a less_than_equal upper bound on createdAt', () => {
		const content = readSrc('app/api/roleplay/notifications/pending/route.ts');
		expect(content).toContain('less_than_equal');
		expect(content).toMatch(
			/less_than_equal:\s*new Date\(now\)\.toISOString\(\)/,
		);
	});

	it('returns a stable id on each notification so the mod can dedupe', () => {
		const content = readSrc('app/api/roleplay/notifications/pending/route.ts');
		expect(content).toContain('id: Number(m.id)');
	});

	it('documents the id field in the response JSDoc for dedupe', () => {
		const content = readSrc('app/api/roleplay/notifications/pending/route.ts');
		expect(content).toMatch(/id:\s*number/);
		expect(content).toMatch(/dedupe|dedup/);
	});
});

describe('CommsLayout sound-dedup race fix', () => {
	it('advances seen.set for a channel before playing its sound', () => {
		const content = readSrc('components/comms/CommsLayout.tsx');
		const start = content.indexOf('const loadChannels');
		const end = content.indexOf('const loadMessages');
		expect(start).toBeGreaterThan(-1);
		expect(end).toBeGreaterThan(start);
		const body = content.slice(start, end);

		const seenSetIdx = body.indexOf('seen.set(ch.id, ch.lastMessageAt)');
		const radioPingIdx = body.indexOf('playRadioPing()');
		const notifIdx = body.indexOf('playNotification()');
		expect(seenSetIdx).toBeGreaterThan(-1);
		expect(radioPingIdx).toBeGreaterThan(-1);
		expect(notifIdx).toBeGreaterThan(-1);
		expect(seenSetIdx).toBeLessThan(radioPingIdx);
		expect(seenSetIdx).toBeLessThan(notifIdx);
	});
});

describe('GlobalCommsNotifier sound-dedup race fix', () => {
	it('advances seen.set for a channel before playing its sound', () => {
		const content = readSrc('components/comms/GlobalCommsNotifier.tsx');
		const start = content.indexOf('const poll = async');
		expect(start).toBeGreaterThan(-1);
		const slice = content.slice(start, start + 2000);

		const seenSetIdx = slice.indexOf('seen.set(ch.id, ch.lastMessageAt)');
		const radioPingIdx = slice.indexOf('playRadioPing()');
		const notifIdx = slice.indexOf('playNotification()');
		expect(seenSetIdx).toBeGreaterThan(-1);
		expect(radioPingIdx).toBeGreaterThan(-1);
		expect(notifIdx).toBeGreaterThan(-1);
		expect(seenSetIdx).toBeLessThan(radioPingIdx);
		expect(seenSetIdx).toBeLessThan(notifIdx);
	});
});

describe('GlobalCommsNotifier /comms-entry reset', () => {
	it('clears seen and resets initialized when entering a /comms page', () => {
		const content = readSrc('components/comms/GlobalCommsNotifier.tsx');
		// The `if (onCommsPage)` branch must reset both refs so that on exit
		// the first poll re-seeds silently instead of replaying messages
		// already seen in CommsLayout.
		const branchStart = content.indexOf('if (onCommsPage)');
		expect(branchStart).toBeGreaterThan(-1);
		const branch = content.slice(branchStart, branchStart + 600);
		expect(branch).toContain('seenRef.current = new Map()');
		expect(branch).toContain('initializedRef.current = false');
	});
});

describe('PersonnelFilters NPC tab', () => {
	it('bucketing logic separates npcs from personnel and targets', () => {
		const content = readSrc('components/roleplay/PersonnelFilters.tsx');
		// Derivation rule: NPC = !discordId && !isTarget
		expect(content).toMatch(/else if \(!c\.discordId\)\s*{?\s*npcs\.push\(c\)/);
		// Tab union includes 'npcs'
		expect(content).toMatch(/'personnel'\s*\|\s*'targets'\s*\|\s*'npcs'/);
		// Tab is admin-gated
		expect(content).toMatch(/if \(isAdmin\)[\s\S]{0,200}npcs[\s\S]{0,200}label:\s*'PNJ'/);
	});
});

describe('CommsMessages postedAsGm field', () => {
	it('defines a postedAsGm checkbox field', () => {
		const content = readSrc('collections/CommsMessages.ts');
		expect(content).toMatch(/name:\s*'postedAsGm'/);
		expect(content).toMatch(/postedAsGm'[^}]*type:\s*'checkbox'/);
	});

	it('has a migration for posted_as_gm column', () => {
		const content = readSrc('migrations/20260409_180000_comms_messages_posted_as_gm.ts');
		expect(content).toContain('ALTER TABLE "comms_messages"');
		expect(content).toContain('"posted_as_gm" boolean');
		expect(content).toContain('DEFAULT false');
	});
});

describe('api-auth requireGmAdmin', () => {
	it('exports a requireGmAdmin helper that returns AdminContext or NextResponse', () => {
		const content = readSrc('lib/api-auth.ts');
		expect(content).toMatch(/export async function requireGmAdmin/);
		expect(content).toMatch(/requireGmAdmin[\s\S]{0,500}checkAdminPermissions/);
		expect(content).toMatch(/requireGmAdmin[\s\S]{0,500}isAdmin/);
	});
});

describe('GET /api/roleplay/characters/npcs', () => {
	it('is admin-gated via requireGmAdmin', () => {
		const content = readSrc('app/api/roleplay/characters/npcs/route.ts');
		expect(content).toContain("from '@/lib/api-auth'");
		expect(content).toContain('requireGmAdmin');
		expect(content).toContain('isErrorResponse');
	});

	it('filters non-archived characters with no discordId', () => {
		const content = readSrc('app/api/roleplay/characters/npcs/route.ts');
		expect(content).toMatch(/discordId[\s\S]{0,80}exists:\s*false/);
		expect(content).toMatch(/isArchived[\s\S]{0,80}not_equals:\s*true/);
	});
});

describe('comms.ts listChannelsForGmAdmin', () => {
	it('exports listChannelsForGmAdmin that merges member channels and non-DM bypass channels', () => {
		const content = readSrc('lib/comms.ts');
		expect(content).toMatch(/export async function listChannelsForGmAdmin/);
		// Must exclude DMs
		expect(content).toMatch(/listChannelsForGmAdmin[\s\S]{0,600}'dm'/);
		// Must tag bypass channels with viewerIsGhost
		expect(content).toMatch(/viewerIsGhost/);
	});
});

describe('GET /api/comms/channels ?gm=1', () => {
	it('branches on gm=1 query param using listChannelsForGmAdmin', () => {
		const content = readSrc('app/api/comms/channels/route.ts');
		expect(content).toMatch(/searchParams\.get\(['"]gm['"]\)/);
		expect(content).toContain('listChannelsForGmAdmin');
		expect(content).toContain('requireGmAdmin');
	});

	it('preserves viewerIsGhost on enriched channels', () => {
		const content = readSrc('app/api/comms/channels/route.ts');
		expect(content).toMatch(/viewerIsGhost/);
	});
});

describe('GET /api/comms/channels/[id]/messages GM read bypass', () => {
	it('admins with gm=1 bypass the membership 403', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		expect(content).toMatch(/searchParams\.get\(['"]gm['"]\)/);
		expect(content).toContain('checkAdminPermissions');
	});

	it('strips postedAsGm from response when viewer is not admin', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		// Admin check before attaching postedAsGm to response items
		expect(content).toMatch(/postedAsGm[\s\S]{0,200}isAdmin/);
	});
});

describe('GET /api/roleplay/notifications/pending', () => {
	it('never includes postedAsGm in response (mod audience is non-admin)', () => {
		const content = readSrc('app/api/roleplay/notifications/pending/route.ts');
		// The field must not appear at all in the response mapping
		expect(content).not.toMatch(/postedAsGm:\s*[^,]/);
	});
});

describe('POST /api/comms/channels/[id]/messages GM impersonation', () => {
	it('gates gmMode requests with admin check', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		expect(content).toMatch(/gmMode[\s\S]{0,400}checkAdminPermissions/);
	});

	it('rejects impersonation of Discord-linked characters', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		expect(content).toMatch(/impersonateCharacterId[\s\S]{0,600}discordId/);
		expect(content).toMatch(/Impersonation limitée aux PNJ et cibles/);
	});

	it('writes postedAsGm true and skips membership check when gmMode', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		expect(content).toMatch(/postedAsGm:\s*true/);
		// Membership gate must be conditional on !gmMode
		expect(content).toMatch(/!gmMode[\s\S]{0,300}Non membre/);
	});

	it('does not mutate channel.members when gmMode', () => {
		const content = readSrc('app/api/comms/channels/[id]/messages/route.ts');
		expect(content).not.toMatch(/members\.push.*impersonate/);
	});
});

describe('useGmMode context', () => {
	it('exports GmModeProvider and useGmMode', () => {
		const content = readSrc('components/comms/useGmMode.tsx');
		expect(content).toContain('export function GmModeProvider');
		expect(content).toContain('export function useGmMode');
	});

	it('fetches the npc list on enable and exposes effectiveCharacterId', () => {
		const content = readSrc('components/comms/useGmMode.tsx');
		expect(content).toContain("'/api/roleplay/characters/npcs'");
		expect(content).toContain('effectiveCharacterId');
		expect(content).toContain('overrideCharacterId ?? defaultCharacterId');
	});
});

describe('AdminBar component', () => {
	it('is admin-gated via isAdmin prop', () => {
		const content = readSrc('components/comms/AdminBar.tsx');
		expect(content).toMatch(/if \(!isAdmin\)\s*return null/);
	});

	it('uses useGmMode context', () => {
		const content = readSrc('components/comms/AdminBar.tsx');
		expect(content).toContain("from './useGmMode'");
		expect(content).toContain('useGmMode()');
	});

	it('renders MJ toggle and picker', () => {
		const content = readSrc('components/comms/AdminBar.tsx');
		expect(content).toContain('MODE MJ');
		expect(content).toContain('Incarner');
		expect(content).toContain('Quitter MJ');
	});
});

describe('CommsLayout GM wiring', () => {
	it('wraps return in GmModeProvider', () => {
		const content = readSrc('components/comms/CommsLayout.tsx');
		expect(content).toContain("from './useGmMode'");
		expect(content).toContain('GmModeProvider');
		expect(content).toContain('<AdminBar');
	});

	it('loadChannels appends ?gm=1 when enabled', () => {
		const content = readSrc('components/comms/CommsLayout.tsx');
		expect(content).toMatch(/\/api\/comms\/channels[\s\S]{0,200}\?gm=1/);
	});

	it('handleSend includes gmMode and impersonateCharacterId when enabled', () => {
		const content = readSrc('components/comms/CommsLayout.tsx');
		expect(content).toContain('gmMode:');
		expect(content).toContain('impersonateCharacterId:');
	});
});

describe('MessageComposer GM puppet chip', () => {
	it('renders puppet chip when gm.enabled', () => {
		const content = readSrc('components/comms/MessageComposer.tsx');
		expect(content).toContain("from './useGmMode'");
		expect(content).toContain('useGmMode()');
		expect(content).toContain('comms-composer-puppet-chip');
	});
});
