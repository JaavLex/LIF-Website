# Version Info Widget — Design Spec

## Overview

A floating "?" icon (bottom-left corner) on every frontend page that opens a popup showing version, environment, creator, and changelog.

## Components

### 1. `src/lib/version.ts` — Version config

```ts
export const VERSION_INFO = {
  version: '1.0.0',
  creator: 'JaavLex',
  changelog: [
    {
      version: '1.0.0',
      date: '2026-04-03',
      changes: ['Version initiale du site LIF'],
    },
  ],
}
```

Manually maintained. Must be updated before each deploy (version bump + changelog entry).

### 2. `src/components/VersionInfo.tsx` — Client component

- **Trigger:** `HelpCircle` icon from lucide-react (small, ~32px button)
- **Popup:** Opens upward from the button, contains:
  - Header: version number + environment badge
  - Creator line: "Cr\u00e9\u00e9 par JaavLex"
  - Changelog: collapsible list of versions with dates and bullet points
- **Close:** Click outside or click the button again
- **Environment:** Read from `process.env.NEXT_PUBLIC_LIF_ENVIRONMENT` — show "D\u00c9VELOPPEMENT" (yellow) or "PRODUCTION" (green)

### 3. Styling

- Inline styles or CSS in globals.css
- Matches existing dark military theme (uses `var(--background)`, `var(--border)`, `var(--primary)`, `var(--accent)`, `var(--foreground)`, `var(--muted)`)
- Opaque background (required by project rules)

### 4. Positioning

- Fixed, bottom-left: `left: 1rem; bottom: 4rem`
- `bottom: 4rem` clears the roleplay tutorial buttons and disclaimer at `bottom: 1rem`
- `z-index: 1001` — above navbar (1000), below tutorial overlay (10000)

### 5. Integration

- Imported in `src/app/(frontend)/layout.tsx` — renders on all frontend pages
- No backend/API needed — purely client-side

## Instruction Updates

- **CLAUDE.md:** Add rule: "Update version and changelog in `src/lib/version.ts` before every deploy"
- **Deploy skills:** Add pre-deploy reminder about version bump + changelog
