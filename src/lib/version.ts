// src/lib/version.ts
export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const VERSION_INFO = {
  version: '1.1.2',
  creator: 'JaavLex',
  changelog: [
    {
      version: '1.1.2',
      date: '2026-04-03',
      changes: [
        'Correction de la superposition des boutons sur la page roleplay',
      ],
    },
    {
      version: '1.1.1',
      date: '2026-04-03',
      changes: [
        'Mise à jour des skills de déploiement et configuration Ansible',
        'Ajout de l\'environnement de dev et fichiers de documentation',
      ],
    },
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
