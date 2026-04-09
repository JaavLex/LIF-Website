# NPC Tab + GameMaster Mode — Design

**Date:** 2026-04-09
**Status:** Design approved, ready for implementation plan
**Scope:** Two related roleplay admin features

---

## Goal

Give admins two tools for running RP events cleanly:

1. **NPC tab on the personnel database** — separate NPCs from real player characters in the `/roleplay` listing, mirroring the existing `Targets` tab.
2. **GameMaster (MJ) mode in comms** — let admins impersonate NPC or Target characters and post in any faction/unit/group channel without joining it, with a hidden audit trail visible only to other admins.

---

## Feature 1 — NPC tab on personnel page

### Rationale

NPCs are admin-created characters with no Discord link. Currently they show up mixed in with real player characters on the `/roleplay` landing page because the bucketing loop in `PersonnelFilters` only splits on `isTarget`. Admins running events lose the ability to scan the player roster at a glance.

### Scope

Pure UI filter change. No schema, no API, no new endpoints.

### Derivation rule

An NPC is any character where:
```
!character.discordId && !character.isTarget
```

This matches the convention already documented in `src/collections/Characters.ts:101-104` ("To create an NPC or Target: leave Discord ID/Username EMPTY, check 'Target/Enemy' if applicable"). Targets remain in their own bucket. Real players (with a Discord link) go to `personnel`.

### Component changes

**File:** `src/app/(frontend)/roleplay/components/PersonnelFilters.tsx`

- Add `'npcs'` to the `TabType` union, positioned between `'targets'` and `'my-characters'`.
- Extend the bucketing loop:
  ```ts
  if (c.isTarget) targets.push(c);
  else if (!c.discordId) npcs.push(c);
  else personnel.push(c);
  ```
- Add tab button with label `PNJ`, count badge consistent with other tabs.
- Tab is admin-only — same gating pattern as the existing `archives` tab (hidden from non-admins entirely, not just disabled).
- The `personnel` tab now only shows characters with a `discordId` — this is the actual fix for the "don't mix them in with the rest" ask.

### Out of scope

- Adding an `isNpc` boolean or `characterType` enum to the collection. The derivation rule is enough and preserves future migration flexibility.
- Creating a dedicated `/api/roleplay/characters/npcs` listing for the personnel page (see Feature 2 — a separate endpoint exists there, scoped to the GM picker, not to replace the server-rendered listing).

---

## Feature 2 — GameMaster mode in comms

### Rationale

During RP events, admins need to voice NPCs and targets inside faction/unit/group channels that their own player character is not a member of. Today they'd have to manually join each channel, post, then leave — breaking immersion and polluting channel member lists.

GM mode is a server-enforced, audit-tagged, ephemeral impersonation mechanism.

### Guarantees

- **Server-side enforcement.** Every request carrying GM fields is re-validated against `checkAdminPermissions`. Client cannot forge GM status.
- **Impersonation scope is NPCs and Targets only.** Real player characters cannot be puppeteered, ever. The validator on message POST rejects any `impersonateCharacterId` whose character has a non-null `discordId`.
- **Ghost presence.** GM activity never mutates `channel.members`, presence pings, or typing pings. Members list and online counts are unchanged.
- **Hidden audit tag.** The `postedAsGm` flag travels with the message row forever. Admins see an `[MJ]` badge next to the sender name; players receive responses that do not even contain the field (stripped server-side, cannot leak via DevTools).
- **DMs are off-limits to the bypass.** The `?gm=1` channel list excludes DMs entirely. Private 1-on-1 conversations stay private.
- **Ephemeral client state.** GM mode is per-tab React state. Closing the tab or navigating away ends the mode. Nothing to clean up server-side.

### Data model

**New field on `comms-messages`:**
- `postedAsGm: boolean` — optional, default `false`. Written only when a message is posted through GM mode. Used to render the `[MJ]` tag and to query the audit trail via Payload admin.

**Migration:** `ALTER TABLE comms_messages ADD COLUMN posted_as_gm BOOLEAN DEFAULT FALSE;` applied idempotently on the VPS per the CLAUDE.md migration gotcha (Ansible does not run `payload migrate`). A row must be inserted into `payload_migrations` so Payload does not try to re-apply.

**No changes to:**
- `characters` (NPC detection stays derivation-based)
- Channel `members` arrays (GM posts never mutate membership)
- Session JWT (GM state is client-only)

### Server-side endpoints

#### Shared helper — `src/lib/api-auth.ts`

```ts
async function requireGmAdmin(session): Response | { session, isAdmin: true }
```

One entry point used by all three GM-aware endpoints. Collapses the existing three-line `checkAdminPermissions` dance into a single call with a unified 403 response shape. Keeps the endpoints from drifting apart.

#### `POST /api/comms/channels/[id]/messages`

New optional body fields (both must be present together):
- `gmMode: true`
- `impersonateCharacterId: number`

Server flow injected before the existing sender resolution:

1. If `gmMode !== true` → current behavior unchanged. Sender is `eligibility.character.id`, membership check runs, no `postedAsGm` flag.
2. If `gmMode === true`:
   - `requireGmAdmin(session)` → else 403.
   - Load `impersonateCharacterId` from `characters` with `depth: 0`.
   - Validate `!character.discordId && !character.isArchived`. If `character.discordId` is truthy → 400 `"Impersonation limited to NPCs and targets"`. If archived → 400 `"Archived character"`.
   - **Skip** the `members.includes(...)` membership check for this channel.
   - Write the message row with:
     - `senderCharacterId = impersonateCharacterId`
     - `postedAsGm = true`
     - All other fields (body, attachments, replyTo, mentions) resolved normally against the impersonated character where relevant (mentions still reference real member IDs of the channel, unchanged).
   - **Do not mutate** `channel.members`. Do not add the admin's real character. Do not add the NPC.

All other per-message validation (body length, attachment rules, rate limits if any) still runs identically.

#### `GET /api/comms/channels`

New optional query param: `gm=1`.

- Absent → current strict-membership behavior unchanged.
- `gm=1` + non-admin → 403.
- `gm=1` + admin → response includes:
  - All channels the admin's character is already a member of (current behavior), AND
  - All non-DM channels on the site (`type IN ('faction', 'unit', 'group')`) that the admin is NOT a member of.
  - Each bypass-added channel is tagged with `viewerIsGhost: true` in the response. Existing member channels are tagged `viewerIsGhost: false` (or the field is absent).
  - DMs (`type === 'dm'`) are NEVER added via the bypass, regardless of admin status.

Response shape is otherwise identical. The UI uses `viewerIsGhost` to badge ghost channels differently in `ChannelList`.

#### `GET /api/comms/channels/[id]/messages`

Two additions:

1. **Ghost read bypass.** If the caller is an admin AND sends `?gm=1` as a query param, skip the `members.includes(character.id)` 403 gate. Query param, not header — consistent with the channel list endpoint.
2. **Conditional `postedAsGm` in response.** Only include the field on each message when the viewer is an admin. For non-admin viewers, strip the field entirely from the JSON before sending. The existence of the field — not just its value — is the signal; omitting it means non-admins cannot detect it even by comparing shapes.

#### `GET /api/roleplay/notifications/pending`

Same `postedAsGm` stripping applied here so the mod's pending-notification feed cannot leak the GM flag into the game client. The mod is non-admin by design.

#### `POST /api/comms/channels/[id]/typing`

**No change.** GM mode does not emit typing pings. Ghost behavior: admin can appear as an NPC in message history but never in the "X is typing…" indicator.

#### `GET /api/roleplay/characters/npcs` (new)

Admin-only. Returns the dropdown feed for the GM picker.

- Auth: `requireGmAdmin`.
- Query: `payload.find({ collection: 'characters', where: { and: [{ discordId: { exists: false } }, { isArchived: { not_equals: true } }] }, sort: 'lastName', limit: 500, depth: 1 })`.
- Shape per character: `{ id, firstName, lastName, fullName, callsign, avatarUrl, rankAbbreviation, isTarget }`.
- Used once per GM-mode entry by the client, cached in `useGmMode` state until GM mode is exited.

### Presence

GM mode does not trigger presence pings as the impersonated character. The admin's real character continues pinging presence on its own membered channels as normal. The NPC never appears "online".

### Audit trail

The `posted_as_gm` column on `comms_messages` IS the audit trail. Combined with existing `created_at` and `sender_character_id`, Payload admin queries answer "show me every GM-posted message by NPC X" or "every GM post by any admin in channel Y this week". No separate audit log table needed.

### Client components

#### `AdminBar.tsx` (new)

**Location:** `src/components/comms/AdminBar.tsx`. Renders above or immediately adjacent to `comms-profile-bar`, admin-only. Non-admins get `return null`.

**Design brief:** thin amber strip, extensible container. GM mode is the first occupant; future admin controls slot in as siblings. Strip is slim (~28-32px) when GM is off and contains only the `MJ` pill on the right. When GM is on, the strip expands to include the active picker/status.

**States:**

1. **GM off (default)** — thin amber strip, optional left label `ADMIN`, right-side `MJ` pill. Clicking the pill enables GM mode.
2. **GM on, no character picked yet** — strip expands. Left: label `MODE MJ`. Center: dropdown labeled `Incarner…` populated from `/api/roleplay/characters/npcs`. Right: red `Quitter MJ` button. Dropdown options show `rankAbbreviation + fullName` and a small "TARGET" tag for `isTarget` characters.
3. **GM on, character picked** — strip shows `MODE MJ · ${rankAbbreviation} ${firstName} ${lastName}` with avatar, a `Changer` button reopening the picker, and the `Quitter MJ` button.

#### `useGmMode.ts` (new)

**Location:** `src/components/comms/useGmMode.ts`.

Exports `GmModeProvider` and `useGmMode()`. State shape:

```ts
{
  enabled: boolean;
  defaultCharacterId: number | null;
  overrideCharacterId: number | null;
  npcList: NpcListItem[] | null;
}
```

API:
- `setEnabled(boolean)` — toggles mode. On `true`, fetches `/api/roleplay/characters/npcs` once and triggers channel list refetch with `?gm=1`. On `false`, clears overrides and refetches channels without the flag.
- `setDefault(id)` — picks the admin bar's active NPC.
- `setOverride(id | null)` — composer-level per-message override.
- `clearOverride()` — called automatically after each successful send.
- `effectiveCharacterId` — derived: `overrideCharacterId ?? defaultCharacterId`.

State is NOT persisted across reloads. Unmounting the provider ends the mode.

#### `CommsLayout.tsx` integration

- Wrap the component tree in `<GmModeProvider>`.
- `loadChannels` reads `useGmMode().enabled` and appends `?gm=1` when true.
- `handleSend` reads `useGmMode()` and, if `enabled` and `effectiveCharacterId != null`, appends `gmMode: true` and `impersonateCharacterId` to the POST body. Calls `clearOverride()` after a successful send.
- Refresh the channel list whenever `enabled` flips, so ghost channels appear/disappear immediately.

#### `ChannelList.tsx` tweak

Channels with `viewerIsGhost === true` render a small amber dot next to the channel name. Dot is only shown when GM mode is on; when GM is off these channels are not in the list at all.

#### `MessageComposer.tsx` tweak — hybrid per-message override

When GM mode is on, the composer toolbar grows a compact character chip at the top-left showing the current effective puppet (override if set, else default). Clicking the chip opens a mini-picker listing the same NPC feed. Selecting an NPC sets the override for the next send only. After send, override clears and the chip reverts to the default character.

When GM mode is off, the chip is not rendered.

#### `MessageList.tsx` tweak — MJ tag

`CommsMessage` type gains optional `postedAsGm?: boolean`. When a message has `postedAsGm === true`, the sender name line gets an `[MJ]` badge next to the rank icon. Because non-admins never receive the field, the badge is automatically invisible to them without any extra viewer check — the rendering is purely field-presence based.

### Tests (tests/comms.test.ts)

New tests, all required before deploy:

1. **NPC derivation filter.** Given a mixed list, `!discordId && !isTarget` correctly buckets into `npcs`, `targets`, `personnel`.
2. **Non-admin + `?gm=1` on channels list** → 403.
3. **Non-admin POST message with `gmMode: true`** → 403.
4. **Admin POST with `gmMode: true` + Discord-linked target** → 400 `"Impersonation limited to NPCs and targets"`.
5. **Admin POST with `gmMode: true` + valid NPC ID into a non-member channel** → 200. Asserts:
   - Message row has `postedAsGm: true`.
   - `senderCharacterId` equals the NPC ID.
   - Channel `members` array is unchanged (NPC not added, admin's real character not added).
6. **Non-admin GET messages from a channel containing a `postedAsGm` message** → response JSON does not contain the `postedAsGm` field at all.
7. **Admin GET same** → field present and `true`.
8. **DM channels are excluded from `?gm=1`** bypass list.

### Version and deploy

- Version bump: `1.6.49` (or whatever is next at deploy time) with a French changelog entry describing both features.
- Deploy via `/deploy-dev` first, manual smoke test of both features on https://dev.lif-arma.com, then `/deploy-prod`.
- DB migration: `ALTER TABLE comms_messages ADD COLUMN IF NOT EXISTS posted_as_gm BOOLEAN DEFAULT FALSE;` applied on both dev and prod VPSes with corresponding `INSERT INTO payload_migrations` rows before the deploy runs.

---

## Non-goals

- Character switcher for real players (single in-service character rule stays).
- Persisted "GM session" that survives reload or cross-tab state sync.
- Impersonating other real players' characters.
- GM-mode typing indicators or presence fakes.
- Admin bypass for DM channels.
- Moving NPC management to a separate Payload collection or adding a `characterType` enum.
- GM mode for DMs (admin can open a DM normally as themselves if needed).
- Bulk-post, scripted NPC behavior, or any automation — GM mode is strictly manual composition.
