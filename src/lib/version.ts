// src/lib/version.ts
export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const VERSION_INFO = {
  version: '1.6.24',
  creator: 'JaavLex',
  changelog: [
    {
      version: '1.6.24',
      date: '2026-04-07',
      changes: [
        'FACTION & UNITÉ — Refonte complète des pages dossier (`/roleplay/faction/[slug]` et `/roleplay/unite/[slug]`) en aesthetic « éditorial-brutaliste tactique » : canvas full-black avec grille topographique masquée, vignette colorée par la couleur de la faction/unité, rail vertical rotated en marge.',
        'FACTION & UNITÉ — Hero asymétrique 3 colonnes : stamp glyph géant (F-id, U-id), titre tri-ligne « FACTION/UNITÉ + nom + classification » avec hiérarchie de couleur, bande de stats (unités, effectifs, fer de lance) en monospace, emblème en cadre HUD avec coins.',
        'FACTION — Bloc « FER DE LANCE » mettant en avant les unités principales (isMain) avec watermark, stamp, halo couleur, et liens vers la fiche unité. Bloc séparé pour les unités rattachées.',
        'UNITÉ — Nouveau bloc « PROFIL DOCTRINAL » qui affiche le pitch (italique, border colorée) et les traits (liste monospace) saisis dans Payload, plus un bloc « CHAÎNE DE COMMANDEMENT » en grille de cellules info (faction, commandant, effectifs, statut).',
        'FACTION & UNITÉ — Section effectifs en grille compacte avec avatars carrés, noms en stencil, rangs en monospace, et hover lift discret.',
        'TUTORIEL — Nouvelle étape « COMMS — CANAL TACTIQUE » qui met en avant le bouton COMMS (fonctionnalité essentielle) avec explication des canaux et du badge de mentions @vous.',
        'TUTORIEL — Nouvelle étape « ORGANISATIONS & UNITÉS » qui présente la hiérarchie LIF (faction principale + fer de lance + factions alignées).',
        'TUTORIEL — Étape « CRÉER UN PERSONNAGE » mise à jour pour mentionner le choix d\'unité Cerberus / Spectre désormais obligatoire et définitif.',
        'TUTORIEL — Étape admin « PANNEAU D\'ADMINISTRATION » mise à jour pour expliquer les nouveaux champs « Unité principale » et le sélecteur (tagline / pitch / traits).',
        'TUTORIEL — Bump des clés localStorage `tutorial-seen` → v2 pour que les utilisateurs existants redécouvrent le tutoriel mis à jour (notamment COMMS).',
      ],
    },
    {
      version: '1.6.23',
      date: '2026-04-07',
      changes: [
        'ROLEPLAY — Section « Organisations & Unités » : nouvelle bande « FER DE LANCE » directement sous la faction principale, mettant en avant les unités marquées « Unité principale » dans Payload (par défaut Cerberus & Spectre).',
        'ROLEPLAY — Cartes featured « main unit » avec insigne en cadre HUD, watermark du nom en arrière-plan, numéro stamp #01 / #02, règle colorée qui s\'étire au hover, tagline (depuis le champ Payload `selectorTagline`), CTA pleine largeur qui se remplit de la couleur d\'unité au hover, et coins HUD aux 4 angles.',
        'ROLEPLAY — Les unités featured ne sont plus dupliquées dans la liste groupée par faction parente en dessous (déduplication côté serveur).',
      ],
    },
    {
      version: '1.6.22',
      date: '2026-04-07',
      changes: [
        'PAYLOAD — Nouveau champ « Unité principale » sur les Unités (case à cocher dans la sidebar). Cerberus / Spectre peuvent être marqués comme principaux et apparaissent dans le sélecteur d\'enrôlement.',
        'PAYLOAD — Nouveau panneau collapsible « Sélecteur de création » sur les Unités : Tagline, Pitch (textarea) et liste de Traits. Le texte du sélecteur d\'unité est désormais éditable depuis l\'admin (plus de hardcode).',
        'PAYLOAD — Le sélecteur s\'appuie sur la « Faction principale » (déjà existante) pour filtrer les unités proposées au joueur.',
        'CRÉATION PERSONNAGE — Refonte complète du sélecteur d\'unité (étape 01) en aesthetic « éditorial-brutaliste tactique » : canvas full-black avec grille topographique, numéros stencil géants (11rem), label vertical en marge, titre tri-ligne « CHOISISSEZ / VOTRE / ALLÉGEANCE. » avec hiérarchie de couleur, brief copy en serif body.',
        'CRÉATION PERSONNAGE — Cartes d\'unité « ID-CARD poster » : insigne avec halo lumineux qui pulse au hover, watermark du nom unité en arrière-plan, règle colorée qui s\'étire, traits en monospace avec ▸, et bande CTA pleine largeur qui se remplit de la couleur d\'unité de bas en haut au hover.',
        'CRÉATION PERSONNAGE — Animations échelonnées à l\'apparition (cards stagger 80ms), pulse sur le dot d\'état, rule extension au hover, icône CTA qui décolle.',
        'CRÉATION PERSONNAGE — Refonte complète du formulaire (étape 02) avec la même grammaire visuelle : header asymétrique « 02 / 02 » + titre tri-ligne « RÉDIGEZ / VOTRE / DOSSIER. », inputs minimalistes (bordure 1px, fond translucide, focus vert), labels monospace 0.66rem en uppercase, sections h2 avec barre verte + numéro à droite, bouton submit blanc-sur-noir qui devient vert au hover.',
        'CRÉATION PERSONNAGE — Footer signature « SIGNÉ // COMMANDEMENT [FACTION] // FORMULAIRE F-01 // ENRÔLEMENT // 2026.04 ».',
      ],
    },
    {
      version: '1.6.21',
      date: '2026-04-07',
      changes: [
        'CRÉATION PERSONNAGE — Nouvelle étape 01 obligatoire : choix d\'unité (Cerberus / Spectre) avant la création de la fiche',
        'CRÉATION PERSONNAGE — Hero « Étape 01/02 » avec numéro géant Rajdhani, scanlines, et avertissement « décision définitive »',
        'CRÉATION PERSONNAGE — Cartes de choix d\'unité « cinématiques » : insigne en grand, watermark du nom, coins HUD, lore (tagline + pitch + traits), CTA « S\'ENGAGER » qui s\'illumine au hover',
        'CRÉATION PERSONNAGE — Une fois l\'unité choisie, le formulaire affiche un panneau « AFFECTATION VERROUILLÉE » avec insigne et nom (plus de select)',
        'FICHE PERSONNAGE — L\'unité n\'est plus modifiable par le joueur sur sa propre fiche (verrou UI + verrou serveur sur PATCH /api/roleplay/characters/[id])',
        'ADMIN — Les administrateurs conservent le contrôle total et peuvent réaffecter un personnage à une autre unité',
      ],
    },
    {
      version: '1.6.20',
      date: '2026-04-07',
      changes: [
        'ROLEPLAY — Refonte des fenêtres conteneurs des sections Personnel / Organisations / Renseignements / Trésorerie',
        'ROLEPLAY — Nouveau composant SectionWindow « dossier d\'opérations » : rail supérieur lumineux, bande latérale, scanlines, ligne de scan animée, crochets HUD aux 4 coins, coin inférieur-droit coupé en diagonale avec accent dégradé',
        'ROLEPLAY — Plaque de titre angulaire avec numéro de section géant en Rajdhani, divider lumineux, eyebrow monospace et titre 1.55rem en couleur thématique, ombre noire double',
        'ROLEPLAY — Bande méta latérale (LIF-XXX vXX | classification) avec pastille pulsante en couleur de section',
        'ROLEPLAY — Couleurs thématiques par section : Personnel vert (01), Organisations ambre (02), Intel vert (03), Trésorerie or (04)',
      ],
    },
    {
      version: '1.6.19',
      date: '2026-04-07',
      changes: [
        'PERSONNEL — Refonte complète du panneau de commande : onglets + recherche (icône loupe) + filtres + compteur dans une seule carte org-card avec bande verte à gauche, gradient et coins HUD',
        'PERSONNEL — Nouveau sélecteur « Grouper par » : Statut / Unité / Faction (chips Rajdhani avec icônes Lucide)',
        'PERSONNEL — Groupes pliables : chaque section devient une carte avec en-tête cliquable (icône HUD, logo unité/faction, titre Rajdhani coloré, ligne dégradée, compteur, chevron rotatif), animation de révélation',
        'PERSONNEL — Boutons « Tout déplier / Tout replier » dans le panneau',
        'PERSONNEL — Couleur des groupes dérivée du statut, de la faction (accent) ou de l\'unité (primaire)',
        'TRÉSORERIE — « Fonds de l\'organisation » entièrement refait en hero org-card or : bande dorée 4px, watermark $ géant, gradient + scanlines, montant Rajdhani 3.6rem avec triple text-shadow, tag de variation chip, graphique avec coins HUD dorés, palette d\'or au lieu du vert',
      ],
    },
    {
      version: '1.6.18',
      date: '2026-04-07',
      changes: [
        'FINANCES — Refonte « org-card » du composant finances en jeu : bande or à gauche, gradient, watermark $ géant, coins HUD sur l\'icône',
        'FINANCES — Montant principal en or, agrandi avec text-shadow, lignes en pointillés, boutons d\'action en chips Rajdhani',
        'FINANCES — Barre de progression du countdown avec gradient + glow doré',
        'PERSONNEL — Cartes de la base de données : ajout des logos d\'unité et de faction inline (à côté du nom de chacun)',
        'RENSEIGNEMENTS — Filtres type/statut, compteur et bouton « Nouveau rapport » stylés (bandeau org-card, label Rajdhani, bouton glow)',
        'RENSEIGNEMENTS — Refonte complète de la fiche détail (/roleplay/renseignement/[id]) : hero org-card avec icône HUD, titre Rajdhani géant en couleur de classification, watermark INTEL, méta en grille (date, auteur, coords, cible, faction) avec icônes Lucide, sections séparées avec barre verticale colorée',
      ],
    },
    {
      version: '1.6.17',
      date: '2026-04-07',
      changes: [
        'FICHE PERSONNAGE — Refonte du hero en style « carte d\'identité militaire »',
        'FICHE PERSONNAGE — Portrait encadré (coins HUD, scanlines, glow couleur unité/faction) intégré dans le hero',
        'FICHE PERSONNAGE — Nom complet géant en Rajdhani 2.35rem, couleur de la faction/unité, double text-shadow (glow + ombre portée)',
        'FICHE PERSONNAGE — Suppression des doublons (abréviation de grade retirée, callsign intégré au nom), callsign en watermark géant en arrière-plan',
        'FICHE PERSONNAGE — Grade en chip compact avec icône, ligne meta : PERSONNEL/CIBLE · matricule · classification',
        'FICHE PERSONNAGE — Photo retirée de la sidebar (intégrée au hero), sidebar épurée',
      ],
    },
    {
      version: '1.6.16',
      date: '2026-04-07',
      changes: [
        'PERSONNEL — Refonte des cartes en style « org-card » (mêmes codes visuels que Organisations & Unités)',
        'PERSONNEL — Nom complet affiché en titre principal (callsign déjà intégré, plus de doublon)',
        'PERSONNEL — Bande gauche colorée par statut, méta compacte GRADE · UNITÉ · FACTION, flèche qui glisse au hover',
        'PERSONNEL — Avatar avec coins HUD, étoile dorée pour personnage principal, ruban menace pour cibles',
        'RENSEIGNEMENTS — Refonte complète : cartes « intel-card » expandables avec bande colorée par classification',
        'RENSEIGNEMENTS — Icône de rapport encadrée HUD, titre Rajdhani en couleur, méta date · auteur · coordonnées',
        'RENSEIGNEMENTS — Tags type/statut, chevron rotatif, panneau étendu avec séparateur en pointillés colorés',
      ],
    },
    {
      version: '1.6.15',
      date: '2026-04-07',
      changes: [
        'FACTIONS — Refonte complète de la section Organisations & Unités',
        'FACTIONS — Nouveau champ « Faction principale » (défaut = LIF) avec carte vedette « hero » pleine largeur (coins HUD, badge pulsant, mot-mark LIF en watermark)',
        'FACTIONS — Tri par alignement : ALLIÉES (vert) → NEUTRES (ambre) → HOSTILES (rouge) avec en-têtes distinctifs (marqueur losange, ligne dégradée, compteur)',
        'FACTIONS — Cartes redesignées : logo encadré, nom Rajdhani en couleur de faction, méta courte, flèche qui glisse au hover, bordure gauche épaisse',
        'UNITÉS — Sous-regroupées par faction parente (unités de la faction principale en premier)',
      ],
    },
    {
      version: '1.6.14',
      date: '2026-04-07',
      changes: [
        'PERSONNEL — Refonte des cartes « dossier » : grille plus dense (min 290px), bande de statut colorée à gauche, coins HUD sur l\'avatar, texture de grain subtile',
        'PERSONNEL — Ligne principale = icône de grade + CALLSIGN en Rajdhani, nom complet en sous-ligne monospace, étoile dorée pour personnage principal',
        'PERSONNEL — Chips unité/faction compactes avec insigne/logo, bordure colorée par faction',
        'PERSONNEL — Footer : matricule monospace + pastille de statut + lettre de classification (P/R/C)',
        'PERSONNEL — Ruban « menace » en coin pour les cibles (pulse animé pour CRITIQUE)',
        'PERSONNEL — Barre de filtres compactée avec accent latéral, onglets Rajdhani plus denses, en-têtes de grade avec ligne de gradient',
      ],
    },
    {
      version: '1.6.13',
      date: '2026-04-07',
      changes: [
        'COMMS — Modal « Membres » : en-tête sticky avec bouton « Retour » bien visible (plus de X minuscule), edge-to-edge sur mobile',
        'COMMS — Horodatage des messages épuré : suppression du suffixe « // ENC » redondant',
        'COMMS — Icône de grade dans les messages : plus d\'encadré carré, juste l\'insigne avec un léger glow',
        'ROLEPLAY — Lecteur audio : le bouton onglet (flèche) ne chevauche plus les contrôles quand le lecteur est ouvert (il se décale à gauche du panneau)',
      ],
    },
    {
      version: '1.6.12',
      date: '2026-04-07',
      changes: [
        'COMMS — Refonte « Tactical HUD / Night Vision Glass » : panneaux verre sombre translucides avec backdrop-filter (le fond Matrix MW2 repasse derrière), équilibre entre lisibilité et ambiance',
        'COMMS — Palette vert matrix/ambre HUD/rouille alerte sur fond verre-nuit, glow léger sur les titres et mentions',
        'COMMS — Crochets d\'angle HUD (corner brackets) et scanlines subtiles sur la zone de messages',
        'COMMS — Mobile : bouton « Membres » masqué de l\'en-tête (redondant avec la barre d\'onglets), « Quitter »/« Fermer » et « Sons » en icônes seules',
        'COMMS — Mobile : label « Envoyer anonymement » raccourci en « Anon », modals en bottom-sheet plein écran avec boutons empilés',
        'COMMS — Mobile : cibles tactiles 44px+, safe-area-inset, fallback @supports pour navigateurs sans backdrop-filter',
      ],
    },
    {
      version: '1.6.11',
      date: '2026-04-07',
      changes: [
        'COMMS — Refonte visuelle « Field Operations Console » : palette parchemin/olive/ambre (fini le tout-noir), texture papier, typographie Rajdhani militaire condensée pour les titres',
        'COMMS — Mobile : barre d\'onglets fixe en bas (Canaux / Discussion / Membres) dans la zone du pouce',
        'COMMS — Mobile : cibles tactiles 44px+, composer respecte safe-area-inset iOS, font-size 16px (anti-zoom Safari)',
        'COMMS — Bandes de couleur par type de canal (faction olive, unité ambre, DM encre, groupe rouille)',
        'COMMS — Boutons d\'action toujours visibles sur mobile (pas de hover sur tactile)',
      ],
    },
    {
      version: '1.6.10',
      date: '2026-04-07',
      changes: [
        'CHARACTER — Callsign désormais obligatoire à la création et à la modification (validation côté serveur + champ requis dans le formulaire)',
        'CHARACTER — Backfill automatique des personnages legacy sans callsign (génération style militaire « ECHO-42 », modifiable ensuite)',
        'COMMS — Le nom affiché dans les messages devient « insigne de grade + callsign » (au lieu du nom complet)',
        'COMMS — Filet de sécurité : si un personnage actif n\'a pas de callsign à l\'entrée /comms, un est généré et persisté automatiquement',
      ],
    },
    {
      version: '1.6.9',
      date: '2026-04-07',
      changes: [
        'COMMS — tous les emojis remplacés par des icônes Lucide (Volume2/VolumeX, X, Users, LogOut, MessageSquare, Reply, Info, HelpCircle, Paperclip, Send, ArrowLeft/ArrowRight, etc.)',
        'COMMS — boutons « + DM » et « + GRP » remplacés par des icônes (MessageCirclePlus, UsersRound)',
        'COMMS — bouton 📡 COMMS sur /roleplay → icône Radio',
        'COMMS — pièces jointes (FICHE/RENS) avec icônes FileText/Newspaper',
      ],
    },
    {
      version: '1.6.8',
      date: '2026-04-07',
      changes: [
        'COMMS — son de mention rallongé (statique ~1.1s, deux-tons soutenus) pour un signal radio plus marqué',
      ],
    },
    {
      version: '1.6.7',
      date: '2026-04-07',
      changes: [
        'COMMS — impossible de se mentionner soi-même (filtré du sélecteur @)',
        'COMMS — placeholder du composeur épuré, bouton « ? » qui ouvre une bulle d\'aide formatage',
        'COMMS — sons retravaillés style radio militaire : double bip terminal pour les messages, séquence squelch + statique + chirp deux-tons pour les mentions (plus fort, plus marqué)',
      ],
    },
    {
      version: '1.6.6',
      date: '2026-04-07',
      changes: [
        'COMMS — badge global de mentions sur le bouton 📡 COMMS de /roleplay (somme de tous les canaux)',
        'COMMS — fenêtre de chat ne grandit plus avec les messages : scroll interne (hauteur fixe = viewport)',
      ],
    },
    {
      version: '1.6.5',
      date: '2026-04-07',
      changes: [
        'COMMS — avatar anonyme : deux yeux rouges sous la capuche (au lieu d\'un seul)',
        'COMMS — messages qui vous mentionnent : surlignés (fond ambré + barre dorée à gauche)',
        'COMMS — badge de mentions non lues (@N) sur les canaux non ouverts, disparaît à l\'ouverture',
      ],
    },
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
