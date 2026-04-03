# Version Info Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating "?" button (bottom-left) on all frontend pages that shows version, environment, creator, and changelog in a popup.

**Architecture:** A `version.ts` config file holds version/changelog data. A `VersionInfo` client component renders the button + popup. It's included in the root frontend layout. Styles go in globals.css.

**Tech Stack:** Next.js 15, React 19, lucide-react, CSS custom properties

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/version.ts` | Create | Version number, creator, changelog data |
| `src/components/VersionInfo.tsx` | Create | Client component: "?" button + popup |
| `src/app/(frontend)/globals.css` | Modify (append) | Styles for the widget |
| `src/app/(frontend)/layout.tsx` | Modify | Import and render `<VersionInfo />` |
| `tests/version.test.ts` | Create | Tests for version config structure |
| `CLAUDE.md` | Modify | Add version bump rule |
| `.claude/skills/deploy-prod/SKILL.md` | Modify | Add version check step |
| `.claude/skills/deploy-dev/SKILL.md` | Modify | Add version check step |

---

### Task 1: Create version config

**Files:**
- Create: `src/lib/version.ts`
- Create: `tests/version.test.ts`

- [ ] **Step 1: Write the test file**

```ts
// tests/version.test.ts
import { describe, it, expect } from 'vitest';

const VERSION_FILE = 'src/lib/version.ts';

describe('Version config', () => {
  it('exports VERSION_INFO with required fields', async () => {
    const { VERSION_INFO } = await import('../src/lib/version');
    expect(VERSION_INFO).toBeDefined();
    expect(VERSION_INFO.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(VERSION_INFO.creator).toBe('JaavLex');
    expect(Array.isArray(VERSION_INFO.changelog)).toBe(true);
    expect(VERSION_INFO.changelog.length).toBeGreaterThan(0);
  });

  it('each changelog entry has version, date, and changes', async () => {
    const { VERSION_INFO } = await import('../src/lib/version');
    for (const entry of VERSION_INFO.changelog) {
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(entry.changes)).toBe(true);
      expect(entry.changes.length).toBeGreaterThan(0);
    }
  });

  it('first changelog entry matches current version', async () => {
    const { VERSION_INFO } = await import('../src/lib/version');
    expect(VERSION_INFO.changelog[0].version).toBe(VERSION_INFO.version);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/version.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create version config**

```ts
// src/lib/version.ts
export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const VERSION_INFO = {
  version: '1.1.0',
  creator: 'JaavLex',
  changelog: [
    {
      version: '1.1.0',
      date: '2026-04-03',
      changes: [
        'Ajout du widget de version et changelog',
      ],
    },
    {
      version: '1.0.0',
      date: '2026-04-03',
      changes: [
        'Version initiale du site LIF',
      ],
    },
  ] satisfies ChangelogEntry[],
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/version.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```
git add src/lib/version.ts tests/version.test.ts
git commit -m "feat: add version config with changelog"
```

---

### Task 2: Create VersionInfo component

**Files:**
- Create: `src/components/VersionInfo.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/VersionInfo.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, ChevronDown, ChevronRight } from 'lucide-react';
import { VERSION_INFO } from '@/lib/version';

export function VersionInfo() {
  const [open, setOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const env = process.env.NEXT_PUBLIC_LIF_ENVIRONMENT === 'dev' ? 'dev' : 'prod';
  const envLabel = env === 'dev' ? 'DÉVELOPPEMENT' : 'PRODUCTION';

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="version-info-wrapper" ref={panelRef}>
      <button
        className="version-info-btn"
        onClick={() => setOpen(!open)}
        aria-label="Informations de version"
        title="Informations de version"
      >
        <HelpCircle size={18} />
      </button>

      {open && (
        <div className="version-info-panel">
          <div className="version-info-header">
            <span className="version-info-version">v{VERSION_INFO.version}</span>
            <span className={`version-info-env version-info-env--${env}`}>
              {envLabel}
            </span>
            <button className="version-info-close" onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>

          <div className="version-info-creator">
            Créé par <strong>{VERSION_INFO.creator}</strong>
          </div>

          <button
            className="version-info-changelog-toggle"
            onClick={() => setChangelogOpen(!changelogOpen)}
          >
            {changelogOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Changelog
          </button>

          {changelogOpen && (
            <div className="version-info-changelog">
              {VERSION_INFO.changelog.map((entry) => (
                <div key={entry.version} className="version-info-changelog-entry">
                  <div className="version-info-changelog-header">
                    <span className="version-info-changelog-version">v{entry.version}</span>
                    <span className="version-info-changelog-date">{entry.date}</span>
                  </div>
                  <ul className="version-info-changelog-changes">
                    {entry.changes.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add src/components/VersionInfo.tsx
git commit -m "feat: add VersionInfo component"
```

---

### Task 3: Add styles to globals.css

**Files:**
- Modify: `src/app/(frontend)/globals.css` (append at end)

- [ ] **Step 1: Append version info styles**

Add at the end of `globals.css`:

```css
/* ============================
   VERSION INFO WIDGET
   ============================ */

.version-info-wrapper {
  position: fixed;
  bottom: 4rem;
  left: 1rem;
  z-index: 1001;
}

.version-info-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: rgba(12, 15, 10, 0.95);
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  transition: all 0.2s;
}

.version-info-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.version-info-panel {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 0;
  width: 280px;
  background: rgba(12, 15, 10, 0.98);
  border: 1px solid var(--border);
  backdrop-filter: blur(12px);
  font-size: 0.8rem;
  font-family: 'Courier New', monospace;
}

.version-info-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.version-info-version {
  color: var(--foreground);
  font-weight: 700;
  letter-spacing: 0.5px;
}

.version-info-env {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 0.15rem 0.4rem;
  text-transform: uppercase;
}

.version-info-env--prod {
  color: var(--primary);
  border: 1px solid var(--primary);
}

.version-info-env--dev {
  color: var(--accent);
  border: 1px solid var(--accent);
}

.version-info-close {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0.2rem;
  display: flex;
}

.version-info-close:hover {
  color: var(--foreground);
}

.version-info-creator {
  padding: 0.5rem 0.75rem;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
}

.version-info-creator strong {
  color: var(--foreground);
}

.version-info-changelog-toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  text-align: left;
  letter-spacing: 0.5px;
}

.version-info-changelog-toggle:hover {
  color: var(--foreground);
  background: rgba(74, 124, 35, 0.08);
}

.version-info-changelog {
  max-height: 200px;
  overflow-y: auto;
  border-top: 1px solid var(--border);
}

.version-info-changelog-entry {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px dashed rgba(45, 52, 37, 0.5);
}

.version-info-changelog-entry:last-child {
  border-bottom: none;
}

.version-info-changelog-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.3rem;
}

.version-info-changelog-version {
  color: var(--primary);
  font-weight: 700;
  font-size: 0.75rem;
}

.version-info-changelog-date {
  color: var(--muted);
  font-size: 0.7rem;
}

.version-info-changelog-changes {
  list-style: none;
  padding: 0;
  margin: 0;
}

.version-info-changelog-changes li {
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.4;
  padding-left: 0.75rem;
  position: relative;
}

.version-info-changelog-changes li::before {
  content: '>';
  position: absolute;
  left: 0;
  color: var(--primary);
}
```

- [ ] **Step 2: Commit**

```
git add src/app/(frontend)/globals.css
git commit -m "style: add version info widget styles"
```

---

### Task 4: Integrate into layout

**Files:**
- Modify: `src/app/(frontend)/layout.tsx`

- [ ] **Step 1: Add VersionInfo to layout**

In `src/app/(frontend)/layout.tsx`, add the import after the DevBanner import:

```ts
import { VersionInfo } from '@/components/VersionInfo';
```

Then add `<VersionInfo />` after `<DevBanner />` in the body:

```tsx
<body>
    <DevBanner />
    <VersionInfo />
    {children}
</body>
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing 68 + 3 new version tests)

- [ ] **Step 3: Commit**

```
git add src/app/(frontend)/layout.tsx
git commit -m "feat: integrate VersionInfo widget into frontend layout"
```

---

### Task 5: Update instructions and deploy skills

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.claude/skills/deploy-prod/SKILL.md`
- Modify: `.claude/skills/deploy-dev/SKILL.md`

- [ ] **Step 1: Add version rule to CLAUDE.md**

Add a new bullet to the `## Critical Rules` section, after the line about branches:

```
- **Version bump before deploy** — update `version` and `changelog` in `src/lib/version.ts` before every deploy
```

Also add `src/lib/version.ts` to the `## Key Files` section:

```
- `src/lib/version.ts` — Version number, creator, changelog (update before deploy)
```

- [ ] **Step 2: Add version check to deploy-prod skill**

In `.claude/skills/deploy-prod/SKILL.md`, add a new step 1 (shifting existing steps down):

```
1. **Check version** — Confirm that `src/lib/version.ts` has been updated with a new version number and changelog entry for this deploy. If not, ask the user what version number and changelog to use, then update the file.
```

- [ ] **Step 3: Add version check to deploy-dev skill**

In `.claude/skills/deploy-dev/SKILL.md`, add the same new step 1:

```
1. **Check version** — Confirm that `src/lib/version.ts` has been updated with a new version number and changelog entry for this deploy. If not, ask the user what version number and changelog to use, then update the file.
```

- [ ] **Step 4: Commit**

```
git add CLAUDE.md .claude/skills/deploy-prod/SKILL.md .claude/skills/deploy-dev/SKILL.md
git commit -m "docs: add version bump requirement to deploy instructions"
```
