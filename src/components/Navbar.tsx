'use client';

import Link from 'next/link';
import Image from 'next/image';

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
	const getHref = (link: NavLink): string => {
		if (link.type === 'internal' && link.page) {
			if (typeof link.page === 'object') return `/${link.page.slug}`;
			if (typeof link.page === 'string') return `/${link.page}`;
		}
		return link.url || '#';
	};

	// Default links if none provided
	const defaultLinks: NavLink[] = [
		{ label: 'Accueil', type: 'internal', page: { slug: '' } },
		{ label: 'Serveurs', type: 'anchor', url: '/#serveurs' },
		{ label: 'Règlement', type: 'internal', page: { slug: 'reglement' } },
		{ label: 'Actualités', type: 'internal', page: { slug: 'posts' } },
	];

	const navLinks = links && links.length > 0 ? links : defaultLinks;

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
				<div className="nav-links">
					{navLinks.map((link, index) => {
						const href = getHref(link);
						const isExternal = link.type === 'external';

						if (link.isHighlighted) {
							return (
								<a
									key={link.id || index}
									href={href}
									target={link.openInNewTab ? '_blank' : undefined}
									rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
									className="discord-btn"
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
								>
									{link.label}
								</a>
							);
						}

						return (
							<Link key={link.id || index} href={href}>
								{link.label}
							</Link>
						);
					})}
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
			</div>
		</nav>
	);
}
