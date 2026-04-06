import { getPayloadClient } from '@/lib/payload';
import { serialize } from '@/lib/constants';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { PersonnelFilters } from '@/components/roleplay/PersonnelFilters';
import { SessionBar } from '@/components/roleplay/SessionBar';
import { DiscordDisclaimer } from '@/components/roleplay/DiscordDisclaimer';
import { IntelligenceList } from '@/components/roleplay/IntelligenceList';
import { AdminPanel } from '@/components/roleplay/AdminPanel';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';
import { RoleplayTutorial } from '@/components/roleplay/RoleplayTutorial';
import { RulesModal } from '@/components/roleplay/RulesModal';
import OrgBankStats from '@/components/roleplay/OrgBankStats';
import type { Faction, Media, Roleplay, Unit } from '@/payload-types';

export const dynamic = 'force-dynamic';

export default async function RoleplayPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string }>;
}) {
	const { error: authError } = await searchParams;
	const payload = await getPayloadClient();

	// Get session
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	const session = token ? verifySession(token) : null;

	// Check admin
	let isAdmin = false;
	let adminPermissions: any = null;
	if (session) {
		adminPermissions = await checkAdminPermissions(session);
		isAdmin = adminPermissions.isAdmin;
	}

	// Check guild membership and operator role for disclaimer
	let disclaimerReason: 'not_member' | 'no_operator_role' | null = null;
	let disclaimerConfig: any = null;
	let canCreateCharacter = isAdmin;
	if (session) {
		const user = await payload.find({
			collection: 'users',
			where: { discordId: { equals: session.discordId } },
			limit: 1,
		});
		const userData = user.docs[0];
		if (userData && !userData.isGuildMember) {
			disclaimerReason = 'not_member';
		}
	}

	const [characters, ranks, units, roleplayConfig] = await Promise.all([
		payload.find({
			collection: 'characters',
			where: isAdmin ? {} : { isArchived: { not_equals: true } },
			sort: '-createdAt',
			limit: 500,
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
			depth: 1,
		}),
		payload.findGlobal({ slug: 'roleplay' }).catch(() => null) as Promise<Roleplay | null>,
	]);

	// Intelligence data
	let hasIntelRole = false;
	let userCharacters: any[] = [];
	if (session) {
		const intelligenceRoleId = roleplayConfig?.intelligenceRoleId;
		hasIntelRole =
			(intelligenceRoleId && session.roles?.includes(intelligenceRoleId)) || isAdmin;
		if (hasIntelRole) {
			const chars = await payload.find({
				collection: 'characters',
				where: { discordId: { equals: session.discordId } },
				limit: 20,
				depth: 0,
			});
			userCharacters = chars.docs;
		}
	}

	const [intelligence, factions] = await Promise.all([
		payload.find({
			collection: 'intelligence',
			sort: '-date',
			limit: 200,
			depth: 2,
		}),
		payload
			.find({ collection: 'factions', limit: 100, depth: 1 })
			.catch(() => ({ docs: [] })),
	]);

	const headerLogo = typeof roleplayConfig?.headerLogo === 'object' ? roleplayConfig.headerLogo : null;
	const headerBg = typeof roleplayConfig?.headerBackground === 'object' ? roleplayConfig.headerBackground : null;
	const headerTitle =
		roleplayConfig?.headerTitle || 'Dossiers du Personnel';
	const headerSubtitle =
		roleplayConfig?.headerSubtitle ||
		'Base de données militaire — Accès autorisé';
	const showLore = roleplayConfig?.isLoreVisible !== false;
	const showTimeline = roleplayConfig?.isTimelineVisible !== false;

	// Check operator role (after roleplayConfig is loaded)
	const operatorRoleId = roleplayConfig?.operatorRoleId;
	const intelligenceRoleIdCheck = roleplayConfig?.intelligenceRoleId;
	if (session && !isAdmin && !disclaimerReason) {
		const hasOperator = operatorRoleId
			? session.roles?.includes(operatorRoleId)
			: false;
		const hasIntel = intelligenceRoleIdCheck
			? session.roles?.includes(intelligenceRoleIdCheck)
			: false;
		if (!hasOperator && !hasIntel) {
			disclaimerReason = 'no_operator_role';
		} else {
			canCreateCharacter = !!hasOperator;
		}
	}

	disclaimerConfig = {
		title: roleplayConfig?.disclaimerTitle || 'ACCÈS RESTREINT',
		inviteUrl: roleplayConfig?.discordInviteUrl,
	};

	const errorMessages: Record<string, string> = {
		no_code: "Échec de l'authentification Discord. Veuillez réessayer.",
		auth_failed: 'Une erreur est survenue lors de la connexion. Veuillez réessayer.',
	};

	return (
		<div className="terminal-container">
			{/* Auth error banner */}
			{authError && errorMessages[authError] && (
				<div
					style={{
						padding: '0.75rem 1rem',
						background: 'rgba(139,38,53,0.15)',
						border: '1px solid var(--danger)',
						color: 'var(--danger)',
						marginBottom: '1rem',
						fontSize: '0.9rem',
						textAlign: 'center',
					}}
				>
					{errorMessages[authError]}
				</div>
			)}

			{/* Hero header with logo and background */}
			<div
				data-tutorial="hero"
				className="roleplay-hero"
				style={{
					position: 'relative',
					padding: '3rem 2rem',
					marginBottom: '2rem',
					textAlign: 'center',
					overflow: 'hidden',
					border: '1px solid var(--border)',
					background: headerBg?.url
						? 'var(--background)'
						: 'var(--background-secondary)',
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
					<h1
						style={{
							fontSize: '1.8rem',
							letterSpacing: '3px',
							marginBottom: '0.5rem',
						}}
					>
						{headerTitle}
					</h1>
					<p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
						{headerSubtitle}
					</p>
				</div>
			</div>

			{/* Navigation */}
			<div
				data-tutorial="navigation"
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
				{isAdmin && (
					<Link
						href="/moderation"
						className="session-btn"
						style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
					>
						⚖️ Modération
					</Link>
				)}
			</div>

			<div data-tutorial="session-bar">
				<SessionBar canCreateCharacter={canCreateCharacter} />
			</div>

			{isAdmin && (
				<div data-tutorial="admin-panel">
					<AdminPanel
						units={serialize(units.docs)}
						factions={serialize(factions.docs)}
						adminLevel={adminPermissions?.level === 'full' ? 'full' : 'limited'}
					/>
				</div>
			)}

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

			<div className="terminal-panel" data-tutorial="personnel-panel">
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
							{
								characters.docs.filter(
									c => c.status === 'in-service' && !c.isTarget,
								).length
							}{' '}
							en service actif
						</span>
					</div>
				</div>

				<PersonnelFilters
					characters={serialize(characters.docs)}
					ranks={serialize(ranks.docs)}
					units={serialize(units.docs)}
					factions={serialize(factions.docs)}
					sessionDiscordId={session?.discordId}
					isAdmin={isAdmin}
				/>
			</div>

			{/* Factions & Units section for all users */}
			{(factions.docs.length > 0 || units.docs.length > 0) && (
				<>
					<div className="terminal-header" style={{ marginTop: '2rem' }}>
						<div className="terminal-header-left">
							<div className="terminal-header-dots">
								<span className="terminal-dot green" />
								<span className="terminal-dot yellow" />
								<span className="terminal-dot red" />
							</div>
							<span className="terminal-title">ORGANISATIONS & UNITÉS</span>
						</div>
						<div className="terminal-header-right">
							{factions.docs.length} faction{factions.docs.length !== 1 ? 's' : ''} |{' '}
							{units.docs.length} unité{units.docs.length !== 1 ? 's' : ''}
						</div>
					</div>
					<div className="terminal-panel" style={{ marginBottom: '1.5rem' }}>
						{factions.docs.length > 0 && (
							<div style={{ marginBottom: '1.5rem' }}>
								<h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
									FACTIONS
								</h2>
								<div className="orgs-grid">
									{factions.docs.map((faction) => {
										const logo = typeof faction.logo === 'object' ? faction.logo : null;
										return (
										<Link
											key={faction.id}
											href={`/roleplay/faction/${faction.slug}`}
											className="org-card"
											style={{ borderColor: faction.color || 'var(--border)' }}
										>
											{logo?.url && (
												<Image
													src={logo.url}
													alt={faction.name}
													width={36}
													height={36}
													style={{ objectFit: 'contain' }}
													unoptimized
												/>
											)}
											<div>
												<div
													className="org-card-name"
													style={{ color: faction.color || 'var(--text)' }}
												>
													{faction.name}
												</div>
												<div className="org-card-type">
													{faction.type === 'allied'
														? 'Alliée'
														: faction.type === 'hostile'
															? 'Hostile'
															: 'Neutre'}
												</div>
											</div>
										</Link>
										);
									})}
								</div>
							</div>
						)}
						{units.docs.length > 0 && (
							<div>
								<h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
									UNITÉS
								</h2>
								<div className="orgs-grid">
									{units.docs.map((unit) => {
										const insignia = typeof unit.insignia === 'object' ? unit.insignia : null;
										return (
										<Link
											key={unit.id}
											href={`/roleplay/unite/${unit.slug}`}
											className="org-card"
											style={{ borderColor: unit.color || 'var(--border)' }}
										>
											{insignia?.url && (
												<Image
													src={insignia.url}
													alt={unit.name}
													width={36}
													height={36}
													style={{ objectFit: 'contain' }}
													unoptimized
												/>
											)}
											<div>
												<div
													className="org-card-name"
													style={{ color: unit.color || 'var(--text)' }}
												>
													{unit.name}
												</div>
												{unit.parentFaction &&
													typeof unit.parentFaction === 'object' && (
														<div className="org-card-type">
															{unit.parentFaction.name}
														</div>
													)}
											</div>
										</Link>
										);
									})}
								</div>
							</div>
						)}
					</div>
				</>
			)}

			{/* Intelligence section */}
			<div
				data-tutorial="intelligence"
				className="terminal-header"
				style={{ marginTop: '2rem' }}
			>
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">RENSEIGNEMENTS</span>
				</div>
				<div className="terminal-header-right">
					LIF-INTEL v1.0 | {intelligence.totalDocs} rapport
					{intelligence.totalDocs !== 1 ? 's' : ''}
				</div>
			</div>

			<div className="terminal-panel">
				<IntelligenceList
					reports={serialize(intelligence.docs)}
					isAdmin={isAdmin}
					hasIntelRole={hasIntelRole}
					userCharacters={serialize(userCharacters)}
					allCharacters={serialize(characters.docs)}
					factions={serialize(factions.docs)}
					sessionDiscordId={session?.discordId || null}
				/>
			</div>

			{/* Organisation Bank Stats */}
			<div className="terminal-header" style={{ marginTop: '2rem' }}>
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">FONDS DE L&apos;ORGANISATION</span>
				</div>
				<div className="terminal-header-right">LIF-FINANCE v1.0 | COMPTABILITÉ</div>
			</div>

			<div className="terminal-panel">
				<OrgBankStats isAdmin={isAdmin} />
			</div>

			<div style={{ textAlign: 'center', padding: '1rem' }}>
				<Link href="/" className="retour-link">
					← Retour au site principal
				</Link>
			</div>

			{/* Fixed bottom-left overlays */}
			{disclaimerReason && (
				<DiscordDisclaimer
					title={disclaimerConfig.title}
					reason={disclaimerReason}
					inviteUrl={disclaimerConfig.inviteUrl}
				/>
			)}
			<RoleplayTutorial isAdmin={isAdmin} adminPermissions={adminPermissions} />
			<RulesModal />
		</div>
	);
}
