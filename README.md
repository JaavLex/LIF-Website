# LIF Website

Site web de la communauté **LIF** (Légion Internationale Francophone), une communauté milsim Arma. Construit avec **Next.js 15**, **Payload CMS 3** et **PostgreSQL**.

**Production :** https://lif-arma.com
**Dev :** https://dev.lif-arma.com

## Fonctionnalités

### Site public
- **Page d'accueil** — Présentation, vidéo, serveurs en temps réel, actualités
- **Serveurs live** — Statut, joueurs connectés, barres de remplissage (interrogation A2S)
- **Navigation mobile** — Menu hamburger responsive

### Roleplay (terminal militaire)
- **Base de données de personnages** — Création, modification, consultation de fiches avec photo, grade, unité, faction, spécialisations
- **Synchronisation serveur de jeu** — Liaison BI ID, sync argent et grade depuis le serveur Arma
- **Système de grades** — Détection automatique via rôles Discord, icônes de grade
- **Factions et unités** — Pages dédiées avec insignes, organigrammes
- **Renseignements** — Fiches de renseignement avec galerie média
- **Chronologie** — Historique des événements par personnage
- **Musique d'ambiance** — Lecteur audio intégré avec playlist
- **Tutoriel interactif** — Guide pas-à-pas avec spotlight
- **Écran de chargement** — Animation terminal skippable
- **Authentification Discord** — OAuth2, sessions sécurisées

### Modération
- **Dossiers de modération** — Suivi des cas, sanctions, événements
- **Panneau admin** — Gestion des personnages, grades, unités, factions

### Administration (Payload CMS)
- **Panel admin** à `/admin` — Gestion de tout le contenu
- **Collections** — Users, Characters, Ranks, Units, Factions, Intelligence, Media, Pages, Posts, ModerationCases/Events/Sanctions, CharacterTimeline, BankHistory

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| CMS | Payload CMS 3.x |
| Base de données | PostgreSQL |
| Auth | Discord OAuth2, sessions JWT |
| Langage | TypeScript |
| Éditeur riche | Lexical |
| Polices | Rajdhani (titres), Source Sans 3 (corps) |
| Tests | Vitest (71 tests) |
| Déploiement | Ansible, systemd |
| Serveur | VPS Linux |

## Structure du projet

```
src/
├── app/
│   ├── (frontend)/           # Pages publiques
│   │   ├── page.tsx          # Accueil
│   │   ├── roleplay/         # Terminal roleplay
│   │   │   ├── personnage/   # Fiches personnage (CRUD)
│   │   │   ├── faction/      # Pages faction
│   │   │   ├── unite/        # Pages unité
│   │   │   ├── renseignement/# Fiches intel
│   │   │   └── lore/         # Lore / univers
│   │   ├── moderation/       # Panel modération
│   │   └── posts/            # Articles
│   ├── api/                  # Routes API REST
│   │   ├── auth/             # Discord OAuth, sessions
│   │   ├── roleplay/         # Characters, factions, units, intel, timeline
│   │   ├── servers/          # Statut serveurs de jeu
│   │   ├── moderation/       # Cases, sanctions, events
│   │   └── upload/           # Upload média
│   └── (payload)/            # Admin Payload CMS
├── collections/              # Schémas Payload (14 collections)
├── components/
│   ├── roleplay/             # Composants RP (formulaires, listes, timeline, audio...)
│   ├── moderation/           # Composants modération
│   ├── Navbar.tsx            # Navigation (desktop + mobile)
│   ├── ServerList.tsx        # Cartes serveur live
│   └── VersionInfo.tsx       # Widget version/changelog
├── lib/
│   ├── session.ts            # Auth sessions JWT
│   ├── admin.ts              # Vérification permissions admin
│   ├── api-auth.ts           # Middleware auth API (requireSession, requireAdmin)
│   ├── game-server.ts        # Intégration serveur de jeu (A2S)
│   ├── game-sync-cron.ts     # Cron de synchronisation
│   ├── discord.ts            # OAuth Discord
│   ├── constants.ts          # Utilitaires partagés
│   └── version.ts            # Version et changelog
├── payload.config.ts         # Configuration Payload CMS
ansible/                      # Playbooks de déploiement
tests/                        # Tests Vitest (7 suites, 71 tests)
```

## Déploiement

Le déploiement se fait via **Ansible** (jamais en SSH manuel).

```bash
# Production
cd ansible && ansible-playbook -i inventory.ini deploy.yml --tags website

# Dev
cd ansible && ansible-playbook -i inventory.ini deploy.yml -e env=dev --tags website
```

Chaque déploiement : pull git, install deps, tests, build Next.js, restart systemd, health check.

| Environnement | URL | Branche | Port | Service |
|---|---|---|---|---|
| Production | lif-arma.com | `master` | 3001 | `lif-website` |
| Dev | dev.lif-arma.com | `dev` | 3002 | `lif-website-dev` |

## Tests

```bash
npm test
```

71 tests couvrant : auth sessions, sécurité API, imports, constantes, modération, versioning.

## Prérequis

- Node.js 20+
- PostgreSQL
- Ansible (pour le déploiement)

## Installation locale

```bash
npm install
cp .env.example .env   # Configurer les variables
npm run dev             # http://localhost:3000
```

Premier accès à `/admin` : création du compte admin.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm test` | Lancer les tests |
| `npm run generate:types` | Générer les types TypeScript |
