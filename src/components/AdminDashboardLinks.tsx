'use client';

import React, { useEffect, useMemo, useState } from 'react';

type DashboardLink = {
	title?: string;
	description?: string;
	url?: string;
	icon?: string;
	color?: string;
};

const fallbackLinks: DashboardLink[] = [
	{
		title: 'Métriques',
		description: 'Surveillance et performances des serveurs',
		url: 'https://monitor.lif-arma.com',
		icon: '📊',
		color: '#4a7c23',
	},
	{
		title: 'Panel Serveurs',
		description: 'Tableau de bord des serveurs de jeu',
		url: 'https://panel.lif-arma.com',
		icon: '🖥️',
		color: '#5865F2',
	},
];

const isHexColor = (value?: string): value is string => {
	if (!value) return false;
	return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(value);
};

const normalizeLinks = (links: DashboardLink[] | undefined): DashboardLink[] => {
	if (!Array.isArray(links) || links.length === 0) {
		return fallbackLinks;
	}

	const normalized = links
		.filter(link => link?.url && link?.title)
		.map(link => ({
			title: link.title?.trim() || 'Lien',
			description: link.description?.trim() || '',
			url: link.url?.trim() || '#',
			icon: link.icon?.trim() || '🔗',
			color: isHexColor(link.color?.trim()) ? link.color?.trim() : '#4a7c23',
		}));

	return normalized.length > 0 ? normalized : fallbackLinks;
};

const styles: Record<string, React.CSSProperties> = {
	container: {
		padding: '2rem',
		marginTop: '2rem',
	},
	header: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: '1rem',
		marginBottom: '1.5rem',
	},
	title: {
		fontSize: '1.25rem',
		fontWeight: 600,
		margin: 0,
		color: 'var(--theme-text)',
	},
	configureButton: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: '0.55rem 0.9rem',
		borderRadius: '8px',
		border: '1px solid var(--theme-elevation-200)',
		background: 'var(--theme-elevation-50)',
		color: 'var(--theme-text)',
		fontSize: '0.85rem',
		fontWeight: 600,
		textDecoration: 'none',
		transition: 'background 0.2s ease, transform 0.2s ease',
	},
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
		gap: '1.5rem',
	},
	card: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		padding: '2rem',
		borderRadius: '12px',
		textDecoration: 'none',
		color: 'white',
		transition: 'all 0.3s ease',
		minHeight: '180px',
		boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
	},
	icon: {
		fontSize: '3rem',
		marginBottom: '1rem',
	},
	cardTitle: {
		fontSize: '1.5rem',
		fontWeight: 700,
		marginBottom: '0.5rem',
	},
	cardDescription: {
		fontSize: '0.9rem',
		opacity: 0.9,
		textAlign: 'center' as const,
	},
	loading: {
		fontSize: '0.9rem',
		opacity: 0.8,
		color: 'var(--theme-text)',
	},
};

export const AdminDashboardLinks: React.FC = () => {
	const [links, setLinks] = useState<DashboardLink[]>(fallbackLinks);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let isMounted = true;

		const loadLinks = async () => {
			try {
				const response = await fetch('/api/globals/admin-dashboard?depth=0', {
					headers: {
						'Content-Type': 'application/json',
					},
				});

				if (!response.ok) {
					throw new Error('Impossible de charger les liens');
				}

				const data = (await response.json()) as { links?: DashboardLink[] };
				if (isMounted) {
					setLinks(normalizeLinks(data.links));
				}
			} catch {
				if (isMounted) {
					setLinks(fallbackLinks);
				}
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		void loadLinks();

		return () => {
			isMounted = false;
		};
	}, []);

	const visibleLinks = useMemo(() => normalizeLinks(links), [links]);

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h2 style={styles.title}>Accès rapides</h2>
				<a href="/admin/globals/admin-dashboard" style={styles.configureButton}>
					Configurer les liens
				</a>
			</div>
			{isLoading ? <p style={styles.loading}>Chargement des liens...</p> : null}
			<div style={styles.grid}>
				{visibleLinks.map(link => (
					<a
						key={`${link.url}-${link.title}`}
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						style={{
							...styles.card,
							backgroundColor: link.color,
						}}
						onMouseEnter={e => {
							e.currentTarget.style.transform = 'translateY(-4px)';
							e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)';
						}}
						onMouseLeave={e => {
							e.currentTarget.style.transform = 'translateY(0)';
							e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
						}}
					>
						<span style={styles.icon}>{link.icon}</span>
						<span style={styles.cardTitle}>{link.title}</span>
						<span style={styles.cardDescription}>{link.description}</span>
					</a>
				))}
			</div>
		</div>
	);
};

export default AdminDashboardLinks;
