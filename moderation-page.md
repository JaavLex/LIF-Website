# Moderation page feature

You are a **Senior Fullstack Developer / Solution Architect** working on a website for an **Arma Reforger roleplay community**.

Your task is to design a **Moderation Page / Moderation System** that integrates with our existing website, existing Discord login, and our existing Discord bot that is already linked to the website on the roleplay page.

The goal is to produce a solution that is **serious, scalable, maintainable, secure, permission-safe, and fully configurable through Payload CMS**.

## Core Context

- The website already supports **Discord authentication**
- The website already has a **roleplay page**
- We already have a **Discord bot connected to the website**
- Some moderation-related features already exist on the roleplay side, including **ticket transcript handling**
- This new moderation page must **centralize moderation workflows**
- This page is for **staff use only**

---

## Global Rules

### MUST

- Your full explanation must be in **English**
- **All UI text, labels, buttons, statuses, notifications, placeholders, modals, and page content must be in French**
- The system must be **fully configurable through Payload CMS** where relevant
- Permissions must be enforced **server-side**
- The system must be **scalable and maintainable**
- The system must support **multiple characters per user**
- The system must support **personnel** and **targets** as **separate entities**
- The solution must work with the **existing Discord bot**, not replace it
- The solution must support **audit logs**
- The solution must support **file attachments** on cases and messages
- The solution must support **Discord-side moderation synchronization**
- The solution must keep a clear separation between:
  - Discord account
  - Website account
  - In-game/server identity
  - Character identity
  - Moderation target

### MUST NOT

- Do not use English in UI content
- Do not hardcode sections or layouts in the frontend
- Do not rely only on frontend permission checks
- Do not assume one user = one character
- Do not merge moderator identity and target identity into the same concept
- Do not make moderation actions depend only on Discord role visibility in frontend
- Do not design this as a simple admin page with no structure

---

## Main Objective

Design a **complete Moderation Page system** for staff members.

This system must allow authorized administrators to:

- view relevant users from the Discord server
- create and manage moderation cases
- comment and append evidence to existing cases
- classify case events as positive or negative
- perform moderation actions that synchronize with Discord
- receive logging and moderation-result outputs in a dedicated Discord channel
- move and centralize ticket transcripts from the roleplay page into this moderation system

---

## 1. Access Control

### Authentication

- Login is done through **Discord**
- Only authorized users may access this moderation page

### Authorization

- Authorized users are the same users defined as **administrators in the global roleplay permissions/system**
- Unauthorized users must not be able to:
  - see the page
  - query its data
  - access case details
  - edit anything
  - trigger moderation actions

### Required security behavior

- Access checks must be enforced **server-side**
- API routes / server actions / backend services must verify permissions
- Frontend hiding alone is not enough
- The system should support multiple permission levels, for example:
  - no access
  - read/comment access
  - full moderation access
  - super admin / configuration access

---

## 2. Moderation Page Content and Features

### 2.1 User Listing

The moderation page must include a list of all relevant Discord users from the server.

For each user, display at least:

- Discord username
- Server username / community username / in-server name if different
- Avatar / profile picture
- Link to moderation history
- Ability to open or create a moderation case

The architecture must clearly support cases where:

- one Discord account may have multiple characters
- one user may have both account-level and character-level records
- server identity and Discord identity are not always exactly the same string

---

### 2.2 Moderation Cases

Staff must be able to open a moderation case on a user.

Each case must contain:

- Case number
- Target user
- Target’s server username
- Target’s Discord identity
- Administrator identity who created the case
- Admin profile picture
- Admin server name and/or Discord name
- Reason for opening the case
  Examples:
  - potentiel helper/modérateur
  - joueur problématique
  - surveillance
  - comportement à vérifier
  - autre

- Date of case opening
- Main content / description field
- Attachments inside the case:
  - audio
  - video
  - images
  - other useful evidence files if relevant

The case system must support:

- open / pending / escalated / resolved / archived statuses
- timeline/history view
- evidence attachments
- internal staff discussion
- event history
- auditability

---

### 2.3 Case Messages / Comments

Inside a case, every authorized administrator must be able to post a new message.

Each message/comment must support:

- message content
- date/time
- author
- audio/video/image attachments
- optional checkbox: **“Nouvel événement”**
- if checked, the event must be classifiable as:
  - **positif**
  - **négatif**

This should feed into the case timeline and should visually distinguish:

- normal staff comment
- moderation event
- automated system event
- Discord synchronization event

---

### 2.4 Moderation Actions

Inside a case, administrators with **full access** must be able to trigger moderation actions that also apply on Discord.

Supported actions:

- Warn
- Kick
- Temporary ban
- Permanent ban

These actions must integrate with the existing Discord bot / backend system.

When a moderation action is triggered:

- it must be stored on the website
- it must be synchronized to Discord
- the targeted user must receive a Discord message or equivalent notification
- the action result must be logged in a dedicated admin results channel
- the case timeline must record the action

---

## 3. Warn Escalation Logic

Warns must follow this exact escalation logic:

- 1 warn → avertissement
- 2 warns → kick automatique
- 3 warns → ban 24h
- 4 warns → ban 3 jours
- 5 warns → ban 7 jours
- 6 warns → ban 14 jours
- 7 warns → ban définitif

### Required behavior

- The system must track the current warn count of the user
- Warn count must be persistent and queryable
- A new warn should automatically determine the resulting sanction
- Staff should be able to see:
  - current warn count
  - sanction that will happen on next warn
  - warn history
  - linked case references

- Website state and Discord state must remain synchronized as much as possible
- Failed Discord actions must not silently pass; they must be logged with error status

### Notification behavior

When a user is warned, kicked, or banned:

- the user should receive a Discord notification with:
  - reason
  - current warn count
  - sanction duration if applicable

- the admin log channel should receive a result message such as:
  - user warned
  - user reached X warns
  - automatic kick triggered
  - automatic ban triggered for Y duration

---

## 4. Discord Admin Result Channel

The moderation system must support configuration of a dedicated Discord channel where moderation command results are posted.

Examples of events to log there:

- case created
- warn issued
- warn count increased
- kick executed
- temporary ban executed
- permanent ban executed
- Discord sync failed
- transcript imported
- case status changed

This channel configuration must be manageable in CMS or in a secure server-side config layer, depending on what is appropriate.

---

## 5. Transcript Migration

Ticket transcripts currently associated with the roleplay page must be moved into this new moderation page/system.

Design how transcripts should be:

- imported or linked
- attached to a moderation case
- searchable
- readable in staff context
- preserved historically
- permission-protected

Clarify whether transcripts should be:

- fully migrated into moderation storage
- referenced from existing storage
- copied on case creation
- attached manually or automatically

---

## 6. Payload CMS Requirements

Everything that makes sense to configure must be manageable via Payload CMS.

This includes, where appropriate:

- moderation page sections
- case reason categories
- case statuses
- event categories
- attachment rules
- Discord channel IDs used by the system
- permission mappings or moderation configuration references
- moderation UI blocks if dynamic frontend composition is used
- text labels or explanatory blocks if editable content exists

Do not hardcode frontend layout sections when CMS-driven rendering is more appropriate.

However, do not force critical security logic into CMS if it belongs in backend code.

You must clearly separate:

- CMS-managed configuration/content
- backend-enforced business rules
- Discord bot integration layer
- frontend display layer

---

## 7. Expected Output

Provide a **serious technical product/engineering answer**, not just a vague concept.

Your answer must include:

1. **Feature breakdown**
2. **Recommended architecture**
3. **Data model / collections / entities**
4. **Permission model**
5. **Backend flow**
6. **Discord bot integration flow**
7. **Payload CMS structure**
8. **Frontend page structure**
9. **Case lifecycle**
10. **Warn escalation implementation**
11. **Transcript migration approach**
12. **Audit log strategy**
13. **Scalability / maintainability recommendations**
14. **Potential risks / edge cases**
15. **Suggested UI sections and French UI wording examples**
16. **What should be configurable vs hardcoded vs server-protected**

When useful, provide:

- collection names
- field structures
- relation examples
- API route suggestions
- server action logic
- moderation workflow examples
- practical implementation notes

The answer must be structured, concrete, and implementation-oriented.

---

## Important Existing Context

We already have a Discord bot with commands linked to the website on the roleplay page.

So your design must:

- reuse that existing bot/integration where possible
- avoid duplicating logic unnecessarily
- centralize moderation into this new page
- explain how current roleplay-linked moderation/ticket systems should be refactored or reused cleanly

---

# Suggestions

Your original prompt is decent on intent, but it has a few weak spots. Here’s what I’d add or tighten.

## 1. Force Claude to separate identities properly

Right now, “Discord user”, “server username”, “website user”, and “character” can get mixed together fast.

You should explicitly require these entities:

- `UserAccount`
- `DiscordAccount`
- `Character`
- `ModerationCase`
- `ModerationAction`
- `CaseMessage`
- `Transcript`
- `AdminProfile` or role mapping

Otherwise you’ll get a blurry design.

## 2. Add appeal / closure logic

A moderation system without closure logic is half-baked.

Add:

- case status change reason
- who closed a case
- reopen case
- appeal flag
- internal resolution summary

## 3. Add immutable audit logs

This matters a lot because staff tools get abused or disputed.

You want Claude to include:

- who did what
- old value → new value
- timestamp
- Discord action result
- failure logs
- cannot silently edit sanction history

## 4. Define source of truth

You already have website + Discord bot. One of them must be authoritative for moderation state.

Best question to force Claude to answer:

- Is the source of truth the website database, with Discord as execution layer?
- Or is Discord the source and website mirrors it?

In practice, website DB should be source of truth, Discord should be action target.

## 5. Ask for failure handling

This is missing and it matters.

Examples:

- Discord API fails after website action saved
- user left the Discord server
- user DMs closed
- target has no linked website account
- moderator loses permission mid-session
- duplicate warn request due to double click / retry

You want idempotency and reconciliation.

## 6. Ask for transcript handling rules

“Move transcript” is too vague.

You should ask:

- are transcripts automatically linked to cases?
- can one transcript belong to multiple cases?
- are transcripts immutable after import?
- who can read them?
- are attachments mirrored or hotlinked?

## 7. Add search and filtering

A moderation page without search becomes trash quickly.

Require:

- search by Discord name
- search by server name
- search by character
- filter by case status
- filter by moderator
- filter by sanction type
- filter by positive/negative events
- sort by latest activity

## 8. Add rate limits / protections

Staff tools need guardrails.

Require:

- confirmation modal for kick/ban/perma ban
- reason mandatory for moderation actions
- optional second confirmation for permanent ban
- rate limiting / duplicate action prevention
- permission gating per action type

## 9. Clarify CMS boundaries

Not everything should be in Payload CMS.

Good CMS-managed things:

- labels
- categories
- reasons
- channel IDs
- UI sections
- explanatory text

Bad CMS-managed things:

- warn escalation core logic
- permission enforcement
- sanction execution logic
- audit log integrity

## 10. Ask for concrete French UI examples

Since your frontend must be French, force Claude to give examples like:

- “Créer un dossier”
- “Historique des événements”
- “Sanction appliquée”
- “Avertissements actuels”
- “Joindre un fichier”
- “Transcription liée”
- “Confirmer le bannissement”

That avoids generic English-first design.

Here’s the **updated addendum** you can append to the prompt for Claude.
This integrates what you asked **without weakening the structure**.

---

# Additional Mandatory Requirements

## Identity Separation (Required)

The system must **explicitly separate identities** and never merge them.

The architecture must distinguish between:

- Website User Account
- Discord Account
- Server Username
- Character(s)
- Moderation Target
- Moderator/Admin identity

A single Discord account may:

- own multiple characters
- have multiple cases
- have multiple sanctions
- appear under different server usernames over time

The system must **handle this cleanly** and allow historical traceability.

---

## User Profile Page (from Moderation List)

From the moderation user list, administrators must be able to **open a full moderation profile** for a user.

This profile must display:

### Identity Section

- Discord username
- Server username
- Avatar
- Discord ID (internal reference)

### Characters Section

List of characters owned by the user (from Roleplay system):

- Character name
- Status (active / dead / archived if applicable)
- Link to character sheet (if exists)

### Sanctions Section

Complete sanction history:

- Warns
- Kicks
- Temporary bans
- Permanent bans

For each sanction:

- Type of sanction
- Reason
- Date
- Duration (if applicable)
- Moderator who triggered it
- Linked case (if exists)

---

### Warn Status

Display clearly:

- Current warn count
- Next sanction threshold
- Total warns historically
- Last warn date

---

### Cases Section

Display all cases involving this user:

- Active cases
- Archived cases
- Case number
- Status
- Creation date
- Last activity date
- Moderator who opened

If a case already exists, administrators must be able to **open it directly**.

---

## Case Lifecycle Rules

Cases must **never be deleted**.

Cases can be:

- Open
- Pending
- Resolved
- Archived

### Archiving Behavior

- Cases may be archived manually
- Archived cases remain readable
- Archived cases do not appear in "active" lists by default
- Archived cases remain in search results

### Reopen Behavior

If a new moderation case is opened for a user:

- If an archived case already exists for that user
- The system must **automatically de-archive** that case
- The case must move back to active state
- A system event must be added:
  - "Réouverture du dossier"

No duplicate case should be created unless explicitly forced.

---

## Moderation Commands in Case History

All moderation actions must appear **inside the case timeline**.

This includes:

- Warn
- Kick
- Temporary ban
- Permanent ban

Each moderation action must create an **immutable event** in case history with:

- Action type
- Target user
- Date and time
- Moderator who triggered it
- Reason
- Warn count after action
- Automatic escalation result (if applicable)
- Discord sync status (success / failed)

These events must be visually distinct from normal comments.

Example events:

- "Avertissement appliqué"
- "Expulsion automatique déclenchée"
- "Bannissement temporaire 24h"
- "Bannissement définitif appliqué"

---

## Case Timeline Event Types

The timeline must support multiple event types:

- Staff message
- Evidence added
- Moderation action
- Warn escalation automatic action
- Case reopened
- Case archived
- Transcript linked
- System event

Each must display:

- Author (or "Système")
- Date
- Event type
- Content

---

## Search and Filtering Requirements

Moderation interface must support:

### User Search

- Discord username
- Server username
- Character name
- Discord ID

### Case Filters

- Active cases
- Archived cases
- Cases with sanctions
- Cases with negative events
- Cases with positive events
- Cases by moderator
- Cases by date range

### Sanction Filters

- Warns
- Kicks
- Temporary bans
- Permanent bans

---

## Case Creation Rules

When opening a case:

- If an active case exists → open existing case
- If archived case exists → de-archive and reopen
- If no case exists → create new one

This prevents multiple fragmented cases for same user.

---

## Required UI Sections (French Only)

Examples Claude must follow:

User list:

- "Liste des utilisateurs"
- "Ouvrir le profil"
- "Ouvrir le dossier"
- "Créer un dossier"

User profile:

- "Profil utilisateur"
- "Personnages"
- "Historique des sanctions"
- "Nombre d'avertissements"
- "Dossiers associés"

Case view:

- "Historique du dossier"
- "Nouvel événement"
- "Sanction appliquée"
- "Archiver le dossier"
- "Réouvrir le dossier"

---

## Important Behavioral Rules

- Moderation actions must **always** be tied to a case
- Sanctions cannot exist without case linkage
- Warn escalation must be automatic but logged
- Case history must be immutable
- Editing past moderation actions must not be allowed
- Only new events may be appended
