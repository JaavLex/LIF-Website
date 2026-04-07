# Frontend Design Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the homepage and shared styles to match the military aesthetic of the roleplay section — custom fonts, entrance animations, mobile nav, better typography scale, gold accent usage, server card hierarchy, CTA redesign, focus states, and minimum font sizes in roleplay.

**Architecture:** All changes are CSS and component-level. Fonts loaded via `next/font/google` in `layout.tsx`. A new `ScrollReveal` client component handles intersection-based entrance animations. Navbar gains a hamburger toggle for mobile. No new pages, no API changes.

**Tech Stack:** Next.js 15 (App Router), React 19, CSS custom properties, `next/font/google`, Lucide React icons.

**Constraints:**
- All UI text in French
- Dark military theme must be preserved
- Local build is broken — only build/test on VPS via Ansible
- Fish shell locally (no bash heredocs)
- No test files to write (CSS/visual changes only, no logic)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/(frontend)/layout.tsx` | Modify | Add font imports, apply font CSS variables to `<body>` |
| `src/app/(frontend)/globals.css` | Modify | Type scale variables, font families, card restyling, animations, focus states, CTA redesign, gold accents, server card hierarchy |
| `src/components/Navbar.tsx` | Modify | Add hamburger menu toggle for mobile |
| `src/components/ScrollReveal.tsx` | Create | IntersectionObserver wrapper for scroll-triggered animations |
| `src/components/FeaturesSection.tsx` | Modify | Wrap section in ScrollReveal |
| `src/components/NewsSection.tsx` | Modify | Wrap section in ScrollReveal |
| `src/components/ServerList.tsx` | Modify | Add online/offline top-border class, player count bar |
| `src/app/(frontend)/page.tsx` | Modify | Add hero animation classes, wrap CTA/Video in ScrollReveal |
| `src/app/(frontend)/roleplay/roleplay.css` | Modify | Bump all font-size below 0.688rem to 0.688rem (11px) |

---

### Task 1: Font System & Type Scale

**Files:**
- Modify: `src/app/(frontend)/layout.tsx`
- Modify: `src/app/(frontend)/globals.css:1-35`

- [ ] **Step 1: Add Google Font imports to layout.tsx**

Replace the full content of `src/app/(frontend)/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { Rajdhani, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { DevBanner } from '@/components/DevBanner';
import { VersionInfo } from '@/components/VersionInfo';

const heading = Rajdhani({
	subsets: ['latin'],
	weight: ['500', '600', '700'],
	variable: '--font-heading',
	display: 'swap',
});

const body = Source_Sans_3({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
	variable: '--font-body',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'LIF - Légion Internationale Francophone | Arma Reforger',
	description:
		'Communauté francophone sur Arma Reforger. Rejoignez nos deux serveurs dédiés pour des opérations militaires tactiques et immersives.',
	keywords: [
		'Arma Reforger',
		'communauté francophone',
		'milsim',
		'serveur français',
		'jeu militaire',
	],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="fr">
			<body className={`${heading.variable} ${body.variable}`}>
				<DevBanner />
				<VersionInfo />
				{children}
			</body>
		</html>
	);
}
```

- [ ] **Step 2: Add type scale CSS variables and update font-family**

In `src/app/(frontend)/globals.css`, replace lines 1-35 (the `:root` block through the `body` rules) with:

```css
:root {
  --foreground: #e8e6e3;
  --background: #0c0f0a;
  --background-secondary: #1a1f16;
  --primary: #4a7c23;
  --primary-hover: #5d9a2d;
  --accent: #c9a227;
  --accent-hover: #dbb42f;
  --muted: #8b9a7d;
  --border: #2d3425;
  --danger: #8b2635;
  --success: #4a7c23;
  --card-bg: rgba(26, 31, 22, 0.8);
  --gradient-start: #0c0f0a;
  --gradient-end: #1a1f16;

  /* Type scale (1.25 ratio) */
  --text-xs: 0.694rem;    /* ~11px min */
  --text-sm: 0.833rem;    /* ~13px */
  --text-base: 1rem;      /* 16px */
  --text-md: 1.25rem;     /* 20px */
  --text-lg: 1.563rem;    /* 25px */
  --text-xl: 1.953rem;    /* 31px */
  --text-2xl: 2.441rem;   /* 39px */
  --text-3xl: 3.052rem;   /* 49px */

  /* Font families */
  --font-heading: 'Rajdhani', sans-serif;
  --font-body: 'Source Sans 3', sans-serif;
  --font-mono: 'Courier New', 'Lucida Console', Monaco, monospace;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: var(--font-body);
  line-height: 1.6;
}
```

- [ ] **Step 3: Commit**

```
git add src/app/(frontend)/layout.tsx src/app/(frontend)/globals.css
git commit -m "feat: add Rajdhani + Source Sans 3 fonts and type scale variables"
```

---

### Task 2: Global Focus States & Base Refinements

**Files:**
- Modify: `src/app/(frontend)/globals.css`

- [ ] **Step 1: Add global focus-visible and heading font rules**

Append after the `a:hover` block (after line 45 in the original, which is now further down due to Task 1 additions) — insert right after the `a:hover { color: var(--primary-hover); }` rule:

```css
/* Global focus states */
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Heading font */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  text-transform: uppercase;
  letter-spacing: 1px;
}
```

- [ ] **Step 2: Commit**

```
git add src/app/(frontend)/globals.css
git commit -m "feat: add global focus-visible states and heading font rules"
```

---

### Task 3: Homepage Card & Section Restyling

**Files:**
- Modify: `src/app/(frontend)/globals.css`

This task replaces soft rounded cards with angular military-style cards, adds accent borders, noise texture backgrounds, and a faint scanline overlay on the hero.

- [ ] **Step 1: Update hero styles to add scanline overlay**

Find the `.hero::before` rule (the overlay with `rgba(12, 15, 10, 0.5)`) and replace it with:

```css
.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.03) 2px,
      rgba(0, 0, 0, 0.03) 4px
    ),
    rgba(12, 15, 10, 0.5);
  pointer-events: none;
}
```

- [ ] **Step 2: Update hero title to use type scale and heading font**

Replace the `.hero-title` rule:

```css
.hero-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.1;
  text-shadow: 0 4px 20px rgba(0,0,0,0.5);
  letter-spacing: 3px;
}
```

Replace the `.hero-subtitle` rule:

```css
.hero-subtitle {
  font-size: var(--text-md);
  color: var(--primary);
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 4px;
}
```

Replace the `.hero-description` rule:

```css
.hero-description {
  font-size: var(--text-md);
  color: var(--muted);
  max-width: 600px;
  margin: 0 auto 2.5rem;
  line-height: 1.7;
  font-family: var(--font-body);
  text-transform: none;
  letter-spacing: 0;
}
```

- [ ] **Step 3: Sharpen all card corners and add left accent border**

Replace the `.server-card` rule:

```css
.server-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-left: 3px solid var(--primary);
  border-radius: 4px;
  padding: 2rem;
  position: relative;
  transition: all 0.3s ease;
}
```

Replace the `.feature-card` rule:

```css
.feature-card {
  text-align: center;
  padding: 2.5rem 2rem;
  border-radius: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  transition: all 0.3s ease;
}
```

Replace the `.feature-card:hover` rule:

```css
.feature-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent);
}
```

Replace the `.news-card` rule:

```css
.news-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-left: 3px solid var(--primary);
  border-radius: 4px;
  padding: 2rem;
  transition: all 0.3s ease;
}
```

- [ ] **Step 4: Add noise texture to alternating sections**

Replace the `.servers-section` rule:

```css
.servers-section {
  background:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
    var(--background-secondary);
}
```

Replace the `.features-section` rule:

```css
.features-section {
  background:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
    var(--background-secondary);
}
```

- [ ] **Step 5: Update section title with type scale**

Replace the `.section-title` rule:

```css
.section-title {
  font-size: var(--text-2xl);
  text-align: center;
  margin-bottom: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  letter-spacing: 3px;
}
```

- [ ] **Step 6: Add gold section divider**

Add after the `.title-icon` rule:

```css
.section-title::after {
  content: '';
  display: none;
}

.section-container > .section-title {
  position: relative;
  padding-bottom: 1rem;
}

.section-container > .section-title::after {
  content: '';
  display: block;
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 2px;
  background: var(--accent);
}
```

- [ ] **Step 7: Commit**

```
git add src/app/(frontend)/globals.css
git commit -m "feat: sharpen cards, add scanline hero overlay, noise textures, gold dividers"
```

---

### Task 4: Homepage Entrance Animations

**Files:**
- Modify: `src/app/(frontend)/globals.css`
- Create: `src/components/ScrollReveal.tsx`
- Modify: `src/app/(frontend)/page.tsx`
- Modify: `src/components/FeaturesSection.tsx`
- Modify: `src/components/NewsSection.tsx`

- [ ] **Step 1: Add animation keyframes to globals.css**

Add at the end of the hero section styles (after `.hero-buttons`), before the `/* Buttons */` comment:

```css
/* Hero entrance animations */
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-content .hero-logo {
  animation: fadeSlideUp 0.8s ease both;
}

.hero-content .hero-title {
  animation: fadeSlideUp 0.8s ease both;
  animation-delay: 0.15s;
}

.hero-content .hero-subtitle {
  animation: fadeSlideUp 0.8s ease both;
  animation-delay: 0.3s;
}

.hero-content .hero-description {
  animation: fadeSlideUp 0.8s ease both;
  animation-delay: 0.45s;
}

.hero-content .hero-buttons {
  animation: fadeSlideUp 0.8s ease both;
  animation-delay: 0.6s;
}

/* Scroll reveal */
.scroll-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}

.scroll-reveal.revealed {
  opacity: 1;
  transform: translateY(0);
}
```

- [ ] **Step 2: Create ScrollReveal component**

Create `src/components/ScrollReveal.tsx`:

```tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
	children: ReactNode;
	className?: string;
}

export function ScrollReveal({ children, className = '' }: ScrollRevealProps) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					el.classList.add('revealed');
					observer.unobserve(el);
				}
			},
			{ threshold: 0.15 },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={ref} className={`scroll-reveal ${className}`}>
			{children}
		</div>
	);
}
```

- [ ] **Step 3: Wrap homepage sections in ScrollReveal**

In `src/app/(frontend)/page.tsx`, add the import at the top (after existing imports):

```tsx
import { ScrollReveal } from '@/components/ScrollReveal';
```

Then wrap each conditional section. Replace the ServerList block (lines 220-225):

```tsx
			{/* Servers Section - Uses client component for live A2S data */}
			<ScrollReveal>
				<ServerList
					title={content.serversTitle || defaults.serversTitle}
					titleIcon={content.serversIcon || defaults.serversIcon}
					fallbackServers={servers}
				/>
			</ScrollReveal>
```

Replace the PresentationVideo block (lines 227-237):

```tsx
			{/* Presentation Video Section */}
			{content.isPresentationVisible && (
				<ScrollReveal>
					<PresentationVideo
						title={content.presentationTitle || defaults.presentationTitle}
						titleIcon={content.presentationIcon || defaults.presentationIcon}
						videoTitle={
							content.presentationVideoTitle || defaults.presentationVideoTitle
						}
						link={content.presentationVideoLink || defaults.presentationVideoLink}
					/>
				</ScrollReveal>
			)}
```

Replace the FeaturesSection block (lines 239-246):

```tsx
			{/* Features Section */}
			{content.isFeaturesVisible && (
				<ScrollReveal>
					<FeaturesSection
						title={content.featuresTitle || defaults.featuresTitle}
						titleIcon={content.featuresIcon || defaults.featuresIcon}
						features={features}
					/>
				</ScrollReveal>
			)}
```

Replace the NewsSection block (lines 248-255):

```tsx
			{/* News Section */}
			{content.isNewsVisible && (
				<ScrollReveal>
					<NewsSection
						title={content.newsTitle || defaults.newsTitle}
						titleIcon={content.newsIcon || defaults.newsIcon}
						posts={formattedPosts}
					/>
				</ScrollReveal>
			)}
```

Replace the CTA section block (lines 257-273):

```tsx
			{/* CTA Section */}
			{content.isCtaVisible && (
				<ScrollReveal>
					<section className="cta-section">
						<div className="section-container">
							<h2>{content.ctaTitle || defaults.ctaTitle}</h2>
							<p>{content.ctaDescription || defaults.ctaDescription}</p>
							<a
								href={content.ctaButtonUrl || defaults.ctaButtonUrl}
								className="btn btn-primary btn-large"
								target="_blank"
								rel="noopener noreferrer"
							>
								{content.ctaButtonText || defaults.ctaButtonText}
							</a>
						</div>
					</section>
				</ScrollReveal>
			)}
```

- [ ] **Step 4: Commit**

```
git add src/components/ScrollReveal.tsx src/app/(frontend)/page.tsx src/app/(frontend)/globals.css
git commit -m "feat: add hero entrance animations and scroll-reveal on sections"
```

---

### Task 5: Mobile Navigation (Hamburger Menu)

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `src/app/(frontend)/globals.css`

- [ ] **Step 1: Add hamburger toggle to Navbar component**

Replace the full content of `src/components/Navbar.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

interface NavLink {
	id?: string | null;
	label: string;
	type: 'internal' | 'external' | 'anchor';
	page?: { slug: string } | string | number | null;
	url?: string | null;
	openInNewTab?: boolean | null;
	isHighlighted?: boolean | null;
}

interface NavbarProps {
	logoUrl?: string;
	links?: NavLink[] | null;
	discordUrl?: string | null;
}

export function Navbar({ logoUrl, links, discordUrl }: NavbarProps) {
	const [mobileOpen, setMobileOpen] = useState(false);

	const getHref = (link: NavLink): string => {
		if (link.type === 'internal' && link.page) {
			if (typeof link.page === 'object') return `/${link.page.slug}`;
			if (typeof link.page === 'string') return `/${link.page}`;
		}
		return link.url || '#';
	};

	const defaultLinks: NavLink[] = [
		{ label: 'Accueil', type: 'internal', page: { slug: '' } },
		{ label: 'Serveurs', type: 'anchor', url: '/#serveurs' },
		{ label: 'Roleplay', type: 'internal', page: { slug: 'roleplay' } },
		{ label: 'Règlement', type: 'internal', page: { slug: 'reglement' } },
		{ label: 'Actualités', type: 'internal', page: { slug: 'posts' } },
	];

	const navLinks = links && links.length > 0 ? links : defaultLinks;

	const renderLink = (link: NavLink, index: number) => {
		const href = getHref(link);
		const isExternal = link.type === 'external';
		const close = () => setMobileOpen(false);

		if (link.isHighlighted) {
			return (
				<a
					key={link.id || index}
					href={href}
					target={link.openInNewTab ? '_blank' : undefined}
					rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
					className="discord-btn"
					onClick={close}
				>
					{link.label}
				</a>
			);
		}

		if (isExternal || link.type === 'anchor') {
			return (
				<a
					key={link.id || index}
					href={href}
					target={link.openInNewTab ? '_blank' : undefined}
					rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
					onClick={close}
				>
					{link.label}
				</a>
			);
		}

		return (
			<Link key={link.id || index} href={href} onClick={close}>
				{link.label}
			</Link>
		);
	};

	return (
		<nav className="navbar">
			<div className="nav-container">
				<Link href="/" className="nav-logo">
					{logoUrl && (
						<Image
							src={logoUrl}
							alt="LIF Logo"
							width={48}
							height={48}
							className="nav-logo-image"
						/>
					)}
					<div className="nav-logo-text">
						<span className="logo-text">LIF</span>
						<span className="logo-subtitle">Légion Internationale Francophone</span>
					</div>
				</Link>

				{/* Desktop nav */}
				<div className="nav-links nav-links-desktop">
					{navLinks.map(renderLink)}
					{discordUrl && (
						<a
							href={discordUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="discord-btn"
						>
							Discord
						</a>
					)}
				</div>

				{/* Mobile hamburger */}
				<button
					className="nav-hamburger"
					onClick={() => setMobileOpen(!mobileOpen)}
					aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
				>
					{mobileOpen ? <X size={24} /> : <Menu size={24} />}
				</button>
			</div>

			{/* Mobile dropdown */}
			{mobileOpen && (
				<div className="nav-mobile">
					{navLinks.map(renderLink)}
					{discordUrl && (
						<a
							href={discordUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="discord-btn"
							onClick={() => setMobileOpen(false)}
						>
							Discord
						</a>
					)}
				</div>
			)}
		</nav>
	);
}
```

- [ ] **Step 2: Add mobile nav CSS**

In `src/app/(frontend)/globals.css`, find the existing mobile media query `@media (max-width: 768px)` and replace the `.nav-links { display: none; }` rule. Replace the entire `@media (max-width: 768px)` block:

```css
/* Hamburger button — hidden on desktop */
.nav-hamburger {
  display: none;
  background: none;
  border: 1px solid var(--border);
  color: var(--foreground);
  padding: 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.nav-hamburger:hover {
  border-color: var(--accent);
}

/* Mobile dropdown */
.nav-mobile {
  display: none;
}

@media (max-width: 768px) {
  .nav-links-desktop {
    display: none;
  }

  .nav-hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-mobile {
    display: flex;
    flex-direction: column;
    padding: 1rem 2rem 1.5rem;
    border-top: 1px solid var(--border);
    background: rgba(12, 15, 10, 0.98);
    gap: 0.25rem;
  }

  .nav-mobile a {
    color: var(--foreground);
    padding: 0.75rem 0;
    font-weight: 500;
    font-size: var(--text-base);
    border-bottom: 1px solid var(--border);
  }

  .nav-mobile a:last-child {
    border-bottom: none;
  }

  .nav-mobile .discord-btn {
    margin-top: 0.75rem;
    text-align: center;
  }

  .hero-title {
    font-size: var(--text-2xl);
  }

  .hero-subtitle {
    font-size: var(--text-base);
  }

  .section-title {
    font-size: var(--text-xl);
  }

  .footer-container {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .footer-admin {
    justify-content: center;
  }
}
```

- [ ] **Step 3: Commit**

```
git add src/components/Navbar.tsx src/app/(frontend)/globals.css
git commit -m "feat: add mobile hamburger navigation menu"
```

---

### Task 6: Server Card Visual Hierarchy

**Files:**
- Modify: `src/app/(frontend)/globals.css`
- Modify: `src/components/ServerList.tsx`

- [ ] **Step 1: Add online/offline border classes and player bar to CSS**

Replace the `.server-card:hover` rule:

```css
.server-card:hover {
  border-color: var(--primary);
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
}

.server-card.server-online {
  border-top: 3px solid var(--success);
  box-shadow: 0 -2px 12px rgba(74, 124, 35, 0.08);
}

.server-card.server-offline {
  border-top: 3px solid var(--danger);
  opacity: 0.7;
}

.player-bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin-top: 0.75rem;
  overflow: hidden;
}

.player-bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.player-bar-fill.high {
  background: var(--accent);
}
```

- [ ] **Step 2: Add classes and player bar to ServerList component**

In `src/components/ServerList.tsx`, replace the server card rendering (the `servers.map` block, from the `<div key={index} className="server-card">` line):

```tsx
							servers.map((server, index) => (
								<div
									key={index}
									className={`server-card ${server.isOnline ? 'server-online' : 'server-offline'}`}
								>
									<div
										className={`server-status ${server.isOnline ? 'online' : 'offline'}`}
									></div>
									<h3>{server.serverName || server.name}</h3>
									<p className="server-mode">{server.mode}</p>
									{server.description && (
										<p className="server-description">{server.description}</p>
									)}
									<div className="server-info">
										<span className="server-players">
											<span className={server.players > 0 ? 'players-active' : ''}>
												{server.players}
											</span>
											/{server.maxPlayers} joueurs
										</span>
										<span className="server-map">{server.map}</span>
									</div>
									<div className="player-bar">
										<div
											className={`player-bar-fill ${server.players / server.maxPlayers > 0.7 ? 'high' : ''}`}
											style={{ width: `${(server.players / server.maxPlayers) * 100}%` }}
										/>
									</div>
									{server.ping !== undefined && server.ping > 0 && (
										<div className="server-ping">Ping: {server.ping}ms</div>
									)}
									{server.ip && server.gamePort && (
										<button
											className="btn btn-server btn-join"
											onClick={() => joinServer(server.ip, server.gamePort)}
										>
											<Gamepad2 size={18} /> Rejoindre
										</button>
									)}
								</div>
							))
```

- [ ] **Step 3: Commit**

```
git add src/app/(frontend)/globals.css src/components/ServerList.tsx
git commit -m "feat: add server card visual hierarchy with top-border and player bar"
```

---

### Task 7: CTA Section Redesign

**Files:**
- Modify: `src/app/(frontend)/globals.css`

- [ ] **Step 1: Replace CTA section styles**

Replace the entire `.cta-section` block (including the child rules through `.cta-section .btn-primary:hover`):

```css
/* CTA Section */
.cta-section {
  background:
    url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='rgba(201,162,39,0.06)' stroke-width='1'/%3E%3C/svg%3E"),
    linear-gradient(135deg, var(--primary) 0%, #1a2e0d 100%);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.cta-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.04) 2px,
    rgba(0, 0, 0, 0.04) 4px
  );
  pointer-events: none;
}

.cta-section .section-container {
  position: relative;
  z-index: 1;
}

.cta-section h2 {
  font-size: var(--text-2xl);
  margin-bottom: 1rem;
  color: var(--accent);
}

.cta-section p {
  font-size: var(--text-md);
  opacity: 0.9;
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.cta-section .btn-primary {
  background: var(--accent);
  color: var(--background);
  box-shadow: 0 4px 20px rgba(201, 162, 39, 0.3);
}

.cta-section .btn-primary:hover {
  background: var(--accent-hover);
  color: var(--background);
  box-shadow: 0 6px 25px rgba(201, 162, 39, 0.4);
}
```

- [ ] **Step 2: Commit**

```
git add src/app/(frontend)/globals.css
git commit -m "feat: redesign CTA section with diamond pattern, scanlines, and gold accent"
```

---

### Task 8: Footer Military Accent & Gold Usage

**Files:**
- Modify: `src/app/(frontend)/globals.css`

- [ ] **Step 1: Add monospace accent to footer headings and gold hover**

Replace the `.footer-links h4` rule:

```css
.footer-links h4 {
  color: var(--accent);
  margin-bottom: 1rem;
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 2px;
}
```

Replace the `.footer-bottom` rule:

```css
.footer-bottom {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  border-top: 1px solid var(--border);
  text-align: center;
  color: var(--muted);
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  letter-spacing: 1px;
}
```

- [ ] **Step 2: Commit**

```
git add src/app/(frontend)/globals.css
git commit -m "feat: add monospace and gold accents to footer"
```

---

### Task 9: Roleplay Minimum Font Sizes

**Files:**
- Modify: `src/app/(frontend)/roleplay/roleplay.css`

- [ ] **Step 1: Replace all font-size values below 0.688rem**

This is a bulk find-and-replace. In `src/app/(frontend)/roleplay/roleplay.css`:

- Replace all instances of `font-size: 0.55rem` with `font-size: 0.688rem`
- Replace all instances of `font-size: 0.6rem` with `font-size: 0.688rem`
- Replace all instances of `font-size: 0.65rem` with `font-size: 0.688rem`

This affects lines: 57, 586, 1045, 1051, 1198, 1448, 1684, 1768, 1783, 1814, 1860, 1867, 1879, 1883, 1889, 2470, 2497.

All get bumped to `0.688rem` (11px), the minimum readable size.

- [ ] **Step 2: Commit**

```
git add src/app/(frontend)/roleplay/roleplay.css
git commit -m "fix: enforce 11px minimum font size in roleplay section"
```

---

### Task 10: Video Section Border Radius Fix

**Files:**
- Modify: `src/app/(frontend)/globals.css`

- [ ] **Step 1: Sharpen video iframe corners to match cards**

Replace the `.video-card iframe` rule:

```css
.video-card iframe {
  width: 100%;
  max-width: 800px;
  aspect-ratio: 16 / 9;
  border: none;
  border-radius: 4px;
  border: 1px solid var(--border);
}
```

Also replace `.hero-image` border-radius:

```css
.hero-image {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 2rem;
}
```

And `.no-news`:

```css
.no-news {
  text-align: center;
  padding: 3rem;
  color: var(--muted);
  background: var(--card-bg);
  border-radius: 4px;
  border: 1px dashed var(--border);
}
```

- [ ] **Step 2: Commit**

```
git add src/app/(frontend)/globals.css
git commit -m "fix: sharpen remaining border-radius values to 4px for military consistency"
```

---

### Task 11: Final Integration & Version Bump

**Files:**
- Modify: `src/lib/version.ts`

- [ ] **Step 1: Bump version**

Update `src/lib/version.ts` — change version to `1.2.0` and add a changelog entry:

```ts
export const VERSION_INFO = {
  version: '1.2.0',
  creator: 'JaavLex',
  changelog: [
    {
      version: '1.2.0',
      date: '2026-04-03',
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
    // ... keep all existing entries
```

- [ ] **Step 2: Commit all remaining changes**

```
git add src/lib/version.ts
git commit -m "chore: bump version to 1.2.0 with design overhaul changelog"
```

- [ ] **Step 3: Deploy to dev for visual testing**

Use `/deploy-dev` to deploy and visually verify all changes on https://dev.lif-arma.com.

---

## Self-Review Checklist

1. **Spec coverage**: All 10 items covered — fonts (T1), focus states (T2), cards/textures/scanlines/gold (T3), animations (T4), mobile nav (T5), server hierarchy (T6), CTA redesign (T7), footer accents (T8), min font sizes (T9), remaining border-radius (T10).
2. **Placeholder scan**: No TBD/TODO/placeholders found. All steps have exact code.
3. **Type consistency**: CSS variables (`--font-heading`, `--font-body`, `--font-mono`, `--text-*`) used consistently across all tasks. `ScrollReveal` component name matches import in page.tsx. Class names (`server-online`, `server-offline`, `player-bar`, `player-bar-fill`, `nav-hamburger`, `nav-mobile`, `nav-links-desktop`, `scroll-reveal`, `revealed`) are consistent between CSS and component code.
