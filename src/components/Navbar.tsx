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
