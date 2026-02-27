import Link from 'next/link';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@payload-config';
import { ServerList } from '@/components/ServerList';
import { FeaturesSection } from '@/components/FeaturesSection';
import { NewsSection } from '@/components/NewsSection';
import { Navbar } from '@/components/Navbar';
import type { Media } from '@/payload-types';

export const dynamic = 'force-dynamic';

// Default values for when the global isn't configured yet
const defaults = {
	heroTitle: 'Légion Internationale Francophone',
	heroTitleAccent: 'Légion',
	heroSubtitle: 'Communauté francophone sur Arma Reforger',
	heroDescription:
		'Rejoignez notre communauté de joueurs passionnés et vivez des opérations militaires immersives sur nos deux serveurs dédiés.',
	heroPrimaryButtonText: 'Rejoindre le Discord',
	heroPrimaryButtonUrl: 'https://discord.gg/votre-discord',
	heroSecondaryButtonText: 'Nos Serveurs',
	heroSecondaryButtonUrl: '#serveurs',
	serversTitle: 'Nos Serveurs',
	serversIcon: 'Swords',
	servers: [
		{
			name: 'Serveur 1 - Conflit',
			mode: 'Mode Conflict',
			description: 'Affrontements tactiques à grande échelle.',
			maxPlayers: 64,
			map: 'Everon',
			isOnline: true,
		},
		{
			name: 'Serveur 2 - Game Master',
			mode: 'Mode Game Master',
			description: 'Opérations scénarisées dirigées par nos Game Masters.',
			maxPlayers: 32,
			map: 'Everon',
			isOnline: true,
		},
	],
	featuresTitle: 'Pourquoi nous rejoindre ?',
	featuresIcon: 'Star',
	features: [
		{
			icon: 'Medal',
			title: 'Communauté Active',
			description: 'Une communauté francophone soudée et accueillante.',
		},
		{
			icon: 'Target',
			title: 'Gameplay Tactique',
			description: 'Des parties organisées avec communication et coordination.',
		},
		{
			icon: 'ClipboardList',
			title: 'Opérations Régulières',
			description: 'Des événements et opérations spéciales chaque semaine.',
		},
		{
			icon: 'Shield',
			title: 'Serveurs Stables',
			description: 'Infrastructure de qualité pour une expérience optimale.',
		},
	],
	newsTitle: 'Actualités',
	newsIcon: 'Newspaper',
	ctaTitle: 'Prêt à rejoindre les rangs ?',
	ctaDescription:
		"Rejoignez notre Discord pour commencer l'aventure avec la Légion Internationale Francophone.",
	ctaButtonText: 'Rejoindre la LIF',
	ctaButtonUrl: 'https://discord.gg/votre-discord',
	discordUrl: 'https://discord.gg/votre-discord',
	youtubeUrl: '',
	twitterUrl: '',
};

export default async function Home() {
	const payload = await getPayload({ config });

	// Fetch homepage content from global
	let homepage;
	try {
		homepage = await payload.findGlobal({ slug: 'homepage' });
	} catch {
		homepage = null;
	}

	// Fetch navigation from global
	let navigation;
	try {
		navigation = await payload.findGlobal({ slug: 'navigation' });
	} catch {
		navigation = null;
	}

	// Merge with defaults
	const content = { ...defaults, ...homepage };

	const posts = await payload.find({
		collection: 'posts',
		where: {
			status: {
				equals: 'published',
			},
		},
		limit: 3,
		sort: '-publishedDate',
	});

	// Helper to render title with accent
	const renderTitle = () => {
		const title = content.heroTitle || defaults.heroTitle;
		const accent = content.heroTitleAccent || defaults.heroTitleAccent;
		if (accent && title.includes(accent)) {
			const parts = title.split(accent);
			return (
				<>
					{parts[0]}
					<span className="title-accent">{accent}</span>
					{parts.slice(1).join(accent)}
				</>
			);
		}
		return title;
	};

	const servers =
		content.servers && content.servers.length > 0
			? content.servers
			: defaults.servers;
	const features =
		content.features && content.features.length > 0
			? content.features
			: defaults.features;

	// Get logo and background URLs
	const logoMedia = content.logo as Media | null | undefined;
	const logoUrl = logoMedia?.url || undefined;
	const heroBackgroundMedia = content.heroBackground as Media | null | undefined;
	const heroBackgroundUrl = heroBackgroundMedia?.url || undefined;

	// Format posts for NewsSection
	const formattedPosts = posts.docs.map(post => ({
		id: String(post.id),
		title: post.title,
		slug: post.slug,
		excerpt: post.excerpt,
		publishedDate: post.publishedDate,
	}));

	return (
		<main className="home">
			{/* Navigation */}
			<Navbar
				logoUrl={logoUrl}
				links={navigation?.links ?? undefined}
				discordUrl={navigation?.discordUrl ?? content.discordUrl ?? defaults.discordUrl}
			/>

			{/* Hero Section */}
			<section
				className="hero"
				style={
					heroBackgroundUrl
						? { backgroundImage: `url(${heroBackgroundUrl})` }
						: undefined
				}
			>
				<div className="hero-overlay"></div>
				<div className="hero-content">
					{logoUrl && (
						<div className="hero-logo">
							<Image
								src={logoUrl}
								alt="LIF Logo"
								width={300}
								height={300}
								priority
							/>
						</div>
					)}
					<h1 className="hero-title">{renderTitle()}</h1>
					<p className="hero-subtitle">
						{content.heroSubtitle || defaults.heroSubtitle}
					</p>
					<p className="hero-description">
						{content.heroDescription || defaults.heroDescription}
					</p>
					<div className="hero-buttons">
						<a
							href={content.heroPrimaryButtonUrl || defaults.heroPrimaryButtonUrl}
							className="btn btn-primary"
							target="_blank"
							rel="noopener noreferrer"
						>
							{content.heroPrimaryButtonText || defaults.heroPrimaryButtonText}
						</a>
						<a
							href={
								content.heroSecondaryButtonUrl || defaults.heroSecondaryButtonUrl
							}
							className="btn btn-secondary"
						>
							{content.heroSecondaryButtonText || defaults.heroSecondaryButtonText}
						</a>
					</div>
				</div>
			</section>

			{/* Servers Section - Uses client component for live A2S data */}
			<ServerList
				title={content.serversTitle || defaults.serversTitle}
				titleIcon={content.serversIcon || defaults.serversIcon}
				fallbackServers={servers}
			/>

			{/* Features Section */}
			<FeaturesSection
				title={content.featuresTitle || defaults.featuresTitle}
				titleIcon={content.featuresIcon || defaults.featuresIcon}
				features={features}
			/>

			{/* News Section */}
			<NewsSection
				title={content.newsTitle || defaults.newsTitle}
				titleIcon={content.newsIcon || defaults.newsIcon}
				posts={formattedPosts}
			/>

			{/* CTA Section */}
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

			{/* Footer */}
			<footer className="main-footer">
				<div className="footer-container">
					<div className="footer-brand">
						{logoUrl && (
							<Image
								src={logoUrl}
								alt="LIF Logo"
								width={60}
								height={60}
								className="footer-logo"
							/>
						)}
						<span className="logo-text">LIF</span>
						<p>Légion Internationale Francophone</p>
						<p className="footer-tagline">Communauté Arma Reforger depuis 2025</p>
					</div>
					<div className="footer-links">
						<h4>Navigation</h4>
						<Link href="/">Accueil</Link>
						<Link href="/#serveurs">Serveurs</Link>
						<Link href="/reglement">Règlement</Link>
						<Link href="/posts">Actualités</Link>
					</div>
					<div className="footer-links">
						<h4>Communauté</h4>
						<a
							href={content.discordUrl || defaults.discordUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							Discord
						</a>
						{(content.youtubeUrl || defaults.youtubeUrl) && (
							<a
								href={content.youtubeUrl || defaults.youtubeUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								YouTube
							</a>
						)}
						{(content.twitterUrl || defaults.twitterUrl) && (
							<a
								href={content.twitterUrl || defaults.twitterUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								Twitter
							</a>
						)}
					</div>
					<div className="footer-admin">
						<Link href="/admin" className="admin-link">
							Administration
						</Link>
					</div>
				</div>
				<div className="footer-bottom">
					<p>
						© {new Date().getFullYear()} Légion Internationale Francophone. Tous
						droits réservés.
					</p>
				</div>
			</footer>
		</main>
	);
}
