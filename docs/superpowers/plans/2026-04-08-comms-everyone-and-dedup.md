# /comms @everyone + Duplicate Notification Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1.6.44 — add an `@everyone` mention in non-DM `/comms` channels (no Discord DM fanout) and fix the duplicate notification bugs on both the mod polling API and the in-browser sound pipeline.

**Architecture:** All changes are to existing route handlers and React components. No DB migrations, no new collections, no new services. The mod (AR-DiscordLink) gets a documented but not-implemented-here change to dedupe by notification ID on its side.

**Tech Stack:** Next.js 15 app router, Payload CMS (postgres), React 19, Vitest for tests. Tests in `tests/` use the `readSrc()` helper to string-match against source files (no DB, no runtime).

**Reference spec:** `docs/superpowers/specs/2026-04-08-comms-everyone-and-dedup-design.md`.

---

## File Structure

| File | Role | Action |
|---|---|---|
| `src/app/api/comms/channels/[id]/messages/route.ts` | POST handler that parses message body for mentions and fans out Discord DMs | Modify: add `@everyone` parser, set `isEveryoneMention` flag, skip DM fanout when flag true |
| `src/app/api/roleplay/notifications/pending/route.ts` | Mod polling endpoint | Modify: clamp query upper bound to `now`, add stable `id` per notification |
| `src/components/comms/MessageComposer.tsx` | Message composer with `@` autocomplete | Modify: synthesize `@everyone` entry at top of suggestions in non-DM channels |
| `src/components/comms/CommsLayout.tsx` | `/comms` page root, polling loops, toast+sound dispatcher | Modify: in `loadChannels`, advance `seen` before playing sound (race fix) |
| `src/components/comms/GlobalCommsNotifier.tsx` | Site-wide comms toaster on non-`/comms` pages | Modify: same race fix — advance `seen` before playing sound |
| `tests/comms.test.ts` | Comms unit tests (source-string-matching pattern) | Modify: add ~9 new cases |
| `src/lib/version.ts` | Version constant + changelog | Modify: bump to 1.6.44 with changelog entry |

Each file has one clear job. No new files created — everything slots into existing modules with bounded, focused edits.

---

## Task 1: Add `@everyone` parser in messages POST handler

**Files:**
- Modify: `src/app/api/comms/channels/[id]/messages/route.ts:266-275`
- Test: `tests/comms.test.ts` (append new `describe` block)

- [ ] **Step 1: Write failing tests for the parser**

Append this new `describe` block to `tests/comms.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run tests/comms.test.ts -t "@everyone parsing"
```

Expected: 4 failing tests. (Messages file does not yet contain `@everyone` / `isEveryoneMention` / `!isEveryoneMention`.)

- [ ] **Step 3: Implement the parser**

Open `src/app/api/comms/channels/[id]/messages/route.ts`. Find the existing mention parse block (around line 266):

```typescript
// Parse @mentions: format @[Name](id)
const mentionIds: number[] = [];
const mentionRegex = /@\[[^\]]+\]\((\d+)\)/g;
const matches = text.matchAll(mentionRegex);
for (const match of matches) {
    const n = Number(match[1]);
    if (!isNaN(n) && members.map(Number).includes(n)) {
        mentionIds.push(n);
    }
}
```

Replace it with:

```typescript
// Parse @mentions: format @[Name](id)
const mentionIds: number[] = [];
const mentionRegex = /@\[[^\]]+\]\((\d+)\)/g;
const matches = text.matchAll(mentionRegex);
for (const match of matches) {
    const n = Number(match[1]);
    if (!isNaN(n) && members.map(Number).includes(n)) {
        mentionIds.push(n);
    }
}

// Parse @everyone — expand to all channel members in non-DM channels.
// Word-boundary match: `hey@everyone` / `foreveryoneelse` do NOT trigger.
// Sender is excluded; explicit @[Name] mentions are merged without dupes.
// DMs silently ignore @everyone (literal text is preserved in the body).
const EVERYONE_RE = /(?:^|\s)@everyone(?:\b|$)/;
let isEveryoneMention = false;
if (String(channel.type) !== 'dm' && EVERYONE_RE.test(text)) {
    isEveryoneMention = true;
    const senderId = Number(eligibility.character.id);
    for (const m of members) {
        const n = Number(m);
        if (!Number.isFinite(n)) continue;
        if (n === senderId) continue;
        if (!mentionIds.includes(n)) mentionIds.push(n);
    }
}
```

- [ ] **Step 4: Find the offline DM fanout loop and guard it with `!isEveryoneMention`**

Still in `src/app/api/comms/channels/[id]/messages/route.ts`, locate the offline Discord DM fanout block (around lines 354–380; look for `sendDiscordDM` / iteration over `mentionIds`). Wrap the entire loop in an `if (!isEveryoneMention) { ... }` guard. Example pattern:

```typescript
// Fan out offline Discord DMs only for individual mentions. When the sender
// used @everyone we already deliver the message via in-browser sounds and
// the mod API — per-person DM spam on top would be noise.
if (!isEveryoneMention) {
    for (const mid of mentionIds) {
        // ...existing offline check + sendDiscordDM call...
    }
}
```

Do not change anything inside the loop body. Only add the outer guard.

- [ ] **Step 5: Run the tests and verify they pass**

Run:
```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run tests/comms.test.ts -t "@everyone parsing"
```

Expected: 4 passing tests.

- [ ] **Step 6: Run the full test suite to verify no regressions**

Run:
```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run
```

Expected: all tests pass (92 previous + 4 new = 96).

- [ ] **Step 7: Commit**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && git add \
  src/app/api/comms/channels/[id]/messages/route.ts \
  tests/comms.test.ts && \
git commit -m "feat(comms): parse @everyone in non-DM channels, skip DM fanout

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add `@everyone` entry to the composer autocomplete

**Files:**
- Modify: `src/components/comms/MessageComposer.tsx`
- Test: `tests/comms.test.ts` (append)

- [ ] **Step 1: Write failing tests for the composer**

Append to `tests/comms.test.ts`:

```typescript
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
});
```

- [ ] **Step 2: Inspect MessageComposer to understand the current prop surface and suggestion list shape**

Read `src/components/comms/MessageComposer.tsx` in full. Note:
- The prop used for channel members (e.g. `members: Array<{ id; fullName; avatarUrl }>`).
- Whether the component already receives a `channelType` prop or needs a new one added.
- Where the suggestion-list array is built (look for `.filter` over members + `query` state).
- Where a selection is inserted into the textarea (look for `setValue` / `insertText`).

- [ ] **Step 3: Add `channelType` prop if missing, and thread it from CommsLayout**

If `MessageComposer` does not already receive the active channel's `type`, add a prop `channelType: string` to its `Props` interface. Then in `src/components/comms/CommsLayout.tsx`, find where `<MessageComposer ... />` is rendered and pass the active channel's type:

```tsx
<MessageComposer
  {...existingProps}
  channelType={channels.find((c) => c.id === activeId)?.type ?? 'group'}
/>
```

Use `channels.find((c) => c.id === activeId)?.type` to derive it. Default to `'group'` if not found (safer than `'dm'` — avoids accidentally hiding the entry).

- [ ] **Step 4: Synthesize the `@everyone` entry**

In the suggestion-list build site of `MessageComposer.tsx`, prepend a synthetic entry whenever:
- `channelType !== 'dm'`, AND
- the current query string is a prefix of `'everyone'` (case-insensitive).

Use a sentinel `id === -1` (or a dedicated `isEveryone: true` field) so the render/insert path can distinguish the synthetic entry from real character suggestions.

```tsx
// Synthetic @everyone entry for non-DM channels. Shown while the user is
// still typing a prefix of "everyone" (covers @, @e, @ev, …, @everyone).
const showEveryone =
  channelType !== 'dm' &&
  'everyone'.startsWith(query.toLowerCase());

const suggestions: Array<
  | { isEveryone: true }
  | { isEveryone?: false; id: number; fullName: string; avatarUrl: string | null }
> = [
  ...(showEveryone ? [{ isEveryone: true as const }] : []),
  ...members
    .filter((m) => m.fullName.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8),
];
```

(Adjust field names to match the component's existing types — the critical part is: the synthetic entry goes at the top, gated on channel type and query prefix.)

- [ ] **Step 5: Render the synthetic entry and handle selection**

In the suggestion-list render loop, branch on the entry shape:

```tsx
{suggestions.map((entry, i) =>
  entry.isEveryone ? (
    <button
      key="everyone"
      type="button"
      className={`mention-suggestion ${i === activeIndex ? 'active' : ''}`}
      onClick={() => insertMention('@everyone ')}
    >
      <span className="mention-icon">👥</span>
      <span className="mention-name">@everyone</span>
      <span className="mention-hint">Mentionner tous les membres du canal</span>
    </button>
  ) : (
    // ...existing member-entry render...
  ),
)}
```

In the selection handler (`insertMention` or equivalent), when the argument is the literal string `'@everyone '`, just splice it in at the cursor position the same way regular mention text is inserted — no bracketed ID format. If the existing handler only accepts a member object, add a string overload.

- [ ] **Step 6: Run the composer tests**

Run:
```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run tests/comms.test.ts -t "MessageComposer"
```

Expected: 2 passing tests.

- [ ] **Step 7: Run the full suite**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run
```

Expected: 98 passing.

- [ ] **Step 8: Commit**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && git add \
  src/components/comms/MessageComposer.tsx \
  src/components/comms/CommsLayout.tsx \
  tests/comms.test.ts && \
git commit -m "feat(comms): @everyone entry in composer autocomplete (non-DM only)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Mod API — clamp query window and add stable `id`

**Files:**
- Modify: `src/app/api/roleplay/notifications/pending/route.ts`
- Test: `tests/comms.test.ts` (append)

- [ ] **Step 1: Write failing tests**

Append to `tests/comms.test.ts`:

```typescript
describe('Mod notifications/pending endpoint — duplicate delivery fix', () => {
  it('clamps the DB query upper bound to now', () => {
    const content = readSrc('app/api/roleplay/notifications/pending/route.ts');
    // Must have a createdAt upper-bound clause, as an ISO string derived from `now`.
    expect(content).toMatch(/less_than_equal:\s*new Date\(now\)\.toISOString\(\)/);
    // And the existing greater_than lower bound must still be present.
    expect(content).toMatch(/greater_than:\s*new Date\(effectiveSince\)\.toISOString\(\)/);
  });

  it('exposes a stable id on each notification object', () => {
    const content = readSrc('app/api/roleplay/notifications/pending/route.ts');
    // The returned notification object literal must include an `id` field
    // populated from the source message doc.
    expect(content).toMatch(/id:\s*Number\(m\.id\)/);
  });

  it('documents the id field in the JSDoc response shape', () => {
    const content = readSrc('app/api/roleplay/notifications/pending/route.ts');
    // JSDoc block must mention `id:` as a notification field.
    expect(content).toMatch(/\*\s*id:\s*number/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run tests/comms.test.ts -t "notifications/pending"
```

Expected: 3 failing tests.

- [ ] **Step 3: Add the query upper bound**

In `src/app/api/roleplay/notifications/pending/route.ts`, find the `payload.find` call (around lines 115–127). Add one clause to the `where.and` array:

```typescript
const msgs = await payload.find({
    collection: 'comms-messages',
    where: {
        and: [
            { channelId: { in: Array.from(channelMap.keys()) } },
            { createdAt: { greater_than: new Date(effectiveSince).toISOString() } },
            // Clamp upper bound to `now` so messages inserted between
            // `Date.now()` capture and query execution are NOT returned
            // here — they will be picked up in the next poll, exactly once.
            { createdAt: { less_than_equal: new Date(now).toISOString() } },
            { senderCharacterId: { not_equals: characterId } },
            { deletedAt: { exists: false } },
        ],
    },
    sort: 'createdAt',
    limit: MAX_NOTIFICATIONS,
});
```

- [ ] **Step 4: Add `id` to each notification object**

In the same file, find the `.map((m) => { ... return { ... } })` block that builds the `notifications` array (around lines 166–216). Add `id: Number(m.id)` as the first field of the returned object:

```typescript
return {
    id: Number(m.id),
    channel: displayChannel,
    sender: senderName,
    callSign,
    body: text,
    isMention,
    avatarUrl,
    createdAtMs,
};
```

- [ ] **Step 5: Update the JSDoc response shape**

Still in the same file, update the JSDoc block at the top of the handler (around lines 11–37). Add the `id` field description right above `channel`:

```typescript
 *     notifications: Array<{
 *       id: number,            // Stable comms-messages document ID. The mod
 *                              // should keep an LRU set of recently-seen IDs
 *                              // and skip any notification whose id is in the
 *                              // set — makes delivery idempotent against
 *                              // overlapping polls, clock skew, and retries.
 *       channel: string,       // For DMs: the sender's callsign (or full name);
 *                              // for group/unit/faction: the channel name
 *       sender: string,        // Sender display name
 *       callSign: string,      // Sender's roleplay callsign (empty for anonymous);
 *                              // mod uses this as the DM title, falls back to `channel` if empty
 *       body: string,
 *       isMention: boolean,
 *       avatarUrl: string,     // Absolute URL to sender's avatar (empty if none)
 *       createdAtMs: number
 *     }>
```

- [ ] **Step 6: Run the tests**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run tests/comms.test.ts -t "notifications/pending"
```

Expected: 3 passing.

- [ ] **Step 7: Run the full suite**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run
```

Expected: 101 passing.

- [ ] **Step 8: Commit**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && git add \
  src/app/api/roleplay/notifications/pending/route.ts \
  tests/comms.test.ts && \
git commit -m "fix(comms): dedupe mod notifications via query clamp + stable id

Clamps /api/roleplay/notifications/pending query to createdAt <= now
so messages inserted between now-capture and query execution are not
returned in the same response their serverTimeMs excludes. Adds a
stable id per notification so the mod can LRU-dedupe against
overlapping polls as defense in depth.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Browser sound — advance `seen` before playing (CommsLayout)

**Files:**
- Modify: `src/components/comms/CommsLayout.tsx:142-215`
- Test: `tests/comms.test.ts` (append)

- [ ] **Step 1: Write failing test**

Append to `tests/comms.test.ts`:

```typescript
describe('CommsLayout sound-dedup race fix', () => {
  it('advances seen.set for a channel before playing its sound', () => {
    const content = readSrc('components/comms/CommsLayout.tsx');
    // Extract the loadChannels function body by a coarse slice between
    // its declaration and the next named const. Good enough for a
    // string-match test.
    const start = content.indexOf('const loadChannels');
    const end = content.indexOf('const loadMessages');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = content.slice(start, end);

    // In the advanced-channel branch, seen.set(ch.id, ch.lastMessageAt)
    // must appear before any play*() call. We check by index order.
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
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run tests/comms.test.ts -t "CommsLayout sound-dedup"
```

Expected: 1 failing (current code has `seen.set` AFTER `play*()`).

- [ ] **Step 3: Fix the race**

Open `src/components/comms/CommsLayout.tsx`. Find the `loadChannels` function (starts around line 142). Locate the channel-iteration block at lines 159–198. Current shape:

```typescript
if (initializedSeenRef.current) {
    for (const ch of newChannels) {
        if (!ch.lastMessageAt) continue;
        const prev = seen.get(ch.id);
        if (prev && ch.lastMessageAt > prev) {
            const isActive = ch.id === activeId;
            const mention = !!ch.lastMessageMentionsViewer;
            if (!isActive) {
                // ...setToasts...
                if (mention) {
                    playRadioPing();
                    setMentionCounts(/* ... */);
                } else {
                    playNotification();
                }
            } else if (mention) {
                playRadioPing();
            }
        }
    }
}
for (const ch of newChannels) {
    if (ch.lastMessageAt) seen.set(ch.id, ch.lastMessageAt);
}
```

Change it to:

```typescript
if (initializedSeenRef.current) {
    for (const ch of newChannels) {
        if (!ch.lastMessageAt) continue;
        const prev = seen.get(ch.id);
        if (prev && ch.lastMessageAt > prev) {
            // Advance the baseline FIRST. Any concurrent loadChannels call
            // (e.g. 3s poll overlapping with handleSend's post-send refresh)
            // will then see the advanced baseline and skip this channel —
            // preventing the double/triple sound fire.
            seen.set(ch.id, ch.lastMessageAt);

            const isActive = ch.id === activeId;
            const mention = !!ch.lastMessageMentionsViewer;
            if (!isActive) {
                // ...setToasts (unchanged)...
                if (mention) {
                    playRadioPing();
                    setMentionCounts(/* ... */);
                } else {
                    playNotification();
                }
            } else if (mention) {
                playRadioPing();
            }
        }
    }
}
// Seed baseline for channels we have never seen before (first load or
// newly joined channels). Channels that just advanced were already set
// above inside the match block.
for (const ch of newChannels) {
    if (ch.lastMessageAt && !seen.has(ch.id)) {
        seen.set(ch.id, ch.lastMessageAt);
    }
}
```

Keep the `setToasts` block exactly as it is — only move `seen.set` up and change the tail loop to `!seen.has(ch.id)`.

- [ ] **Step 4: Run the race test**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run tests/comms.test.ts -t "CommsLayout sound-dedup"
```

Expected: 1 passing.

- [ ] **Step 5: Run the full suite**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run
```

Expected: 102 passing.

- [ ] **Step 6: Commit**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && git add \
  src/components/comms/CommsLayout.tsx \
  tests/comms.test.ts && \
git commit -m "fix(comms): advance seen baseline before sound in CommsLayout

Two concurrent loadChannels calls (3s poll overlapping handleSend's
post-send refresh) both observed a stale seen map and both played
playRadioPing/playNotification for the same new message. Move
seen.set into the match block before the sound call so the second
caller sees the advanced baseline and skips.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Browser sound — advance `seen` before playing (GlobalCommsNotifier)

**Files:**
- Modify: `src/components/comms/GlobalCommsNotifier.tsx:62-91`
- Test: `tests/comms.test.ts` (append)

Defense in depth: same race exists on non-`/comms` pages via the 12 s global toaster poll. Less frequently overlapping, but still worth fixing for consistency.

- [ ] **Step 1: Write failing test**

Append to `tests/comms.test.ts`:

```typescript
describe('GlobalCommsNotifier sound-dedup race fix', () => {
  it('advances seen.set for a channel before playing its sound', () => {
    const content = readSrc('components/comms/GlobalCommsNotifier.tsx');
    const start = content.indexOf('const poll = async');
    expect(start).toBeGreaterThan(-1);
    // Slice from poll declaration to the closing of the useEffect.
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
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run tests/comms.test.ts -t "GlobalCommsNotifier sound-dedup"
```

Expected: 1 failing.

- [ ] **Step 3: Apply the same fix**

Open `src/components/comms/GlobalCommsNotifier.tsx`. Find the `poll` function (around line 47). The advanced-channel loop (lines 62–88) currently plays the sound inside the match and then sets `seen` in a separate trailing loop (lines 89–91). Change it to:

```typescript
if (initializedRef.current) {
    for (const ch of channels) {
        if (!ch.lastMessageAt) continue;
        const prev = seen.get(ch.id);
        if (prev && ch.lastMessageAt > prev) {
            // Advance baseline FIRST so a concurrent poll (or a manual
            // refresh) does not double-fire the toast + sound.
            seen.set(ch.id, ch.lastMessageAt);

            const toastId = ++toastIdRef.current;
            const mention = !!ch.lastMessageMentionsViewer;
            if (!cancelled) {
                setToasts((t) => [
                    ...t,
                    {
                        id: toastId,
                        channelId: ch.id,
                        channelName: ch.name,
                        snippet: ch.lastMessagePreview || '',
                        mention,
                    },
                ]);
                setTimeout(() => {
                    setToasts((t) => t.filter((x) => x.id !== toastId));
                }, 6000);
                if (mention) playRadioPing();
                else playNotification();
            }
        }
    }
}
for (const ch of channels) {
    if (ch.lastMessageAt && !seen.has(ch.id)) {
        seen.set(ch.id, ch.lastMessageAt);
    }
}
initializedRef.current = true;
```

- [ ] **Step 4: Run the race test**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run tests/comms.test.ts -t "GlobalCommsNotifier sound-dedup"
```

Expected: 1 passing.

- [ ] **Step 5: Run the full suite**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run
```

Expected: 103 passing.

- [ ] **Step 6: Commit**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && git add \
  src/components/comms/GlobalCommsNotifier.tsx \
  tests/comms.test.ts && \
git commit -m "fix(comms): advance seen baseline before sound in GlobalCommsNotifier

Defense-in-depth companion to the CommsLayout race fix: same
read-modify-write on the seen map, fixed the same way.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Bump version to 1.6.44

**Files:**
- Modify: `src/lib/version.ts`

- [ ] **Step 1: Open `src/lib/version.ts` and bump the version + prepend a changelog entry**

Change the top of `VERSION_INFO`:

```typescript
export const VERSION_INFO = {
  version: '1.6.44',
  creator: 'JaavLex',
  changelog: [
    {
      version: '1.6.44',
      date: '2026-04-08',
      changes: [
        'COMMS — Nouveau `@everyone` dans les canaux de groupe / unité / faction. Taper `@everyone` dans le compositeur mentionne tous les membres du canal (sauf l\'expéditeur) : ping radio bruyant en direct, notification mod en jeu, MAIS pas de fanout DM Discord (pour éviter de spammer 20+ personnes en DM à chaque callout tactique). `@everyone` est silencieusement ignoré en DM. L\'autocomplete du compositeur ajoute une entrée « 👥 @everyone » en tête de liste pour les canaux non-DM.',
        'COMMS / MOD — Fix notifications dupliquées côté mod `AR-DiscordLink` : la requête `/api/roleplay/notifications/pending` est désormais clampée à `createdAt <= now` (en plus de `> effectiveSince`), ce qui empêche la livraison multiple de messages insérés entre la capture de `Date.now()` et l\'exécution de la requête. Chaque notification expose aussi un `id` stable (l\'ID du document `comms-messages`) pour que le mod puisse déduper via un `HashSet` LRU côté jeu — robuste contre les requêtes concurrentes, les redémarrages et le clock skew.',
        'COMMS — Fix son de notification dupliqué dans le navigateur : `CommsLayout.loadChannels` mettait à jour son `seen` map APRÈS avoir joué le son, donc deux appels concurrents (polling 3s + refresh post-envoi de `handleSend`) observaient tous deux la même baseline stale et jouaient le son deux fois pour le même message. La baseline est maintenant avancée AVANT l\'appel à `playRadioPing` / `playNotification`. Même fix appliqué par défense-en-profondeur dans `GlobalCommsNotifier` pour les pages hors /comms.',
      ],
    },
    {
      version: '1.6.43',
      // ...existing...
```

- [ ] **Step 2: Run the version test**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run tests/version.test.ts
```

Expected: 3 passing (the version tests verify format, not specific values).

- [ ] **Step 3: Run the full suite one last time**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && npx vitest run
```

Expected: all 103 passing.

- [ ] **Step 4: Commit**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && git add src/lib/version.ts && \
git commit -m "chore: bump to v1.6.44

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Deploy to dev and smoke test

**Files:** none (deployment only)

- [ ] **Step 1: Push to origin/dev**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && git push origin dev
```

- [ ] **Step 2: Run the dev deploy skill**

Invoke `/deploy-dev`. This runs: ansible pull → npm install → `vitest run` → `next build` → systemd restart → health check.

Watch for: the 103-test suite passing on the VPS, build succeeding, `https://dev.lif-arma.com/` returning HTTP 200.

- [ ] **Step 3: Smoke test — `@everyone` in a unit channel**

On `https://dev.lif-arma.com/roleplay/comms`:
1. Log in as account A. Open a unit or faction channel with at least 3 members.
2. Type `@e` — verify the `👥 @everyone` entry appears at the top of the autocomplete.
3. Select it, type `test`, send.
4. Log in as account B on another device/browser, on `/roleplay/comms` with a **different** channel active. Verify account B hears the radio ping (`playRadioPing`) exactly once.
5. Check account B's Discord DMs. Verify no new DM from the bot.

- [ ] **Step 4: Smoke test — `@everyone` in a DM**

1. Still on `/roleplay/comms`, open a DM with another character.
2. Type `@e` — verify the `👥 @everyone` entry does NOT appear.
3. Type `@everyone test` and send anyway. The recipient should get a regular DM notification (no loud radio ping from the `@everyone` expansion).

- [ ] **Step 5: Smoke test — no duplicate sound in active channel**

1. Account A and account B both on `/roleplay/comms` with the same channel active.
2. Account A sends a message mentioning account B with `@[Name]`.
3. Account B should hear the radio ping **exactly once**. If you hear it twice, the race fix is incomplete — stop and debug before proceeding.

- [ ] **Step 6: Smoke test — mod ID field**

Curl the endpoint with a known `biId`:

```bash
curl -sX POST https://dev.lif-arma.com/api/roleplay/notifications/pending \
  -H 'Content-Type: application/json' \
  -d '{"biId":"<real-linked-biId>","apiKey":"<GAME_MOD_API_KEY>","sinceMs":'$(($(date +%s%3N)-60000))'}' \
  | jq '.notifications[0]'
```

Expected: the first notification object (if any) has an `id: <number>` field alongside `channel`, `sender`, `callSign`, etc.

---

## Task 8: Deploy to prod

**Files:** none

- [ ] **Step 1: Merge dev to master**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && git checkout master && git merge dev --ff-only && git push origin master
```

- [ ] **Step 2: Run `/deploy-prod`**

Wait for ansible to finish. Verify `https://lif-arma.com/` returns 200.

- [ ] **Step 3: Resync local dev with master**

```bash
cd /home/alexandre/dev/LIF/LIF-Website && git checkout dev && git merge master --ff-only && git push origin dev
```

- [ ] **Step 4: Report done**

Confirm v1.6.44 is live with: `curl -s https://lif-arma.com/api/version | jq .version` → should print `"1.6.44"`.

---

## Post-deploy: mod-side change (separate repo, out of scope for this plan)

Document for the mod maintainer: in `AR-DiscordLink`, add an LRU set of recently-seen notification IDs and skip any notification whose `id` is already in the set. ~5 lines in the notification handler. The server-side clamping fix alone already solves the double-delivery for well-behaved polling; the mod-side LRU is defense in depth against overlapping polls and mod restarts.

Illustrative pseudo-code (adapt to Enforce syntax actually used in the mod):

```csharp
protected ref set<int> m_SeenIds = new set<int>();
protected ref array<int> m_SeenIdsOrder = {};
const int MAX_SEEN = 100;

void HandleNotification(SCR_Notification notif) {
    if (m_SeenIds.Contains(notif.id)) return;
    m_SeenIds.Insert(notif.id);
    m_SeenIdsOrder.Insert(notif.id);
    while (m_SeenIdsOrder.Count() > MAX_SEEN) {
        int evicted = m_SeenIdsOrder[0];
        m_SeenIdsOrder.Remove(0);
        m_SeenIds.Remove(evicted);
    }
    // ...existing display logic...
}
```
