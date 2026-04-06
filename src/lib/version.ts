// src/lib/version.ts
export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const VERSION_INFO = {
  version: '1.3.2',
  creator: 'JaavLex',
  changelog: [
    {
      version: '1.3.2',
      date: '2026-04-06',
      changes: [
        'Page de liaison : vérification membre Discord et rôle opérateur requis',
        'Message et lien Discord si non-membre ou sans entrée en service',
      ],
    },
    {
      version: '1.3.1',
      date: '2026-04-06',
      changes: [
        'Filtre des unités par faction dans le formulaire personnage',
        'Graphique finances exclut les personnages non liés',
        'Page de liaison : connexion Discord requise avant liaison',
        'Champ UUID en lecture seule avec bouton de liaison via le jeu',
      ],
    },
    {
      version: '1.3.0',
      date: '2026-04-04',
      changes: [
        'Système de liaison roleplay',
      ],
    },
    {
      version: '1.2.5',
      date: '2026-04-04',
      changes: [
        'Option pour passer l\'écran de chargement (cliquer n\'importe où)',
        'Correction du bandeau dev qui bloquait la navbar sur mobile',
        'Correction des accents dans le bandeau dev',
      ],
    },
    {
      version: '1.2.4',
      date: '2026-04-04',
      changes: [
        'Correction du logo coupé par la navbar sur mobile en page d\'accueil',
      ],
    },
    {
      version: '1.2.3',
      date: '2026-04-04',
      changes: [
        'Responsivité mobile des fiches personnage (lecture, création, modification)',
        'En-tête fiche et boutons d\'action empilés verticalement sur mobile',
        'Grilles de formulaire en colonne unique sur petits écrans',
        'Infos du personnage pleine largeur avec labels empilés',
      ],
    },
    {
      version: '1.2.2',
      date: '2026-04-04',
      changes: [
        'Contrôles mobiles roleplay masqués par défaut derrière un bouton toggle',
        'Lecteur audio et boutons apparaissent en glissant avec animation',
        'Gain d\'espace écran (~6-10%) sur mobile en mode roleplay',
      ],
    },
    {
      version: '1.2.1',
      date: '2026-04-04',
      changes: [
        'Amélioration de la responsivité mobile sur la page roleplay',
        'Lecteur audio en barre pleine largeur sur mobile',
        'Boutons de navigation repositionnés pour éviter les chevauchements',
        'Réduction du padding terminal sur petits écrans',
      ],
    },
    {
      version: '1.2.0',
      date: '2026-04-04',
      changes: [
        'Refonte visuelle de la page d\'accueil — typographie militaire, animations d\'entrée',
        'Navigation mobile avec menu hamburger',
        'Cartes angulaires avec accents dorés et textures de fond',
        'Barres de remplissage joueurs sur les serveurs',
        'Section CTA redessinée avec motifs géométriques',
        'Taille de police minimum 11px sur la section roleplay',
        'États focus-visible globaux pour l\'accessibilité',
      ],
    },
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
