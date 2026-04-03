# Copilot Instructions — LIF-Website

## Project

LIF-Website: website for the Légion Internationale Francophone (LIF), an Arma Reforger RP community.
Stack: Next.js 15 + Payload CMS 3 + PostgreSQL 16 + TypeScript.

## Rules

- **ALL UI text MUST be in French** — no exceptions
- Code, comments, variable names in English
- Dark military terminal theme (monospace, CRT, green-on-black)
- Server-side permission enforcement always — never rely on frontend checks alone
- Use `var(--background)` for opaque backgrounds — `var(--bg)` DOES NOT EXIST
- Fish shell locally — no bash-specific syntax
- `biId` field has `unique: true` — always convert empty string to `null`

## CSS Variables

```
--background: #0c0f0a
--background-secondary: #1a1f16
--primary: #4a7c23
--primary-hover: #5d9a2d
--muted: #8b9a7d
--border: #2d3425
--card-bg: rgba(26, 31, 22, 0.8)
```

## Architecture

- Collections: `src/collections/` — Characters, Ranks, Units, Factions, Intelligence, BankHistory, etc.
- Globals: `src/globals/` — Homepage, Navigation, Roleplay, AdminDashboard
- API routes: `src/app/api/roleplay/` — REST endpoints for all roleplay data
- Frontend: `src/app/(frontend)/roleplay/` — military terminal UI
- Components: `src/components/roleplay/` — client components
- Lib: `src/lib/` — payload client, session, admin checks, game server, discord, cron
- Styles: `src/app/(frontend)/roleplay/roleplay.css` — terminal theme

## Auth Flow

Discord OAuth → `/api/auth/discord` → callback → `roleplay-session` HMAC cookie → `verifySession()`.
Admin: `checkAdminPermissions(session)` checks DB role then Discord roles from Roleplay global config.

## Game Server

FeatherPanel API at `panel.lif-arma.com`. Functions in `src/lib/game-server.ts`.
Auto-sync cron in `src/lib/game-sync-cron.ts` (money + names every 15min).
Started by `src/instrumentation.ts`.

## Deployment

Local build broken. Build on VPS only via SSH alias `LIF`.
`git push` → `ssh LIF "cd /home/armarserver/LIF-Website && git pull && npm run build"` → kill next-server (systemd auto-restarts).

## Sensitive Info

See `.ai-instructions.md` (git-ignored) for credentials, env vars, server access.

## Type Generation

After collection/global changes:
`env DATABASE_URI=postgresql://localhost/dummy PAYLOAD_SECRET=dummysecretdummysecretdummy npx payload generate:types`
