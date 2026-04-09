// src/lib/version.ts
export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const VERSION_INFO = {
  version: '1.6.62',
  creator: 'JaavLex',
  changelog: [
    {
      version: '1.6.62',
      date: '2026-04-09',
      changes: [
        'ROLEPLAY — Fix saisie d\'un callsign multi-mots comme « le fourbe ». Bug : le sanitizer appelé dans `CharacterForm.handleChange` était `sanitizeCallsign`, qui fait un `.trim()` final — donc dès que l\'utilisateur tapait l\'espace après « le », le trim l\'effaçait immédiatement et il était impossible d\'arriver à taper le second mot. Fix : nouveau helper `sanitizeCallsignLive` dans `src/lib/character-validation.ts`, utilisé UNIQUEMENT dans le onChange du formulaire. Il strip toujours les guillemets, collapse les runs de whitespace en un seul espace, drop le whitespace en tête (pour que le champ ne commence jamais par un espace) mais PRÉSERVE un éventuel espace en queue — l\'utilisateur peut donc taper « le » puis espace puis continuer « fourbe » sans jamais voir l\'espace disparaître. Le trim final est toujours effectué côté submit via `sanitizeCallsign` et côté serveur dans les routes POST / PATCH, donc la valeur persistée reste propre. Nouveaux tests : suite dédiée `sanitizeCallsignLive` (preserves trailing space, preserves internal spaces, still strips quotes, drops leading whitespace, collapses runs), plus un guard sur `sanitizeCallsign` confirmant que les callsigns multi-mots comme « le fourbe », « Eagle 01 » et « Alpha Bravo Charlie » sont acceptés tels quels.',
      ],
    },
    {
      version: '1.6.61',
      date: '2026-04-09',
      changes: [
        'ROLEPLAY — Fix modale « Demander des améliorations » qui passait derrière le texte et les boutons de la fiche personnage. Cause : la modale était rendue inline à l\'intérieur de `char-dossier-hero-actions`, un conteneur qui participe à un stacking context (transform / filter quelque part dans la chaîne parente), donc le `z-index: 1000` du dialog était piégé dans ce contexte local et ne pouvait pas passer par-dessus les éléments frères rendus plus tard dans la page. Fix : `RequireImprovementsButton` utilise désormais `createPortal` pour rendre la modale directement dans `document.body`, ce qui la fait échapper à tous les stacking contexts parents. Z-index poussé à `2147483000` (top of the integer range) en ceinture-et-bretelles. Bonus UX : lock du scroll de `body` pendant que la modale est ouverte, `backdrop-filter: blur(4px)` sur l\'overlay, fermeture au clavier via `Escape` (désactivée pendant la soumission). Guard SSR via `useState(mounted)` pour ne toucher `document` qu\'après le mount client.',
      ],
    },
    {
      version: '1.6.60',
      date: '2026-04-09',
      changes: [
        'ROLEPLAY — Le compteur de caractères sous les textareas Parcours civil / militaire est désormais TOUJOURS affiché pour les fiches de joueurs (non-PNJ), y compris quand l\'utilisateur est admin. Les admins voient le compteur au format `X / 500 caractères — les admins peuvent contourner cette exigence` en gris, non-bloquant, pour garder la référence visuelle de la règle tout en indiquant clairement qu\'elle ne s\'applique pas à eux. Les joueurs non-admin continuent de voir le compteur passer au rouge avec le nombre de caractères manquants quand ils sont en dessous du minimum.',
      ],
    },
    {
      version: '1.6.59',
      date: '2026-04-09',
      changes: [
        'ROLEPLAY — Les admins peuvent désormais bypasser le minimum de 500 caractères sur les parcours civil et militaire. Règle : le plancher de longueur n\'est enforcée QUE pour les joueurs non-admin. (1) Route POST `/api/roleplay/characters` : appels à `validateBackground` déplacés dans une branche `!isNpcCreation && !isAdmin`. Les admins qui créent leur propre personnage ou un PNJ ne sont plus bloqués. La photo de profil reste obligatoire pour toute fiche player-character (la règle admin-bypass ne s\'applique qu\'à la longueur, pas à l\'avatar). (2) Route PATCH `/api/roleplay/characters/[id]` : validation des backgrounds gatée sur `!isAdmin && body.X !== undefined` — un admin qui modifie son propre dossier ou celui d\'un joueur peut laisser les champs courts. (3) Auto-réhabilitation des fiches flaguées `requiresImprovements` : le gate de longueur est bypassé pour les admins éditant leur propre fiche flaguée ; la photo de profil reste exigée. (4) `CharacterForm.tsx` : la pré-validation client-side du submit est gatée sur `!isAdmin`, et le compteur live + le marqueur `*` obligatoire sous chaque textarea ne s\'affichent plus quand l\'utilisateur est admin (la règle ne s\'applique pas à eux, autant ne pas polluer l\'UI avec un compteur inutile). 2 nouveaux tests source-level vérifiant le câblage de l\'exemption admin dans les deux routes. 207 tests au total.',
      ],
    },
    {
      version: '1.6.58',
      date: '2026-04-09',
      changes: [
        'ROLEPLAY — Validation durcie des fiches personnages. (1) Callsign : les guillemets (« », "", \'\', curly quotes, backticks, accents graves) sont maintenant strippés à la saisie ET côté serveur via le nouveau helper `sanitizeCallsign` dans `src/lib/character-validation.ts` — un callsign comme « le fourbe » est accepté mais stocké comme `le fourbe`. Sanitizer appelé onChange dans `CharacterForm.tsx` et dans les routes POST / PATCH `/api/roleplay/characters`. (2) Parcours civil et militaire : minimum 500 caractères chacun (constante `BACKGROUND_MIN_LENGTH`), validé client-side (compteur live sous chaque textarea, passage au rouge en dessous) et server-side via `validateBackground` qui accepte une string ou un payload Lexical. Appliqué en CREATE (tous les champs) et en PATCH (uniquement sur les champs présents dans la requête, pour ne pas casser les éditions partielles). PNJ exemptés. (3) Photo de profil obligatoire : le serveur refuse toute création player-character sans `avatar`, et refuse tout PATCH qui laisserait la fiche sans avatar (legacy ou effacement explicite). PNJ exemptés. (4) Nouveau bouton admin « Demander des améliorations » sur la fiche personnage (`RequireImprovementsButton`, visible pour admins quand la fiche a un Discord lié) qui ouvre une modale de raison et POST vers `/api/roleplay/characters/[id]/require-improvements`. Le backend force le statut à `dishonourable-discharge`, set le nouveau flag `requiresImprovements` avec `improvementReason` / `improvementRequestedAt` / `improvementRequestedBy`, et DM le propriétaire Discord via `sendDiscordDM` avec la raison + le lien vers la fiche. (5) Bypass critique dans la route PATCH : quand une fiche passe de `in-service` à un autre statut, la logique d\'auto-clear qui vide `biId` / `isMainCharacter` / `savedMoney` est DÉSACTIVÉE si `requiresImprovements` est déjà à true — c\'est la seule exception, demandée explicitement pour que le joueur puisse retravailler sa fiche en place sans perdre sa liaison game-server. (6) Auto-réhabilitation : quand le propriétaire édite sa fiche et que l\'état final satisfait avatar + parcours civil ≥500 + parcours militaire ≥500, le flag `requiresImprovements` est automatiquement effacé, `improvementReason` mis à null, et le statut repasse à `in-service`. (7) Toggle admin `isMainCharacter` exposé dans la section Administration de `CharacterForm` (uniquement en édition) pour que les admins puissent retirer le flag « personnage principal ». La route PATCH strip désormais `isMainCharacter` du body pour les non-admins. (8) Bannière orange « Améliorations requises » affichée sur la fiche quand le flag est actif (visible par owner + admin) avec la raison et le nom de l\'admin qui a demandé. Nouvelle migration `20260409_200000_add_require_improvements` ajoute 4 colonnes idempotemment. 30 nouveaux tests dans `tests/character-validation.test.ts` couvrant le sanitizer, le compteur Lexical-aware, la validation de longueur et le câblage source-level des routes et du formulaire. 205 tests au total.',
      ],
    },
    {
      version: '1.6.57',
      date: '2026-04-09',
      changes: [
        'MODÉRATION — Nouveau 5ᵉ onglet "Journal admin" réservé aux administrateurs complets. Capture automatiquement TOUTES les actions admin (création/modification/suppression de personnages, événements timeline, factions, unités, renseignements, dossiers de modération, sanctions, canaux et messages comms, reset trésorerie) avec snapshot `{before, after}` JSON complet. Journalise aussi les événements non-mutation : `gm.enter`/`gm.exit` via nouveau endpoint `POST /api/comms/gm/toggle` appelé fire-and-forget depuis `useGmMode.setEnabled`, `gm.impersonate` quand un admin poste en tant que PNJ/cible, et `character.link.admin_override` quand un admin force le `biId` d\'un personnage. UI : liste reverse-chrono avec filtres (acteur, action, type d\'entité, dates), recherche debouncée sur résumé + nom d\'entité, pagination cursor `(createdAt, id)` base64url, lignes expansibles avec diff tabulaire champ-par-champ. Endpoints : `GET /api/moderation/admin-logs` (full-admin-only) + `GET /api/moderation/admin-logs/facets` (cache 60s). Rétention 180 jours via nouveau cron `admin-log-retention-cron` démarré depuis `instrumentation.ts` aux côtés de `game-sync-cron` (démarrage retardé 60s, idempotent contre HMR). Collection Payload `admin-logs` cachée de l\'admin UI, accès DB gated sur `isFullAdmin`. Garde de complétude source-level dans `tests/admin-log.test.ts` qui walke `src/app/api/**` et échoue CI si une route `requireFullAdmin`/`requireGmAdmin` avec mutation Payload n\'importe pas `@/lib/admin-log`. Helper `logAdminAction` fire-and-forget : ne jette JAMAIS, swallow errors via console.error — une écriture d\'audit ratée ne doit jamais casser l\'action qu\'elle enregistre. 175 tests.',
      ],
    },
    {
      version: '1.6.56',
      date: '2026-04-09',
      changes: [
        'ROLEPLAY — Fix pastille de mentions sur le bouton COMMS qui disparaissait ~12s après l\'arrivée d\'un message, même sans que l\'utilisateur ait lu le canal. Cause : dans `CommsNavButton.tsx`, la boucle de poll avançait inconditionnellement `seen[ch] = ch.lastMessageAt` après avoir incrémenté le compteur, puis l\'étape de réconciliation comparait `seenBefore[key] >= ch.lastMessageAt` — mais au poll suivant, `seenBefore` (un snapshot de `seen` AVANT avance) contenait déjà la valeur avancée par le poll précédent, donc la condition était toujours vraie et le compteur était supprimé. Fix : retirer la réconciliation basée sur `seen`. Le nettoyage du compteur "user a lu" repose désormais exclusivement sur les événements `storage` / `comms-mention-counts-change` déjà dispatchés par `CommsLayout` (à l\'ouverture de /comms et à l\'ouverture d\'un canal), ce qui est le chemin autorisé et ne souffre pas du problème de l\'auto-avance.',
        'BOT — Durcissement de la résolution de `PUBLIC_BASE_URL` contre les valeurs de loopback. Next.js inline `process.env.NEXT_PUBLIC_*` au MOMENT DU BUILD ; si le `.env` de prod contenait `NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3001` (drift probable par copier-coller depuis la ligne `SITE_URL=http://127.0.0.1:3001` voisine dans `.env.example`), la littérale était gravée dans le bundle serveur et toutes les notifications Discord (`[Voir le dossier]`, etc.) pointaient vers localhost — aucun changement d\'env au runtime ne pouvait défaire cela avant un rebuild. Fix : nouveau helper `isLoopbackBaseUrl` qui rejette `localhost`, `127.0.0.1`, `0.0.0.0` et `[::1]` (case-insensitive) ; la résolution traverse les candidats et retombe sur le fallback codé en dur `https://lif-arma.com` si tous sont loopback. Regression guard dans `tests/constants.test.ts`.',
      ],
    },
    {
      version: '1.6.55',
      date: '2026-04-09',
      changes: [
        'COMMS — Fix bouton TRANSMETTRE qui sortait encore de l\'écran en mobile, en particulier quand la puce GM (mode admin) était présente sur la rangée. Renforcement des règles de wrapping : `.comms-composer-row` a désormais `width: 100%`, `min-width: 0`, `flex-wrap: wrap` et `max-width: 100%` explicitement, la puce GM (wrappée inline avec `position: relative`) reçoit `min-width: 0` et `flex-shrink: 1`, et le bouton d\'envoi passe en `order: 99` / `flex: 1 1 100%` pour garantir qu\'il wrappe TOUJOURS sous la rangée des autres contrôles quel que soit leur nombre.',
        'ROLEPLAY — Refonte visuelle de la pastille de mentions sur le bouton COMMS. L\'ancienne était coincée sur l\'icône radio et clippée par `overflow: hidden` du bouton, ce qui coupait l\'anneau de pulse et donnait un rendu confus. Nouveau design : pastille flottante style notification classique, ancrée au coin supérieur droit du bouton lui-même (`top: -9px; right: -9px`), gradient rouge trois stops (`#ff5c5c → #e01818 → #a30d0d`), bordure noire 2px, glow rouge externe, text-shadow sur le chiffre, et `overflow: visible` sur `.rp-nav-btn` pour laisser la pastille et son anneau de pulse déborder. Re-ancrage mobile identique (`top: -8px; right: -8px`).',
        'ROLEPLAY — Fix pastille qui persistait même après avoir lu les messages dans /comms. Le poller `CommsNavButton` compte les mentions non-lues via localStorage et se rafraîchit lors d\'un `storage` event — mais /comms et /roleplay sont deux routes distinctes, et le flux user "j\'ouvre /comms = j\'ai lu" n\'était pas modélisé : tant que l\'utilisateur ne cliquait pas explicitement le canal concerné, la pastille persistait. Nouveau comportement : à l\'ouverture de /comms, `CommsLayoutInner` efface `comms.mentionCounts.v1` exactement une fois (guard via `useRef`), dispatche l\'événement custom `comms-mention-counts-change`, et les badges par canal se reconstruisent depuis les polls suivants.',
      ],
    },
    {
      version: '1.6.54',
      date: '2026-04-09',
      changes: [
        'BOT — Fix définitif des liens `127.0.0.1:3001` dans les notifications Discord (nouveau dossier, changement de statut, nouvel événement timeline). Le hotfix 1.6.41 n\'avait corrigé QUE `src/bot/index.ts` ; `src/lib/discord-notify.ts` (qui envoie les notifications via l\'API REST Discord depuis les routes Next) utilisait toujours la vieille chaîne de fallback vers la variable serveur interne, et comme celle-ci vaut `http://127.0.0.1:3001` en production (pour les fetchs internes), tous les boutons `[Voir le dossier]` pointaient vers localhost. Refactor : nouvel export partagé `PUBLIC_BASE_URL` dans `src/lib/constants.ts` qui résout UNIQUEMENT via `NEXT_PUBLIC_BASE_URL` → `NEXT_PUBLIC_SITE_URL` → fallback codé en dur `https://lif-arma.com`. Migration de `discord-notify.ts`, `bot/index.ts` et `api/roleplay/notifications/pending` vers cette constante unique. Regression guard ajoutée dans `tests/constants.test.ts` qui échoue si un fichier source lit la variable serveur interne hors commentaires.',
      ],
    },
    {
      version: '1.6.53',
      date: '2026-04-09',
      changes: [
        'COMMS — Hotfix : le sélecteur GM chargeait indéfiniment et n\'affichait jamais les PNJ / cibles. Race de cycle de vie dans `useGmMode` : l\'effet de fetch listait `state.npcListLoading` dans ses dépendances ; quand il passait `npcListLoading` à `true`, React re-rendait, l\'effet re-roulait, sa cleanup flippait `cancelled = true` sur le fetch de la run précédente, et le `.then` sortait tôt sans jamais écrire `npcList` ni remettre `npcListLoading` à `false`. Fix : retirer `state.npcListLoading` des dépendances et garder uniquement `state.enabled` et `state.npcList` — de cette façon le setState de `npcListLoading` ne re-trigger plus l\'effet, le fetch survit jusqu\'à sa résolution, et la liste s\'affiche.',
      ],
    },
    {
      version: '1.6.52',
      date: '2026-04-09',
      changes: [
        'COMMS — Fix messages du canal précédent qui restaient affichés lors d\'un changement de canal vers un canal vide. Deux causes : (1) `loadMessages` retournait silencieusement sur `!res.ok` sans vider `messages`, donc un 403 sur canal ghost (admin sans `?gm=1`) ou une erreur réseau laissait la conversation précédente à l\'écran ; (2) l\'effet d\'ouverture de canal ne remettait pas `messages` à `[]` avant le fetch, ce qui laissait une brève fenêtre où le nouveau canal affichait l\'ancienne conversation. Fix : `setMessages([])` proactif en tête d\'effet + nettoyage sur erreur.',
        'COMMS — Mode GM : `loadMessages` propage désormais `?gm=1` quand le mode GM est actif, permettant aux admins de lire les messages des canaux ghost sans se heurter au rejet 403 côté serveur. Le changement de canal vers un canal dont l\'admin n\'est pas membre affiche donc bien son contenu au lieu de garder la conversation précédente à l\'écran.',
        'COMMS — Relabel français du mode MJ vers GM (GameMaster) sur tous les éléments visibles : bouton `MJ` → `Activer GM`, label `MODE MJ` → `MODE GM`, bouton `Quitter MJ` → `Quitter GM`, puce composer `MJ ·` → `GM ·`, tag message `[MJ]` → `[GM]`, titres d\'aide correspondants. Les classes CSS (`comms-message-mj-tag`, etc.) restent inchangées pour éviter un refactor inutile.',
        'COMMS — Puce GM du composer : le dropdown ouvrait un menu vide si la liste des PNJ n\'était pas encore chargée ou vide, donnant l\'impression que "GM · sélectionner…" ne faisait rien. Ajout d\'états visibles `Chargement…`, `Aucun PNJ disponible`, et affichage de l\'erreur serveur le cas échéant. Le dropdown s\'affiche désormais immédiatement au clic, indépendamment de l\'état de chargement.',
      ],
    },
    {
      version: '1.6.51',
      date: '2026-04-09',
      changes: [
        'ROLEPLAY — Nouvel onglet `PNJ` dans la liste du personnel, permettant aux admins de filtrer les personnages marqués `isNpc` / `isTarget` et de créer rapidement PNJ ou cibles via les boutons existants du panneau admin.',
        'COMMS — Mode MJ (GameMaster) pour les admins : nouveau bandeau ambre en haut du layout `/comms` avec bascule `MJ`, sélecteur d\'incarnation (PNJ / cible), et puce discrète dans le composer permettant un override per-message. Quand le mode est actif, les admins voient tous les canaux non-DM du serveur (y compris ceux où ils ne sont pas membres — "ghost view" signalée par une pastille ambre dans la liste de canaux), peuvent poster dans ces canaux sans être ajoutés à la liste des membres, et les messages émis en mode MJ portent un tag `[MJ]` visible uniquement des autres admins. Sécurité : ré-validation serveur systématique (`requireGmAdmin`), rejet des personnages liés à un joueur Discord, rejet des canaux archivés, et strip du flag `postedAsGm` dans les réponses API pour les viewers non-admin.',
        'API — Nouveau endpoint `GET /api/roleplay/characters/npcs` (admin-only) renvoyant la liste des personnages PNJ/cibles incarnables, utilisé par le contexte client `useGmMode` pour peupler le sélecteur. Nouveau helper `listChannelsForGmAdmin` retournant les canaux avec un flag `viewerIsGhost` quand l\'admin n\'en est pas membre. POST `/api/comms/channels/:id/messages` accepte désormais `{ gmMode, impersonateCharacterId }` avec validation complète côté serveur.',
        'DB — Ajout de la colonne `posted_as_gm BOOLEAN DEFAULT FALSE` sur `comms_messages`, appliquée idempotemment sur le VPS dev via migration Payload manuelle.',
      ],
    },
    {
      version: '1.6.50',
      date: '2026-04-09',
      changes: [
        'ROLEPLAY — Hotfix badge de mention qui ne s\'affichait plus du tout sur le bouton COMMS de `/roleplay`. Le correctif 1.6.49 comparait `seen[key] >= lastMessageAt` dans la boucle de reconciliation, mais la boucle d\'incrémentation située juste au-dessus avançait systématiquement `seen[id] = lastMessageAt` pour chaque canal. Résultat : la reconciliation voyait toujours `seen === lastMessageAt` et supprimait le compteur immédiatement après l\'avoir incrémenté, sur le même poll. Fix : snapshot de `seen` pris AVANT la boucle d\'incrémentation (`seenBefore`), et la reconciliation compare désormais contre cette photo pré-poll. Le compteur n\'est donc nettoyé que si le baseline était DÉJÀ à jour avant ce poll — ce qui n\'arrive que quand `/comms` a écrit seenLastAt sur ouverture de canal.',
      ],
    },
    {
      version: '1.6.49',
      date: '2026-04-08',
      changes: [
        'COMMS — Fix bouton `TRANSMETTRE` sorti de l\'écran sur mobile : le composer et sa rangée de boutons manquaient de `min-width: 0` et `box-sizing: border-box`, ce qui laissait le contenu intrinsèque du bouton débordait hors du viewport dans certains cas (marge auto héritée du desktop, wrap partiel). Ajout de `min-width: 0`, `box-sizing: border-box` et `max-width: 100%` sur `.comms-composer`, `.comms-composer-row` et `.comms-send-btn` en mode mobile, plus override explicite de `margin-left: 0` pour neutraliser la règle desktop qui poussait le bouton à droite.',
        'ROLEPLAY — Refonte visuelle du badge de mention sur le bouton COMMS de `/roleplay`. L\'ancien badge flottait près de la flèche droite (`right: 2.35rem`) et était souvent masqué par l\'animation de hover. Nouveau badge : pastille rouge gradient vertical (top-to-bottom), ancrée au coin supérieur droit de l\'icône radio pour un look notification classique, avec bordure noire 2px pour un contraste fort sur le fond du bouton, anneau de pulse lent non-intrusif, et animation pop à l\'apparition. Position recalée aussi en responsive (≤ 768px) pour suivre l\'icône mobile plus petite.',
        'ROLEPLAY — Fix badge qui persistait même après lecture des mentions sur `/comms`. La réconciliation du poller `CommsNavButton` comparait uniquement le flag serveur `lastMessageMentionsViewer` — mais ce flag reste `true` tant que le dernier message du canal est une mention, même après que l\'utilisateur l\'a lue. Ajout d\'une condition supplémentaire : si le baseline `comms.seenLastAt.v1` pour ce canal a rattrapé `lastMessageAt`, le compteur est supprimé même si le flag serveur est toujours vrai. Le badge s\'efface donc dès l\'ouverture du canal dans `/comms`, sans attendre qu\'un message non-mention arrive.',
      ],
    },
    {
      version: '1.6.48',
      date: '2026-04-08',
      changes: [
        'COMMS — Fix badge de mention stale sur le bouton COMMS de `/roleplay` et sur l\'onglet mobile `Canaux`. Le flag serveur `lastMessageMentionsViewer` reflète UNIQUEMENT si le dernier message courant du canal mentionne le viewer : si un message non-mention suit une mention, le flag repasse à `false` mais le compteur persistant dans `comms.mentionCounts.v1` (localStorage) n\'était jamais nettoyé — il restait bloqué jusqu\'à ce que l\'utilisateur ouvre ce canal spécifique sur `/comms`. Les deux pollers (`CommsNavButton` toutes les 12s et `CommsLayout.loadChannels` toutes les 3s) réconcilient désormais leurs compteurs contre l\'état serveur à chaque poll : les entrées pour des canaux absents de la liste OU dont le dernier message n\'est plus une mention sont supprimées. Le badge disparaît donc dès que la condition serveur n\'est plus vraie, sans attendre une interaction utilisateur.',
      ],
    },
    {
      version: '1.6.47',
      date: '2026-04-08',
      changes: [
        'GAME SYNC — Fix nom synchronisé vers le serveur de jeu : le nom envoyé incluait `fullName` (qui contient le callsign entre guillemets, ex : `John "Ghost" Doe`), ce qui entraînait un échappement JSON des guillemets en `\\"` dans le fichier `customNames.json` du serveur, visible en jeu comme des backslashes devant les guillemets. Désormais on n\'envoie plus que `firstName lastName` (sans le callsign), avec le préfixe de grade inchangé (ex : `(CPL) John Doe`). Correctif appliqué au cron de sync auto (`game-sync-cron.ts`) ET à l\'endpoint manuel `POST /api/roleplay/characters/[id]/game-sync` action `sync-name`.',
      ],
    },
    {
      version: '1.6.46',
      date: '2026-04-08',
      changes: [
        'COMMS — Fix bouton `TRANSMETTRE` hors écran sur mobile : sur les viewports ≤ 768px, le bouton d\'envoi prend désormais toute la largeur sur sa propre ligne en dessous des contrôles `Pièce jointe` et `Anon`, garantissant qu\'il reste toujours atteignable même avec le clavier virtuel ouvert ou avec des libellés qui wrappent. Le label « Pièce jointe » est également masqué dès 768px (au lieu de 380px seulement) pour éviter l\'encombrement.',
        'ROLEPLAY — Refonte du badge de mention sur le bouton COMMS de `/roleplay`. L\'ancien badge était positionné à `top:-8px / right:-8px`, hors des limites du bouton — or `.rp-nav-btn` a `overflow: hidden` (pour le halo de survol), ce qui le coupait et le rendait quasi invisible. Nouveau badge : cercle rouge radial dégradé posé à l\'intérieur du bouton, ancré au milieu verticalement près de la flèche, avec double halo pulsant (pulse du glow + anneau d\'onde qui se propage), chiffre brut sans le préfixe `@`, taille adaptative (1 chiffre / 2 chiffres / 99+), et respect de `prefers-reduced-motion`.',
        'COMMS — Fix badge de mention qui persistait après lecture : la useEffect d\'ouverture de canal dans `CommsLayout` effaçait bien le compteur côté `/comms` mais n\'avançait pas le baseline partagé `comms.seenLastAt.v1` utilisé par `CommsNavButton`. Résultat : en revenant sur `/roleplay`, le poll suivant de `CommsNavButton` comparait le `lastMessageAt` actuel à un baseline stale et pouvait ré-incrémenter. La useEffect écrit maintenant explicitement le `lastMessageAt` courant du canal ouvert dans `comms.seenLastAt.v1` ET dans la ref en mémoire, ceinture+bretelles en plus du mirror existant dans `loadChannels`.',
      ],
    },
    {
      version: '1.6.45',
      date: '2026-04-08',
      changes: [
        'COMMS — Hotfix son de notification rejoué en quittant `/comms` : `GlobalCommsNotifier` conservait ses refs `seen` et `initializedRef` pendant le séjour sur `/comms` (où le composant est suspendu et `CommsLayout` prend le relais). Au retour sur une autre page du site, le premier poll comparait les `lastMessageAt` courants à la baseline stale et rejouait `playRadioPing` / `playNotification` pour tous les messages vus entre-temps sur `/comms`. Fix : on réinitialise `seenRef` et `initializedRef` à l\'entrée de `/comms`, de sorte que le prochain poll hors `/comms` réamorce silencieusement.',
      ],
    },
    {
      version: '1.6.44',
      date: '2026-04-08',
      changes: [
        'COMMS — Nouveau `@everyone` dans les canaux de groupe / unité / faction. Taper `@everyone` dans le compositeur mentionne tous les membres du canal (sauf l\'expéditeur) : ping radio bruyant en direct, notification mod en jeu, MAIS pas de fanout DM Discord (pour éviter de spammer 20+ personnes en DM à chaque callout tactique). `@everyone` est silencieusement ignoré en DM. L\'autocomplete du compositeur ajoute une entrée « 👥 @everyone » en tête de liste pour les canaux non-DM.',
        'COMMS / MOD — Fix notifications dupliquées côté mod `AR-DiscordLink` : la requête `/api/roleplay/notifications/pending` est désormais clampée à `createdAt <= now` (en plus de `> effectiveSince`), ce qui empêche la livraison multiple de messages insérés entre la capture de `Date.now()` et l\'exécution de la requête. Chaque notification expose aussi un `id` stable (l\'ID du document `comms-messages`) pour que le mod puisse déduper via un `HashSet` LRU côté jeu — robuste contre les requêtes concurrentes, les redémarrages et le clock skew.',
        'COMMS — Fix son de notification dupliqué dans le navigateur : `CommsLayout.loadChannels` mettait à jour son `seen` map APRÈS avoir joué le son, donc deux appels concurrents (polling 3s + refresh post-envoi de `handleSend`) observaient tous deux la même baseline stale et jouaient le son deux fois pour le même message. La baseline est maintenant avancée AVANT l\'appel à `playRadioPing` / `playNotification`. Même fix appliqué par défense-en-profondeur dans `GlobalCommsNotifier` pour les pages hors /comms.',
      ],
    },
    {
      version: '1.6.43',
      date: '2026-04-08',
      changes: [
        'COMMS / MOD — `POST /api/roleplay/notifications/pending` renvoie maintenant un champ `callSign` par notification (callsign roleplay de l\'expéditeur, vide pour les messages anonymes). Le mod `AR-DiscordLink` l\'utilise pour titrer les notifications DM avec le callsign au lieu du nom du canal ; si le champ est vide, fallback silencieux sur le nom du canal. Rien ne casse côté mod si l\'ancienne réponse est servie — c\'est additif.',
      ],
    },
    {
      version: '1.6.42',
      date: '2026-04-08',
      changes: [
        'COMMS / MOD — Nouveau endpoint `POST /api/roleplay/notifications/pending` consommé par le mod `AR-DiscordLink` pour récupérer les notifications comms en attente d\'un joueur lié. Le mod envoie son BI ID, la clé API (`GAME_MOD_API_KEY`) et un watermark `sinceMs` ; le serveur résout le personnage, liste les canaux dont il est membre, et renvoie jusqu\'à 20 messages récents non envoyés par lui-même, non supprimés, avec nom d\'expéditeur (anonymisé si le message l\'est), nom de canal, flag `isMention` si le joueur est mentionné, et corps tronqué à 180 caractères. Le watermark est clampé à 5 minutes max pour éviter le spam historique au premier poll ; première requête = 30 dernières secondes. Permet au mod d\'afficher une notification in-game quand un joueur reçoit un message sur un canal auquel il appartient.',
      ],
    },
    {
      version: '1.6.41',
      date: '2026-04-08',
      changes: [
        'BOT DISCORD — Hotfix des liens dans les embeds : le bot utilisait la variable d\'env `SITE_URL` qui, en production, vaut `http://127.0.0.1:3001` (URL interne utilisée par les fetchs server-side Next.js). Résultat : tous les liens « Ouvrir le dossier » / « Ouvrir le rapport » dans les embeds Discord pointaient vers `127.0.0.1:3001`, inutilisables pour les joueurs. Fix : le bot privilégie maintenant `NEXT_PUBLIC_BASE_URL` (la vraie URL publique — `https://lif-arma.com` ou `https://dev.lif-arma.com`), avec un fallback sur `NEXT_PUBLIC_SITE_URL` puis `https://lif-arma.com`. `SITE_URL` n\'est plus lu par le bot.',
        'BOT DISCORD — `/ouvrirrenseignements` accepte maintenant un troisième critère de recherche : `matricule` (ex : `DA-2042-001`). En plus des options existantes `utilisateur` (Discord) et `charid` (ID interne), on peut désormais récupérer les renseignements d\'un personnage directement par son matricule militaire — bien plus ergonomique en jeu ou en briefing. Le bot résout le matricule via le champ unique `militaryId` de la collection `characters`, retourne une erreur « Matricule introuvable » si aucun personnage ne correspond, sinon affiche les 10 derniers rapports de renseignement postés par ce personnage avec le nom complet du personnage dans le titre de l\'embed.',
      ],
    },
    {
      version: '1.6.40',
      date: '2026-04-08',
      changes: [
        'ROLEPLAY — Nouveau bouton « + Nouveau PNJ / Cible » dans le panneau Administration sur `/roleplay`, à côté de « + Nouvelle Unité » et « + Nouvelle Faction ». Permet aux admins de créer des personnages non-joueurs (PNJ ou Cibles ennemies) directement depuis le front, sans passer par Payload. Formulaire avec prénom/nom/callsign obligatoires, unité et grade optionnels (sélecteurs depuis les collections existantes), texte libre pour la faction, toggle « Cible / Ennemi » qui révèle les champs faction cible et niveau de menace, et sélecteurs de statut/classification. Après création, redirection automatique vers la fiche du PNJ pour compléter background, photo, devise, etc.',
        'API — `POST /api/roleplay/characters` respecte maintenant le flag `isNpc` plus rigoureusement : (1) `isMainCharacter` n\'est plus forcé à `true` pour les PNJ (par défaut `false`, l\'admin peut le flipper plus tard), (2) la notification Discord « nouveau personnel » n\'est plus envoyée pour les PNJ, qui ne sont pas de vrais enrôlements et spammeraient le canal pour rien.',
      ],
    },
    {
      version: '1.6.39',
      date: '2026-04-08',
      changes: [
        'PAYLOAD — Création de PNJ / Cibles depuis le panneau admin (`/admin → Roleplay → Characters`) : la limite « un personnage actif par compte Discord » de la page « nouveau personnage » côté front bloquait désormais aussi les admins qui voulaient créer des PNJ. Le panneau admin Payload contournait déjà cette limite mais avait deux frictions : (1) `discordId` et `discordUsername` étaient `readOnly`, donc impossible à renseigner si on voulait plus tard rattacher le PNJ à un joueur, (2) aucun hook ne convertissait les chaînes vides en `null` sur les colonnes `UNIQUE` (`biId`, `discordId`, `discordUsername`), donc créer deux PNJ sans BI ID crashait sur la contrainte d\'unicité postgres (postgres autorise plusieurs NULL mais pas plusieurs chaînes vides). Fix : nouveau hook `beforeChange` `normalizeUniqueEmptyStrings` qui force `\'\'` → `null` sur ces trois champs, `discordId` / `discordUsername` ne sont plus en lecture seule, et la collection a maintenant une `admin.description` qui explique exactement comment créer un PNJ ou une Cible (laisser les champs Discord vides, cocher `isTarget` si ennemi, choisir une faction cible). Test de régression ajouté dans `tests/security.test.ts`.',
      ],
    },
    {
      version: '1.6.38',
      date: '2026-04-08',
      changes: [
        'UI — Le splash screen « terminal sécurisé » (séquence de boot en ASCII vert) ne s\'affiche plus que sur les sections in-universe `/roleplay` et `/comms`. Les pages marketing/publiques (accueil, factions, etc.) redeviennent silencieuses au premier chargement. Le flag `sessionStorage` n\'est posé que quand le splash est réellement affiché, pour qu\'une première visite sur une page publique ne supprime pas le splash lors du premier passage ensuite sur /roleplay ou /comms.',
      ],
    },
    {
      version: '1.6.37',
      date: '2026-04-08',
      changes: [
        'ROLEPLAY — La détection automatique du grade sur la fiche personnage (édition et création) affichait un grade périmé car les rôles Discord étaient figés dans le cookie de session (JWT signé) au moment de la connexion, avec un TTL de 7 jours, sans jamais être rafraîchis. Quand un joueur changeait de rang côté Discord, le site continuait à afficher l\'ancien grade jusqu\'à une déconnexion/reconnexion. Fix : `/api/auth/me` accepte maintenant `?refresh=1`, qui re-fetch le guild member via le bot Discord, met à jour `user.discordRoles` côté Payload, re-signe le cookie de session avec les rôles frais et les renvoie au client. `CharacterForm` appelle cette URL au montage, donc toute ouverture de la fiche (création ou édition) force un rafraîchissement. Les endpoints de sauvegarde lisent ensuite les rôles frais depuis le cookie, garantissant que le grade détecté stocké correspond bien au rang Discord courant.',
      ],
    },
    {
      version: '1.6.36',
      date: '2026-04-08',
      changes: [
        'ROLEPLAY — Vraie cause du coin bas-droit cassé sur les fenêtres 1 et 2 (Personnel et Organisations) enfin trouvée : effondrement de marges. Le tampon en diagonale était positionné en `position: absolute` relativement à `.section-window-body` avec `bottom: -2.6rem`. Quand le dernier enfant du body avait un `margin-bottom` (ce qui est le cas pour `PersonnelFilters` et `factions-panel` mais PAS pour `IntelligenceList` ni `OrgBankStats`), cette marge s\'effondrait hors de la boîte du body, remontant son edge bottom de la valeur de la marge. Le tampon se retrouvait alors flottant À L\'INTÉRIEUR de la section au lieu de se loger dans la coupe diagonale du coin. Fix : `display: flow-root` sur `.section-window-body` pour établir un nouveau contexte de formatage de bloc, ce qui empêche les marges des enfants de s\'évader. Reproduit puis vérifié visuellement avant déploiement.',
      ],
    },
    {
      version: '1.6.35',
      date: '2026-04-08',
      changes: [
        'PAYLOAD — Les champs `selectorTagline`, `selectorPitch` et `selectorTraits` (texte par unité affiché sur la carte du sélecteur de création de personnage) étaient cachés dans un collapsible peu visible et restaient vides pour Cerberus / Specter, ce qui forçait le fallback « Affectation au sein de la Légion… Service actif ». Les trois champs sont maintenant remontés au niveau racine de la collection Units, préfixés « 🟢 SÉLECTEUR — » dans leur label, avec une description claire qui explique exactement où le texte apparaît. Plus de collapsible.',
        'INFRA — Hotfix DB dev : les migrations 150000/160000/170000/180000 n\'avaient jamais été enregistrées dans `payload_migrations`, donc la 180000 n\'avait pas tourné lors du déploiement v1.6.34. Les 15 colonnes du global `roleplay` ont été appliquées directement via psql et les 4 migrations marquées comme exécutées. Aucune autre régression.',
      ],
    },
    {
      version: '1.6.34',
      date: '2026-04-07',
      changes: [
        'PAYLOAD — Nouvel onglet « Sélecteur d\'unité & Hero » dans le global Roleplay : tout le texte de la page de choix d\'unité (création de personnage étape 01) est désormais éditable via le panneau Payload — eyebrow, 3 lignes de titre, brief, warning, footer, label rail vertical. Le mot « Légion » dans le brief est automatiquement remplacé par le nom de la faction principale.',
        'PAYLOAD — Idem pour le hero « Faction principale » sur /roleplay : badge, sous-titre par type (alliée / hostile / neutre), texte du CTA. Et pour la bande « Fer de lance » des unités principales : label de la bande et eyebrow des cartes d\'unité.',
        'PAYLOAD — Migration `20260407_180000_add_unit_selector_globals` : 15 nouvelles colonnes varchar sur la table `roleplay` avec les valeurs par défaut françaises actuelles, garantissant zéro régression visuelle pour les installations existantes.',
        'RAPPEL — Les traits, tagline et pitch de chaque unité dans le sélecteur étaient déjà configurables par unité (collection Units : `selectorTagline`, `selectorPitch`, `selectorTraits`).',
      ],
    },
    {
      version: '1.6.33',
      date: '2026-04-07',
      changes: [
        'SPLASH — Suppression du DEUXIÈME splash qui se déclenchait en parallèle : `TerminalLoading` (composant utilisé par `RoleplayShell` pour le sous-domaine roleplay, avec ses lignes `Chargement de la base de données…`, `Authentification Discord…`, `Vérification des habilitations…`, etc) est complètement retiré. Fichier `TerminalLoading.tsx` supprimé, props `loadingEnabled`/`loadingMessages` retirées de `RoleplayShell` et de `roleplay/layout.tsx`. Plus qu\'un seul splash sur tout le site : le `<SplashScreen />` racine.',
      ],
    },
    {
      version: '1.6.32',
      date: '2026-04-07',
      changes: [
        'SPLASH — Fix : la page de fond apparaissait brièvement avant le splash, donnant l\'impression que « les deux existaient en même temps ». Cause : le composant utilisait `visible: false` + `useEffect` pour décider de monter, donc la page paintait d\'abord puis le splash popait par-dessus à l\'hydratation. Maintenant `visible: true` par défaut → SSR rend déjà le splash plein écran avant tout, et `useEffect` le dismiss instantanément si déjà vu cette session.',
      ],
    },
    {
      version: '1.6.31',
      date: '2026-04-07',
      changes: [
        'SPLASH — Refonte complète : la grosse fenêtre frame qui apparaissait pendant la navigation entre pages (Suspense fallback de `loading.tsx`) est SUPPRIMÉE — `loading.tsx` retourne maintenant `null` pour ne plus jamais flasher entre les routes.',
        'SPLASH — Nouveau composant `<SplashScreen />` monté au root layout : intro terminal CRT pure phosphor verte, line-by-line typed reveal style teletype, scanlines horizontales, flicker subtil, vignette radiale et glow texte. 14 lignes de boot avec tags `[BOOT]` ambré, `[ OK ]` vert vif, `[WARN]` clignotant ambré (`handshake.tls`, `auth.session`, `tls.certificate`, `roster.sync 247 dossiers`, `comms.relay armed`, etc).',
        'SPLASH — Topbar fake-tty avec 3 dots colorés (rouge/ambre/vert) et titre `/dev/tty01 — l.i.f secure shell`, footer signature `L.I.F · LÉGION INTERNATIONALE FRANCOPHONE` + numéro de version. Ligne finale avec curseur block clignotant `▮` et invite `appuyez sur une touche pour continuer`.',
        'SPLASH — Skippable : un clic n\'importe où OU une touche du clavier dismisse instantanément avec une animation flash-out (brightness 2.4 puis fade & scale 1.04). Auto-dismiss après 3.4s. Stocké en `sessionStorage` (`lif-splash-seen.v1`) → s\'affiche une seule fois par session, plus jamais sur les navigations internes.',
        'SPLASH — Respect `prefers-reduced-motion` : désactive flicker, blink, type-in et scale-out pour les utilisateurs sensibles aux animations.',
      ],
    },
    {
      version: '1.6.30',
      date: '2026-04-07',
      changes: [
        'ROLEPLAY — Sections 1 & 2 (Personnel, Organisations) avaient le coin bas-droit visuellement « tronqué » par le clip-path diagonal car leurs grilles de cartes (PersonnelFilters, FactionGroups) poussaient le contenu jusque dans la zone de coupe. Augmentation du `padding-right` (1.6 → 2.4rem) et `padding-bottom` (1.85 → 2.6rem) du `.section-window` pour que toutes les sections respirent identiquement comme 3 & 4 (Intelligence, Treasury). Stamp et padding mobile ajustés en proportion.',
        'MODÉRATION — Dans l\'onglet Comms, les pièces jointes des messages affichaient seulement le nom du fichier (ex: `media: image.png`) au lieu de l\'image elle-même. Ajout de vraies vignettes 140×105px cliquables pour les attachments `kind: media` avec mimeType image — les autres types restent affichés comme tags monospace cliquables.',
      ],
    },
    {
      version: '1.6.29',
      date: '2026-04-07',
      changes: [
        'COMMS — La popover d\'aide raccourcis & markdown ouverte depuis le bouton `?` du composer s\'ouvrait vers le bas et débordait hors écran avec son contenu sur une seule ligne en wrap chaotique. Repositionnée au-dessus du textarea (`bottom: calc(100% + 8px)` au lieu de `top: 42px`), largeur clampée `min(280px, 100vw - 1.5rem)`, scroll vertical avec `max-height: min(60vh, 360px)`, petit triangle pointant vers le bouton.',
        'COMMS — Refonte du contenu : header avec titre `Raccourcis` + bouton fermeture, deux listes `<dl>` séparées (raccourcis clavier puis markdown), chaque ligne en grid 2 colonnes (`dt`/`dd`) qui ne wrap plus jamais. Animation slide-in 4px depuis le bas.',
        'LORE — Refonte complète de `/roleplay/lore` avec une nouvelle « fenêtre archive » dédiée (`.lore-window`) — palette ambre #c9a040 (cohérente avec le bouton LORE), fond #08070a, grille subtile, vignette radiale ambrée, barre verticale tournée et bandeau supérieur avec onglet `AR-001 // ARCHIVES`.',
        'LORE — Nouveau masthead éditorial : eyebrow `Dossier d\'archives — Volume I`, titre tri-ligne géant en stencil Rajdhani avec esperluette `&` italique ambrée et meta `X sections // Y entrées chronologiques`.',
        'LORE — Sections converties en grid 2 colonnes : marqueur de chapitre sticky à gauche (cadre bordé avec glyphe `§` italique géant + numéro `01`/`02`/etc en monospace) et corps à droite avec titre stencil sous-ligné par une barre lumineuse 64px.',
        'LORE — Texte enrichi : `lore-text` en Source Sans 3 1rem ligne 1.8 avec drop-cap italique ambré 3.6rem sur le premier paragraphe, blockquote barré ambre, liens soulignés ambre, listes à marqueurs colorés.',
        'LORE — Bannière redessinée en figure encadrée avec corner brackets aux 4 coins, gradient overlay bas, scale 1.02 au hover et caption courier-monospace sous-titrée par une barre 18px.',
        'LORE — Galerie en grid auto-fill 220px : chaque image dans un cadre `aspect-ratio: 4/3` avec corner brackets TL/BR, scale 1.05 + translateY -2px + halo ambré au hover, caption courier en dessous.',
        'LORE — Nouvelle `lore-timeline` (chronologie) en 3 colonnes : timbre date avec bandeau supérieur ambre + année + jour géant + mois, rail vertical avec nœud losange (rotate 45°), carte avec barre gauche ambre + scanlines + index `№ 001`.',
        'LORE — État vide redesigné : grand glyphe `§` italique ambré + titre stencil `PAGES BLANCHES` / `ARCHIVES VERROUILLÉES`. Animation cascade : window fade 0.6s puis masthead slide 0.7s puis sections individuelles.',
        'LORE — Suppression des références à l\'ancienne classe `.timeline` (cassée depuis v1.6.28 quand elle a été remplacée par `.char-timeline` côté personnage).',
      ],
    },
    {
      version: '1.6.28',
      date: '2026-04-07',
      changes: [
        'MODÉRATION — La page COMMS de modération devient un onglet `Comms` à part entière dans `/moderation` (au même niveau que Utilisateurs / Dossiers / Transcripts) au lieu d\'être une page séparée. La route `/moderation/comms` est désormais une simple redirection vers `/moderation`.',
        'MODÉRATION — Nouveau composant `CommsTab` extrait du fichier monolithique inline-style : sidebar canaux à gauche, zone messages à droite, modal pièces jointes & liens, le tout stylisé via classes CSS propres `.mod-comms-*` (sidebar avec barre verte gauche, channels en cartes, messages avec bordure gauche couleur, état supprimé barré rouge).',
        'PERSONNAGE — Nouvelle « fenêtre dossier » sur la page personnage : remplacement du wrapper générique `terminal-container` par `.char-window` dédié — fond #060706 plein écran, grille 56px, vignette radiale colorée par faction, barre verticale tournée à -90° avec libellé `DOSSIER PERSONNEL // [matricule]`, et nouveau bandeau supérieur avec onglet de fichier en clip-path triangulaire (numéro `DP-####` ou `FT-####` en stencil Rajdhani + label monospace).',
        'PERSONNAGE — Ancien indicateur Mode Admin déplacé dans le bandeau supérieur sous forme de pill `ADMIN` ambré pulsant ; classification badge intégré à droite ; bouton retour redessiné en style courier monospace avec slide-left au hover.',
        'TIMELINE — Refonte complète de `CharacterTimeline` : grid 3 colonnes (timbre date / rail vertical avec nœud / carte). Le timbre est une carte « punched-card » avec jour géant en stencil + mois 3-lettres + année et bandes pointillées top/bottom. Le rail a une ligne dégradée verticale et un nœud carré 26px avec glyph spécifique au type (↑ promotion, ✚ blessure, ★ médaille, ◆ mission, ! disciplinaire, ⇄ mutation, ◎ formation, · autre).',
        'TIMELINE — Couleurs tonales par type : `tone-accent` ambre pour promotion, `tone-danger` rouge pour blessure/disciplinaire, `tone-gold` or pour médaille, `tone-primary` vert pour le reste. Cartes avec barre gauche colorée, scanlines verticales, badge de type stencil, numéro `№ 001` à droite et bouton suppression admin discret.',
      ],
    },
    {
      version: '1.6.27',
      date: '2026-04-07',
      changes: [
        'NAV — Refonte des boutons LORE / COMMS / MODÉRATION en cluster « tactical command-deck » : chaque carte a sa couleur signature (LORE ambre #c9a040, COMMS vert primaire, MODÉRATION rouge danger), une barre verticale lumineuse à gauche qui s\'élargit au hover, des crochets HUD aux coins, un glyph d\'icône Lucide en cellule contour, un code monospace `CMD-XX // [SECTION]` au-dessus du label en stencil Rajdhani, et une flèche `→` qui glisse au hover.',
        'NAV — Effet d\'élévation au hover (translateY -2px + box-shadow coloré + radial wash interne) et badge `@N` rouge pulsant repositionné en coin pour COMMS.',
        'NAV — Layout responsive : en mobile, les cartes s\'étendent en pleine largeur et empilent verticalement avec icônes et labels réduits.',
        'COMMS TUTORIAL — Nouveau briefing interactif dédié à `/roleplay/comms` (11 étapes) qui présente : votre opérateur actif, la liste des canaux, les boutons Nouveau DM / Nouveau groupe, le fil de messages, le composer avec mentions @, le panneau des membres, le mute audio et la nav mobile.',
        'COMMS TUTORIAL — Auto-déclenché à la première visite (clé `lif-comms-tutorial-seen.v1`) et relançable via le nouveau bouton « Aide » (icône HelpCircle) ajouté dans la profile bar.',
        'TUTORIAL ARCHITECTURE — Extraction du logique de positionnement dans un hook partagé `useTutorialPositioning` réutilisé par RoleplayTutorial et CommsTutorial. Extraction des styles tutorial dans un fichier CSS partagé `tutorial-overlay.css` importé par les deux composants — élimine ~720 lignes de duplication.',
      ],
    },
    {
      version: '1.6.26',
      date: '2026-04-07',
      changes: [
        'TUTORIEL — Réécriture complète de l\'algorithme de positionnement de la carte : mesure réelle de la taille rendue via ref + `useLayoutEffect` au lieu de constantes hardcodées (380px), élimination du `setTimeout(400)` qui provoquait du flicker.',
        'TUTORIEL — Carte transformée en flex column avec un conteneur `.tutorial-tooltip-body` interne qui scroll : header, actions et barre de progression restent toujours visibles même sur les étapes avec dummy form (correction step 7 « Créer un personnage » qui sortait de l\'écran).',
        'TUTORIEL — Hard-clamp final du `top`/`left` pour garantir que la carte entière reste dans le viewport sur tous les côtés (top, bottom, left, right) et toutes les tailles d\'écran.',
        'TUTORIEL — Sélection automatique du meilleur côté : si le côté demandé ne peut pas accueillir la carte, on choisit celui qui a le plus d\'espace ; si rien ne fit, on centre la carte sur le viewport.',
        'TUTORIEL — `scrollIntoView` passé en `behavior: \'auto\'` (instantané) pour éviter les mesures stales pendant l\'animation de scroll.',
        'TUTORIEL — Mobile : suppression de la largeur CSS hardcodée, la largeur est désormais calculée dynamiquement (`vw - padding`) pour s\'adapter à toutes les tailles d\'écran.',
      ],
    },
    {
      version: '1.6.25',
      date: '2026-04-07',
      changes: [
        'TUTORIEL — Refonte visuelle complète de la carte de briefing : layout asymétrique avec numéro d\'étape géant en stencil Rajdhani (X/Y), titre tri-ligne avec barre verte lumineuse, eyebrow «BRIEFING // OPÉRATEUR» et bordure gauche 4px verte tactique.',
        'TUTORIEL — Background card en gradient noir layered, scanline animée qui balaye le haut, grain subtil, bordure top 2px verte + glow box-shadow, animation d\'entrée slide+scale (cubic-bezier).',
        'TUTORIEL — Crochets HUD sur les coins du header (bracket markers verts).',
        'TUTORIEL — Spotlight redessinné : 8 segments bracket aux 4 coins de la cible (28px chacun) avec drop-shadow vert et pulse animé, contour interne dashed, transition cubic-bezier sur déplacement de step à step.',
        'TUTORIEL — Backdrop avec scanlines + crochets crosshair aux 4 coins du viewport pour ambiance opérationnelle.',
        'TUTORIEL — Progression remplacée : barre segmentée pleine largeur (segments fins horizontaux qui s\'allument verts au passage) au lieu des dots ronds.',
        'TUTORIEL — Boutons redessinnés : SKIP en texte underline minimal, PRÉCÉDENT en ghost border, SUIVANT en plein vert avec flèche → qui glisse au hover.',
        'TUTORIEL — Stamp «// CLASSIFIED // EYES ONLY» en monospace dans le coin inférieur droit de la carte.',
        'TUTORIEL — First-letter du body en stencil vert pour rappeler l\'aesthetic editorial.',
      ],
    },
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
