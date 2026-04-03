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
