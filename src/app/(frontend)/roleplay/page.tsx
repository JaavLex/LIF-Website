import { getPayloadClient } from '@/lib/payload';
import Link from 'next/link';
import Image from 'next/image';
import { PersonnelFilters } from '@/components/roleplay/PersonnelFilters';
import { SessionBar } from '@/components/roleplay/SessionBar';

export const dynamic = 'force-dynamic';

export default async function RoleplayPage() {
	const payload = await getPayloadClient();

	const [characters, ranks, units, roleplayConfig] = await Promise.all([
		payload.find({
			collection: 'characters',
			where: {
				isArchived: { not_equals: true },
			},
			sort: '-createdAt',
			limit: 100,
			depth: 2,
		}),
		payload.find({
			collection: 'ranks',
			sort: 'order',
			limit: 100,
		}),
		payload.find({
			collection: 'units',
			limit: 100,
		}),
		payload.findGlobal({ slug: 'roleplay' }).catch(() => null),
	]);

	const headerLogo = (roleplayConfig as any)?.headerLogo;
	const headerBg = (roleplayConfig as any)?.headerBackground;
	const headerTitle = (roleplayConfig as any)?.headerTitle || 'Dossiers du Personnel';
	const headerSubtitle = (roleplayConfig as any)?.headerSubtitle || 'Base de données militaire — Accès autorisé';
	const showLore = (roleplayConfig as any)?.isLoreVisible !== false;
	const showTimeline = (roleplayConfig as any)?.isTimelineVisible !== false;

	return (
		<div className="terminal-container">
			{/* Hero header with logo and background */}
			<div
				className="roleplay-hero"
				style={{
					position: 'relative',
					padding: '3rem 2rem',
					marginBottom: '2rem',
					textAlign: 'center',
					overflow: 'hidden',
					border: '1px solid var(--border)',
					background: headerBg?.url ? 'none' : 'var(--bg-secondary)',
				}}
			>
				{headerBg?.url && (
					<Image
						src={headerBg.url}
						alt="Background"
						fill
						style={{ objectFit: 'cover', opacity: 0.25 }}
						unoptimized
					/>
				)}
				<div style={{ position: 'relative', zIndex: 1 }}>
					{headerLogo?.url && (
						<Image
							src={headerLogo.url}
							alt="Logo"
							width={120}
							height={120}
							style={{ marginBottom: '1rem' }}
							unoptimized
						/>
					)}
					<h1 style={{ fontSize: '1.8rem', letterSpacing: '3px', marginBottom: '0.5rem' }}>
						{headerTitle}
					</h1>
					<p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
						{headerSubtitle}
					</p>
				</div>
			</div>

			{/* Navigation */}
			<div
				style={{
					display: 'flex',
					gap: '1rem',
					marginBottom: '1.5rem',
					flexWrap: 'wrap',
					justifyContent: 'center',
				}}
			>
				{(showLore || showTimeline) && (
					<Link
						href="/roleplay/lore"
						className="session-btn"
						style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
					>
						Lore & Chronologie
					</Link>
				)}
			</div>

			<SessionBar />

			<div className="terminal-header">
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">SYSTÈME DE GESTION DU PERSONNEL</span>
				</div>
				<div className="terminal-header-right">
					LIF-PERSONNEL v2.0 | CLASSIFICATION: RESTREINT
				</div>
			</div>

			<div className="terminal-panel">
				<h1>BASE DE DONNÉES DU PERSONNEL</h1>

				<div className="system-status">
					<div className="status-item">
						<span className="status-indicator" />
						<span>Système opérationnel</span>
					</div>
					<div className="status-item">
						<span className="status-indicator" />
						<span>
							{characters.totalDocs} dossier{characters.totalDocs !== 1 ? 's' : ''}{' '}
							enregistré{characters.totalDocs !== 1 ? 's' : ''}
						</span>
					</div>
					<div className="status-item">
						<span className="status-indicator" />
						<span>
							{characters.docs.filter((c: any) => c.status === 'in-service').length}{' '}
							en service actif
						</span>
					</div>
				</div>

				<PersonnelFilters
					characters={JSON.parse(JSON.stringify(characters.docs))}
					ranks={JSON.parse(JSON.stringify(ranks.docs))}
					units={JSON.parse(JSON.stringify(units.docs))}
				/>
			</div>

			<div style={{ textAlign: 'center', padding: '1rem' }}>
				<Link href="/" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
					← Retour au site principal
				</Link>
			</div>
		</div>
	);
}
