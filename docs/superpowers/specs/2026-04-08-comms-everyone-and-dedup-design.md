# /comms — @everyone mention + duplicate notification fix

**Date:** 2026-04-08
**Target version:** 1.6.44
**Scope:** feature (`@everyone` in group/unit/faction channels) + bug fix (duplicate notifications on both the mod polling API and the browser sound pipeline).

---

## 1. Problem statement

Two independent issues, bundled because they touch overlapping files in the
`/comms` notification pipeline:

1. **Feature request:** there is no way to mention every member of a channel at
   once. Currently each member must be `@`-mentioned individually via the
   composer's autocomplete, which is tedious for tactical callouts in unit /
   faction channels.

2. **Bug report:** notifications sometimes fire multiple times for the same
   message.
   - In the AR-DiscordLink in-game mod, the same comms message can be delivered
     two or even three times to the same player.
   - In the browser, a user sitting on `/comms` with a channel active hears
     the `playRadioPing()` / `playNotification()` sound twice in quick
     succession when a new message arrives in the active channel.

## 2. Goals

- Users can type `@everyone` in any non-DM channel and all members of that
  channel (except the sender) receive the same loud notification they would
  get from a direct `@`-mention.
- The mod polling API (`/api/roleplay/notifications/pending`) delivers each
  message exactly once per player, robust to overlapping poll requests and
  clock skew.
- The browser plays exactly one sound per new message per tab, whether the
  user is on `/comms` with the channel active or on any other page.

## 3. Non-goals

- Cross-tab deduplication. A user with `/comms` open in two tabs will hear
  the sound in both tabs — acceptable; fixing would require `BroadcastChannel`.
- Rate-limiting `@everyone`. Can be added later if abused.
- Admin-only gating for `@everyone`. Anyone in a non-DM channel can use it.
- Retroactively flagging existing messages as `@everyone`.
- Implementing the mod-side LRU dedup set; that change lives in the
  `AR-DiscordLink` mod repo. Pseudo-code is documented here for reference.

## 4. Design overview

No new collections, no DB migrations, no new services. All changes are to
existing route handlers and React components, plus new test cases.

**Files touched:**

| File | Change |
|---|---|
| `src/app/api/comms/channels/[id]/messages/route.ts` | Parse `@everyone`, expand to member IDs, set `isEveryoneMention` flag, skip offline Discord DM fanout when flag is true. |
| `src/app/api/roleplay/notifications/pending/route.ts` | Clamp DB query upper bound to `now`; add stable `id` field to each notification object. |
| `src/components/comms/MessageComposer.tsx` | Add synthetic `@everyone` entry at the top of the mention autocomplete for non-DM channels. |
| `src/components/comms/GlobalCommsNotifier.tsx` | Suppress sound for the currently-active channel while the user is on `/comms`. |
| `src/components/comms/CommsLayout.tsx` | Publish the active channel ID to `localStorage` on mount / switch, clear on unmount. |
| `tests/comms.test.ts` | 7–8 new cases (see §8). |
| `src/lib/version.ts` | Bump to 1.6.44 with changelog entry. |

## 5. Feature: `@everyone` in non-DM channels

### 5.1 Server-side parsing

In `src/app/api/comms/channels/[id]/messages/route.ts`, after the existing
`@[Name](id)` regex loop that populates `mentionIds`, add a second pass:

```ts
// `members` and `eligibility.character.id` are already in scope at this
// point in the POST handler (see messages/route.ts:233, 251).
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

**Rules:**
- Word-boundary match only: `hey@everyone` and `foreveryoneelse` do not
  trigger. The leading boundary is start-of-string or whitespace; the trailing
  is `\b`.
- DM channels silently ignore `@everyone`. The literal text is preserved in
  the message body (we don't rewrite what the user typed); only the flag is
  suppressed.
- Sender is excluded from the expanded `mentionIds`.
- Combining `@everyone` with explicit `@[Name](42)` mentions is fine; the
  merge is de-duplicated (`includes` check).

### 5.2 Discord DM fanout suppression

The existing offline-DM loop (lines ~354–380 of `messages/route.ts`) iterates
`mentionIds` and DMs each offline character. Add an early return:

```ts
if (!isEveryoneMention) {
  for (const mid of mentionIds) {
    // ...existing sendDiscordDM logic...
  }
}
```

When `@everyone` fires, **no** offline Discord DMs go out — even for members
who were individually mentioned in the same message. Rationale: if the user
opted into a mass ping, per-person DM spam on top is noise. If they want a
specific person DM'd via Discord, they should use only the individual
`@[Name]` mention.

### 5.3 Composer autocomplete UI

In `src/components/comms/MessageComposer.tsx`, when the user types `@`:

- If `channel.type !== 'dm'`, prepend a synthetic entry at the top of the
  suggestions list:
  - Label: `👥 @everyone — Mentionner tous les membres du canal`
  - Value: the literal string `@everyone ` (trailing space, no bracketed ID)
- Substring filter: the entry is shown when the current query is a prefix of
  `everyone` (so `@`, `@e`, `@ev`, ..., `@everyone` all match). Once the user
  types a character that is not a prefix of `everyone`, hide the entry.
- For DM channels: never show the entry.
- Selection behavior: insert the literal text `@everyone ` at the cursor
  position, identical to how `@[Name](id) ` is inserted for regular mentions.

### 5.4 Downstream effects (no code change needed)

Because `mentionIds` already drives both `isMention: true` in the mod polling
API and the in-browser `playRadioPing()` sound, expanding `mentionIds` at
parse time automatically routes `@everyone` to both paths without further
changes.

## 6. Bug fix: mod API duplicate notifications

### 6.1 Root cause

In `src/app/api/roleplay/notifications/pending/route.ts`:

```ts
const now = Date.now();                    // captured at T0
// ...auth, char lookup, channel fetch... // takes tens of ms
const msgs = await payload.find({
  collection: 'comms-messages',
  where: { and: [
    { createdAt: { greater_than: new Date(effectiveSince).toISOString() } },
    // no upper bound!
    ...
  ]},
});
return NextResponse.json({ serverTimeMs: now, notifications: ... });
```

If a message is inserted at wall time `T0 + 30ms` (after `now` is captured
but before or during the DB query), it has `createdAt > effectiveSince` and
is returned in this response. The response reports `serverTimeMs = T0`. The
mod saves `sinceMs = T0`. On the next poll, the query `createdAt > T0` still
matches that `T0 + 30ms` message — **it is re-delivered.**

Worse: the mod appears to issue overlapping poll requests under load. Two
concurrent requests with the same `sinceMs` both run the same query and both
return the same message → triple-fire.

### 6.2 Fix A — Clamp the query upper bound to `now`

Add one clause to the `where.and` array:

```ts
{ createdAt: { less_than_equal: new Date(now).toISOString() } },
```

With this, the result set becomes a deterministic function of
`(effectiveSince, now)`. A message inserted at `T0 + 30ms` is excluded from
the `T0` response and picked up in the next poll whose `sinceMs < T0 + 30ms <
next now`. The response's `serverTimeMs = now` becomes a truthful upper bound:
any mod advancing its watermark to the returned `serverTimeMs` is guaranteed
never to re-fetch a previously delivered message.

### 6.3 Fix B — Stable `id` field per notification

Add the message document ID to each notification object:

```ts
return {
  id: Number(m.id),  // NEW — stable comms-messages document ID
  channel: displayChannel,
  sender: senderName,
  callSign,
  body: text,
  isMention,
  avatarUrl,
  createdAtMs,
};
```

The JSDoc response shape is updated to document the field as:

> `id: number` — stable comms-messages document ID; the mod should keep an
> LRU set of recently-seen IDs and skip any notification whose ID is in the
> set. This makes delivery idempotent against overlapping polls, mod
> restarts, clock skew, and server retries.

### 6.4 Why both fixes

- Fix A alone is sufficient for a well-behaved serial mod poller, but does
  not protect against overlapping requests.
- Fix B alone would work, but leaves the server needlessly re-fetching and
  re-serializing the same messages every poll if `effectiveSince` never
  advances.
- Together: server-side defense in depth + mod-side idempotency. Each
  message is delivered at most once per player.

### 6.5 Mod-side change (documented, not implemented here)

The mod repo (`AR-DiscordLink`) needs a ~5-line change in its notification
handler:

```csharp
// AR-DiscordLink, notification handler — illustrative pseudo-code
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

Exact Enforce syntax may vary — adapt to whatever collection types the mod
already uses.

## 7. Bug fix: browser duplicate sounds

### 7.1 Root cause — read-modify-write race in `loadChannels`

`GlobalCommsNotifier` already bails out entirely on `/comms` pages
(`GlobalCommsNotifier.tsx:42` — `if (onCommsPage) return;`), so it is
**not** a second sound source when the user is on `/comms`. The duplicate
must be — and on inspection, is — entirely inside
`CommsLayout.loadChannels` (`CommsLayout.tsx:142-215`).

The function's dedup logic, in pseudo-sequence:

```ts
for (const ch of newChannels) {
  const prev = seen.get(ch.id);
  if (prev && ch.lastMessageAt > prev) {
    // ...setToasts, playRadioPing/playNotification...
  }
}
for (const ch of newChannels) {
  if (ch.lastMessageAt) seen.set(ch.id, ch.lastMessageAt);  // ← advance AFTER
}
```

`loadChannels` is called from three different paths on `/comms`:

1. Initial mount effect (`CommsLayout.tsx:256-259`).
2. Polling interval every 3 s while the page is visible
   (`CommsLayout.tsx:345-349`).
3. `handleSend` after a successful POST (`CommsLayout.tsx:369`).

Two concurrent `loadChannels` calls (e.g. the 3 s poll firing while
`handleSend` is still in flight) both `await fetch('/api/comms/channels')`,
both receive a response containing the same new `lastMessageAt`, both
compare against the *same stale* `seen` map (because neither has reached
the `seen.set(...)` loop yet), and both play the sound. Classic
read-modify-write race. Same mechanism produces triple fires when a
third caller overlaps.

The same race exists in `GlobalCommsNotifier.tsx:62-91` when the user is
**not** on `/comms` — `seen.set` happens in a second loop after the sound
call — but in practice the 12 s poll there overlaps much less often than
the 3 s `CommsLayout` poll, which is why the symptom is loudest on
`/comms` itself.

### 7.2 Fix — advance `seen` atomically before playing the sound

Move the `seen.set(ch.id, ch.lastMessageAt)` call to the top of the
`if (prev && ch.lastMessageAt > prev)` branch, before any async / sound
work. That way, any subsequent or concurrent `loadChannels` call that
observes the same response sees an advanced baseline for that channel
and the condition is false, so the sound is not played again.

Target snippet in `CommsLayout.loadChannels` (around line 160):

```ts
for (const ch of newChannels) {
  if (!ch.lastMessageAt) continue;
  const prev = seen.get(ch.id);
  if (prev && ch.lastMessageAt > prev) {
    // Advance baseline FIRST so a racing loadChannels call skips this
    // channel instead of double-firing.
    seen.set(ch.id, ch.lastMessageAt);

    const isActive = ch.id === activeId;
    const mention = !!ch.lastMessageMentionsViewer;
    if (!isActive) {
      // toast + sound (unchanged)
    } else if (mention) {
      playRadioPing();
    }
  }
}
// The "baseline for channels that did not advance" loop below is kept
// but only runs for channels we have never seen before (first load or
// new channel join).
for (const ch of newChannels) {
  if (ch.lastMessageAt && !seen.has(ch.id)) seen.set(ch.id, ch.lastMessageAt);
}
```

Apply the exact same fix in `GlobalCommsNotifier.tsx` (same structure,
same bug) as defense in depth for users not on `/comms`.

### 7.3 First-tick silence (existing, verify in place)

`CommsLayout.loadChannels` already gates the sound-playing loop behind
`initializedSeenRef.current` (`CommsLayout.tsx:159`) and sets the ref
after the first successful fetch. `GlobalCommsNotifier` does the same
with `initializedRef` (`GlobalCommsNotifier.tsx:62, 92`). Both are
already correct — no change needed.

### 7.4 Two-tab edge case

A user with `/comms` open in two tabs will hear one sound per tab (each
`CommsLayout` instance plays independently). This is acceptable — each
tab is an independent listener — and fixing it would require cross-tab
coordination via `BroadcastChannel`. Out of scope.

## 8. Testing

New cases in `tests/comms.test.ts` (unit, no DB — mock the payload client):

1. **@everyone — group channel expansion.** Sender ID 1, channel members
   `[1, 2, 3, 4, 5]`. Message body `"@everyone en position"`. Expected
   `mentionIds = [2, 3, 4, 5]`, `isEveryoneMention = true`.
2. **@everyone — DM channel ignored.** Same message in a DM channel.
   Expected `mentionIds = []`, `isEveryoneMention = false`.
3. **@everyone + explicit mention merge.** Body
   `"@everyone @[Joe](2) go"` in a group channel with members `[1, 2, 3]`,
   sender 1. Expected `mentionIds = [2, 3]` (no duplicate 2).
4. **Word-boundary rejection.** Bodies `"hey@everyone"` and
   `"foreveryoneelse"` in a group channel → `isEveryoneMention = false`,
   `mentionIds = []`.
5. **Discord DM fanout suppression.** Mock `sendDiscordDM`. Post an
   `@everyone` message with offline members. Assert `sendDiscordDM` call
   count is 0. Post a regular `@[Name]` mention with the same offline member
   — assert call count is 1 (control).
6. **Mod API query upper bound.** Spy on `payload.find` options. Call the
   handler. Assert the `where.and` array contains both a
   `greater_than: effectiveSince` clause and a `less_than_equal: now`
   clause, both ISO strings.
7. **Mod API notification ID present.** Mock the query to return a message
   with `id: 1234`. Assert the response's `notifications[0].id === 1234`.
8. **Mod API determinism.** Freeze `Date.now()`. Call the handler twice in
   a row with the same `sinceMs` and the same mocked message list. Assert
   the two responses' `notifications` arrays are deep-equal (no stray
   messages from the clock window).

Target: 92 → ~100 passing tests.

## 9. Rollout

1. Bump `src/lib/version.ts` to 1.6.44 with changelog entry covering both
   the `@everyone` feature and the duplicate-notification fix.
2. `/deploy-dev`. Manual smoke test on `dev.lif-arma.com`:
   - Account A posts `@everyone` in a unit channel. Account B (on /comms,
     different channel active) hears radio ping exactly once.
   - Account B's Discord DMs receive nothing for the `@everyone`.
   - `@everyone` in a DM channel is silent (no ping for the other party).
   - Message in the currently-active channel plays exactly one sound.
   - AR-DiscordLink mod still works (should, since `id` is additive).
3. `/deploy-prod` after smoke test passes.
4. Mod-side LRU change ships separately from the mod repo.

## 10. Security & privacy

- `@everyone` cannot leak character IDs: the composer inserts the literal
  string `@everyone`, not a bracketed ID list. The server expands on its
  own authority using the authenticated session's channel membership.
- A non-member of a channel cannot use `@everyone` to ping its members —
  the existing channel-membership check in the POST handler rejects
  non-members before the mention parser ever runs.
- Anonymous messages with `@everyone`: if the existing anonymous-message
  flow allows it, the server's existing `isAnonymous` handling already
  strips sender identity from notifications; `@everyone` does not change
  that.
- `id` field in the mod API: exposing `comms-messages` document IDs to the
  mod is safe — the mod already receives the message body, sender, and
  channel, and only for channels the linked player is a member of. The ID
  adds no new information.
