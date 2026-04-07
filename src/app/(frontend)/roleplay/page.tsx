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
import { CommsNavButton } from '@/components/roleplay/CommsNavButton';
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
				<CommsNavButton />
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
			{(factions.docs.length > 0 || units.docs.length > 0) && (() => {
				// Split factions: main → allied → neutral → hostile, alpha-sorted within each
				const sortedFactions = [...factions.docs].sort((a, b) => a.name.localeCompare(b.name));
				const mainFaction = sortedFactions.find((f) => (f as any).isMainFaction) || null;
				const alliedFactions = sortedFactions.filter(
					(f) => f.type === 'allied' && !(f as any).isMainFaction,
				);
				const neutralFactions = sortedFactions.filter(
					(f) => f.type === 'neutral' && !(f as any).isMainFaction,
				);
				const hostileFactions = sortedFactions.filter(
					(f) => f.type === 'hostile' && !(f as any).isMainFaction,
				);

				// Group units by parent faction name
				const unitsByFaction = new Map<string, typeof units.docs>();
				for (const u of units.docs) {
					const parentName =
						u.parentFaction && typeof u.parentFaction === 'object'
							? u.parentFaction.name
							: 'Indépendantes';
					if (!unitsByFaction.has(parentName)) unitsByFaction.set(parentName, []);
					unitsByFaction.get(parentName)!.push(u);
				}
				const sortedUnitGroups = Array.from(unitsByFaction.entries()).sort(
					([a], [b]) => {
						// Main faction's units first, then allied, then others
						if (mainFaction && a === mainFaction.name) return -1;
						if (mainFaction && b === mainFaction.name) return 1;
						return a.localeCompare(b);
					},
				);

				const renderFactionCard = (faction: Faction) => {
					const logo = typeof faction.logo === 'object' ? faction.logo : null;
					const color = faction.color || 'var(--border)';
					return (
						<Link
							key={faction.id}
							href={`/roleplay/faction/${faction.slug}`}
							className={`org-card org-card--faction type-${faction.type || 'neutral'}`}
							style={{ ['--org-color' as any]: color }}
						>
							<div className="org-card-logo">
								{logo?.url ? (
									<Image
										src={logo.url}
										alt={faction.name}
										width={44}
										height={44}
										style={{ objectFit: 'contain' }}
										unoptimized
									/>
								) : (
									<span className="org-card-logo-placeholder">
										{faction.name.charAt(0)}
									</span>
								)}
							</div>
							<div className="org-card-body">
								<div className="org-card-name">{faction.name}</div>
								<div className="org-card-meta">
									{faction.type === 'allied'
										? 'ALLIÉE'
										: faction.type === 'hostile'
											? 'HOSTILE'
											: 'NEUTRE'}
								</div>
							</div>
							<span className="org-card-arrow" aria-hidden>
								›
							</span>
						</Link>
					);
				};

				const FactionGroup = ({
					label,
					type,
					list,
				}: {
					label: string;
					type: 'allied' | 'neutral' | 'hostile';
					list: Faction[];
				}) => {
					if (list.length === 0) return null;
					return (
						<div className={`faction-group faction-group--${type}`}>
							<div className="faction-group-header">
								<span className="faction-group-marker" aria-hidden />
								<span className="faction-group-label">{label}</span>
								<span className="faction-group-line" />
								<span className="faction-group-count">{list.length}</span>
							</div>
							<div className="orgs-grid">{list.map(renderFactionCard)}</div>
						</div>
					);
				};

				return (
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
						<div className="terminal-panel factions-panel">
							{/* Featured main faction */}
							{mainFaction && (() => {
								const logo =
									typeof mainFaction.logo === 'object' ? mainFaction.logo : null;
								const color = mainFaction.color || 'var(--primary)';
								return (
									<Link
										href={`/roleplay/faction/${mainFaction.slug}`}
										className="main-faction-hero"
										style={{ ['--org-color' as any]: color }}
									>
										<span className="main-faction-hero-badge">
											<span className="main-faction-hero-badge-dot" />
											FACTION PRINCIPALE
										</span>
										<div className="main-faction-hero-inner">
											<div className="main-faction-hero-logo">
												{logo?.url ? (
													<Image
														src={logo.url}
														alt={mainFaction.name}
														width={96}
														height={96}
														style={{ objectFit: 'contain' }}
														unoptimized
													/>
												) : (
													<span>{mainFaction.name.charAt(0)}</span>
												)}
											</div>
											<div className="main-faction-hero-body">
												<div className="main-faction-hero-name">
													{mainFaction.name}
												</div>
												<div className="main-faction-hero-sub">
													{mainFaction.type === 'allied'
														? 'ALLIÉE · COMMANDEMENT LIF'
														: mainFaction.type === 'hostile'
															? 'HOSTILE'
															: 'COMMANDEMENT LIF'}
												</div>
												<div className="main-faction-hero-cta">
													Ouvrir le dossier <span aria-hidden>→</span>
												</div>
											</div>
										</div>
										<span className="main-faction-hero-corner tl" aria-hidden />
										<span className="main-faction-hero-corner tr" aria-hidden />
										<span className="main-faction-hero-corner bl" aria-hidden />
										<span className="main-faction-hero-corner br" aria-hidden />
									</Link>
								);
							})()}

							{/* Factions sorted by alignment */}
							{factions.docs.length > 0 && (
								<div className="factions-groups">
									<FactionGroup
										label="ALLIÉES"
										type="allied"
										list={alliedFactions as unknown as Faction[]}
									/>
									<FactionGroup
										label="NEUTRES"
										type="neutral"
										list={neutralFactions as unknown as Faction[]}
									/>
									<FactionGroup
										label="HOSTILES"
										type="hostile"
										list={hostileFactions as unknown as Faction[]}
									/>
								</div>
							)}

							{/* Units grouped by parent faction */}
							{units.docs.length > 0 && (
								<div className="units-section">
									<div className="faction-group-header units-main-header">
										<span className="faction-group-marker" aria-hidden />
										<span className="faction-group-label">UNITÉS</span>
										<span className="faction-group-line" />
										<span className="faction-group-count">
											{units.docs.length}
										</span>
									</div>
									{sortedUnitGroups.map(([parentName, unitList]) => (
										<div key={parentName} className="unit-sub-group">
											<div className="unit-sub-group-header">
												<span className="unit-sub-group-tick" />
												<span>{parentName}</span>
												<span className="unit-sub-group-count">
													{unitList.length}
												</span>
											</div>
											<div className="orgs-grid">
												{unitList.map((unit) => {
													const insignia =
														typeof unit.insignia === 'object' ? unit.insignia : null;
													return (
														<Link
															key={unit.id}
															href={`/roleplay/unite/${unit.slug}`}
															className="org-card org-card--unit"
															style={{
																['--org-color' as any]: unit.color || 'var(--border)',
															}}
														>
															<div className="org-card-logo">
																{insignia?.url ? (
																	<Image
																		src={insignia.url}
																		alt={unit.name}
																		width={40}
																		height={40}
																		style={{ objectFit: 'contain' }}
																		unoptimized
																	/>
																) : (
																	<span className="org-card-logo-placeholder">
																		{unit.name.charAt(0)}
																	</span>
																)}
															</div>
															<div className="org-card-body">
																<div className="org-card-name">{unit.name}</div>
																<div className="org-card-meta">UNITÉ</div>
															</div>
															<span className="org-card-arrow" aria-hidden>
																›
															</span>
														</Link>
													);
												})}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</>
				);
			})()}

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
