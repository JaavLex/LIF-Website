// src/lib/version.ts
export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const VERSION_INFO = {
  version: '1.6.4',
  creator: 'JaavLex',
  changelog: [
    {
      version: '1.6.4',
      date: '2026-04-07',
      changes: [
        'COMMS — son de notification (ping doux) pour les nouveaux messages',
        'COMMS — son radio (statique + alerte) lors d\'une mention @',
        'COMMS — bouton 🔊/🔇 dans la barre de profil pour couper les sons (mémorisé)',
        'COMMS — bandeau d\'avis : fermeture mémorisée localement',
        'COMMS — créateurs de groupe peuvent retirer un membre depuis le panneau « Membres »',
        'COMMS — utilisateurs anonymes : avatar mystérieux à capuche avec œil rouge',
        'COMMS — correctif visuel : guillemets et caractères spéciaux dans les noms (échappement HTML doublé supprimé)',
      ],
    },
    {
      version: '1.6.3',
      date: '2026-04-07',
      changes: [
        'COMMS — modal personnage : affiche grade (icône), faction (logo) et unité (insigne) avec leurs visuels',
        'COMMS — endpoint personnage enrichi avec factionLogoUrl (résolu par nom)',
        'COMMS — notifications globales : intervalle réduit à 12s + cache: no-store pour fiabilité',
      ],
    },
    {
      version: '1.6.2',
      date: '2026-04-07',
      changes: [
        'COMMS — notifications globales : les toasts apparaissent sur tout le site (pas seulement /comms)',
        'COMMS — clic sur un toast ouvre directement le canal concerné (?channel=ID)',
        'COMMS — insigne de grade : agrandi, encadré, affiché comme un badge à côté du nom',
        'COMMS — correctif : profondeur de récupération du grade portée à 2 (l\'icône s\'affichait pas dans les messages)',
      ],
    },
    {
      version: '1.6.1',
      date: '2026-04-07',
      changes: [
        'COMMS — bouton « Quitter le groupe » : message système notifiant les autres membres',
        'COMMS — bouton « Fermer la conversation » sur les DM (supprime le canal)',
        'COMMS — insigne de grade affiché à la place du texte du grade dans les bulles de message',
      ],
    },
    {
      version: '1.6.0',
      date: '2026-04-07',
      changes: [
        'COMMS — répondre à un message : prévisualisation citée dans le composeur, clic pour défiler vers l\'original',
        'COMMS — sélecteur de mentions @ : auto-complétion des membres du canal au clavier',
        'COMMS — indicateur « X est en train d\'écrire… » en temps réel',
        'COMMS — présence en ligne : pastille verte à côté des membres actifs',
        'COMMS — toasts de notification pour nouveaux messages dans les autres canaux',
        'COMMS — DM Discord automatique aux membres mentionnés hors-ligne',
        'COMMS — panneau de modération étendu : visualisation des pièces jointes média et liens détectés',
        'ROLEPLAY — tiroir audio rétractable (bouton ↗ pour ouvrir/fermer le lecteur)',
      ],
    },
    {
      version: '1.5.1',
      date: '2026-04-07',
      changes: [
        'COMMS — barre de profil enrichie (avatar + grade + faction + unité avec icônes)',
        'COMMS — liste des canaux avec icône (logo faction/unité, photo DM, mosaïque membres pour groupes + bulle « +N »)',
        'COMMS — bulle de message avec icône de grade, prévisualisation de réponse, mentions @ surlignées',
        'COMMS — DM anonyme : option à la création, recipient ne voit pas l\'identité du sender',
        'COMMS — fond Matrix visible derrière les panneaux (transparence + flou)',
        'COMMS — correction du payload d\'API NewDmModal (otherCharacterId → targetCharacterId)',
      ],
    },
    {
      version: '1.5.0',
      date: '2026-04-07',
      changes: [
        'COMMS — bouton « Membres » dans l\'en-tête du canal ouvrant la liste complète',
        'COMMS — clic sur un nom d\'expéditeur (non anonyme) ouvre la fiche personnage en modal',
        'COMMS — clic sur une fiche personnage ou un renseignement joint ouvre un modal avec « Voir la fiche complète » / « Voir le renseignement »',
        'COMMS — Entrée envoie le message, Maj+Entrée pour un retour à la ligne',
        'COMMS — synchronisation automatique de tous les canaux faction/unité (création + ajout des membres) à chaque chargement',
      ],
    },
    {
      version: '1.4.2',
      date: '2026-04-07',
      changes: [
        'Correction : page /comms invisible — le canvas Matrix (position:fixed) passait par-dessus le contenu. Ajout d\'un stacking context sur .comms-page.',
      ],
    },
    {
      version: '1.4.1',
      date: '2026-04-07',
      changes: [
        'Correction : table payload_locked_documents_rels manquait les colonnes pour comms (causait une erreur SQL au save admin et au clic Accept)',
        'Auto-grade Discord : appliqué aussi à la modification (et pour les admins quand "grade forcé" est désactivé)',
      ],
    },
    {
      version: '1.4.0',
      date: '2026-04-07',
      changes: [
        'Système COMMS — messagerie RP (factions, unités, DM, groupes)',
        'Auto-canaux faction/unité synchronisés avec le personnage actif',
        'Pièces jointes : fiches personnage, renseignements, images, vidéos, PDF',
        'Markdown sécurisé (gras, italique, code, liens, citations)',
        'Mode anonyme (identité réelle conservée pour modération)',
        'Disclaimer obligatoire et bannière permanente',
        'Fenêtre d\'édition/suppression de 5 minutes pour ses propres messages',
        'Panneau /moderation/comms : visualisation de tous les canaux + révélation des envois anonymes',
      ],
    },
    {
      version: '1.3.7',
      date: '2026-04-06',
      changes: [
        'Champ Callsign sur les fiches personnage (affiché entre prénom et nom)',
      ],
    },
    {
      version: '1.3.6',
      date: '2026-04-06',
      changes: [
        'Limite d\'un seul personnage actif par joueur',
        'Changement de statut (KIA, MIA, etc.) délie automatiquement l\'UUID et retire le personnage principal',
        'Personnage principal coché par défaut à la création (non modifiable)',
      ],
    },
    {
      version: '1.3.5',
      date: '2026-04-06',
      changes: [
        '[DEV] Mode "Voir comme utilisateur" pour les admins (bouton flottant)',
        '[DEV] Désactive temporairement tous les privilèges admin sur le site',
      ],
    },
    {
      version: '1.3.4',
      date: '2026-04-06',
      changes: [
        'Bouton admin pour réinitialiser le graphique des revenus (double confirmation)',
        'Correction du graphique : affiche la baisse à 0 quand un personnage est délié',
      ],
    },
    {
      version: '1.3.3',
      date: '2026-04-06',
      changes: [
        'Admins peuvent modifier l\'UUID manuellement via bouton "Saisie manuelle" avec confirmation',
        'Bouton "Lier mon compte" visible pour tous (admins inclus)',
      ],
    },
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
