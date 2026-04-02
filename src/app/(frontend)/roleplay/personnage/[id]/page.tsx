import { getPayloadClient } from '@/lib/payload';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { RichTextRenderer } from '@/components/roleplay/RichTextRenderer';
import { CharacterTimeline } from '@/components/roleplay/CharacterTimeline';
import { SyncRankButton } from '@/components/roleplay/SyncRankButton';
import { AddTimelineEvent } from '@/components/roleplay/AddTimelineEvent';
import { DeleteCharacterButton } from '@/components/roleplay/DeleteCharacterButton';
import { GameMoneySection } from '@/components/roleplay/GameMoneySection';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
	'in-service': 'En service',
	kia: 'KIA (Mort au combat)',
	mia: 'MIA (Disparu)',
	retired: 'Retraité',
	'honourable-discharge': 'Réformé avec honneur',
	'dishonourable-discharge': 'Réformé sans honneur',
	executed: 'Exécuté',
};

const THREAT_LABELS: Record<string, string> = {
	low: 'Faible',
	moderate: 'Modéré',
	high: 'Élevé',
	critical: 'Critique',
};

export default async function CharacterPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const payload = await getPayloadClient();

	const characterId = parseInt(id, 10);
	if (isNaN(characterId)) notFound();

	let character: any;
	try {
		character = await payload.findByID({
			collection: 'characters',
			id: characterId,
			depth: 2,
		});
	} catch {
		notFound();
	}

	if (!character) notFound();

	// Fetch timeline events
	const timeline = await payload.find({
		collection: 'character-timeline',
		where: {
			character: { equals: characterId },
		},
		sort: '-date',
		limit: 50,
		depth: 1,
	});

	const rank = typeof character.rank === 'object' ? character.rank : null;
	const unit = typeof character.unit === 'object' ? character.unit : null;
	const superior =
		typeof character.superiorOfficer === 'object' ? character.superiorOfficer : null;

	// Fetch factions for logo/color display
	const factionsResult = await payload
		.find({ collection: 'factions', limit: 100, depth: 1 })
		.catch(() => ({ docs: [] }));
	const factionObj = character.faction
		? factionsResult.docs.find((f: any) => f.name === character.faction)
		: null;
	const targetFactionObj = character.targetFaction
		? factionsResult.docs.find((f: any) => f.name === character.targetFaction)
		: null;

	// Check if current user is the owner or admin
	const cookieStore = await cookies();
	const token = cookieStore.get('roleplay-session')?.value;
	const session = token ? verifySession(token) : null;
	const isOwner = session?.discordId === character.discordId;

	let isAdmin = false;
	let adminPermissions: any = null;
	if (session) {
		adminPermissions = await checkAdminPermissions(session);
		isAdmin = adminPermissions.isAdmin;
	}

	// Archived characters only visible to admins
	if (character.isArchived && !isAdmin) notFound();

	const canEdit = isOwner || isAdmin;
	const canDelete = isAdmin && adminPermissions?.level === 'full';

	return (
		<div className="terminal-container">
			<Link
				href="/roleplay"
				style={{
					color: 'var(--muted)',
					fontSize: '0.85rem',
					display: 'inline-block',
					marginBottom: '1rem',
				}}
			>
				← Retour à la base de données
			</Link>

			{/* Admin indicator */}
			{isAdmin && adminPermissions && (
				<div className="admin-indicator">
					<span className="admin-indicator-dot" />
					<span>MODE ADMIN</span>
					<span className="admin-role-name">{adminPermissions.roleName}</span>
				</div>
			)}

			{/* Archived banner */}
			{character.isArchived && (
				<div className="archived-banner">
					DOSSIER ARCHIVÉ
					{character.archiveReason && <span> — {character.archiveReason}</span>}
				</div>
			)}

			<div className="terminal-header">
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">
						{character.isTarget ? 'FICHE CIBLE' : 'DOSSIER PERSONNEL'} —{' '}
						{character.militaryId || 'N/A'}
					</span>
				</div>
				<div className="terminal-header-right">
					<span className={`classification-badge ${character.classification}`}>
						{character.classification}
					</span>
				</div>
			</div>

			<div className="terminal-panel">
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
					}}
				>
					<h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						{character.isMainCharacter && (
							<span className="main-character-badge" title="Personnage principal">
								★
							</span>
						)}
						{rank?.icon?.url && (
							<Image
								src={rank.icon.url}
								alt={rank.name}
								width={32}
								height={32}
								unoptimized
							/>
						)}
						{rank && <>{rank.abbreviation || rank.name} </>}
						{character.fullName}
					</h1>
					{(canEdit || canDelete) && (
						<div style={{ display: 'flex', gap: '0.5rem' }}>
							{isOwner && <SyncRankButton characterId={character.id} />}
							{canEdit && (
								<Link
									href={`/roleplay/personnage/${character.id}/modifier`}
									className="session-btn"
									style={{
										padding: '0.5rem 1rem',
										fontSize: '0.85rem',
										whiteSpace: 'nowrap',
									}}
								>
									Modifier
								</Link>
							)}
							{canDelete && (
								<DeleteCharacterButton
									characterId={character.id}
									characterName={character.fullName}
								/>
							)}
						</div>
					)}
				</div>

				<div className="character-detail">
					{/* Sidebar */}
					<div className="character-sidebar">
						{character.avatar?.url ? (
							<Image
								src={character.avatar.url}
								alt={character.fullName}
								width={300}
								height={400}
								className="character-photo"
								unoptimized
							/>
						) : (
							<div className="character-photo-placeholder">
								{character.firstName?.[0]}
								{character.lastName?.[0]}
							</div>
						)}

						<div className="character-info-block">
							<h3>Informations</h3>
							<div className="info-row">
								<span className="info-label">Matricule</span>
								<span className="info-value">{character.militaryId || '—'}</span>
							</div>
							<div className="info-row">
								<span className="info-label">Grade</span>
								<span
									className="info-value"
									style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
								>
									{rank?.icon?.url ? (
										<Image
											src={rank.icon.url}
											alt={rank.name}
											width={20}
											height={20}
											unoptimized
										/>
									) : (
										<span style={{ color: 'var(--muted)' }}>—</span>
									)}
									{rank?.name || 'Aucun grade'}
								</span>
							</div>
							<div className="info-row">
								<span className="info-label">Statut</span>
								<span className="info-value">
									<span className={`status-badge ${character.status}`}>
										{STATUS_LABELS[character.status] || character.status}
									</span>
								</span>
							</div>
							<div className="info-row">
								<span className="info-label">Unité</span>
								<span
									className="info-value"
									style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
								>
									{unit?.insignia?.url && (
										<Image
											src={unit.insignia.url}
											alt={unit.name}
											width={18}
											height={18}
											unoptimized
										/>
									)}
									{unit ? (
										<Link
											href={`/roleplay/unite/${unit.slug}`}
											style={{ color: unit.color || 'var(--primary)' }}
										>
											{unit.name}
										</Link>
									) : (
										'—'
									)}
								</span>
							</div>
							{character.faction && (
								<div className="info-row">
									<span className="info-label">Faction</span>
									<span
										className="info-value"
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '0.35rem',
											color: (factionObj as any)?.color || 'inherit',
										}}
									>
										{(factionObj as any)?.logo?.url && (
											<Image
												src={(factionObj as any).logo.url}
												alt={character.faction}
												width={18}
												height={18}
												style={{ objectFit: 'contain' }}
												unoptimized
											/>
										)}
										{(factionObj as any)?.slug ? (
											<Link
												href={`/roleplay/faction/${(factionObj as any).slug}`}
												style={{
													color: (factionObj as any)?.color || 'var(--primary)',
												}}
											>
												{character.faction}
											</Link>
										) : (
											character.faction
										)}
									</span>
								</div>
							)}
							{character.isTarget && (
								<>
									{character.targetFaction && (
										<div className="info-row">
											<span className="info-label">Faction cible</span>
											<span
												className="info-value"
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: '0.35rem',
													color: (targetFactionObj as any)?.color || 'var(--danger)',
												}}
											>
												{(targetFactionObj as any)?.logo?.url && (
													<Image
														src={(targetFactionObj as any).logo.url}
														alt={character.targetFaction}
														width={18}
														height={18}
														style={{ objectFit: 'contain' }}
														unoptimized
													/>
												)}
												{character.targetFaction}
											</span>
										</div>
									)}
									{character.threatLevel && (
										<div className="info-row">
											<span className="info-label">Menace</span>
											<span className="info-value">
												<span className={`threat-badge ${character.threatLevel}`}>
													{THREAT_LABELS[character.threatLevel] ||
														character.threatLevel}
												</span>
											</span>
										</div>
									)}
								</>
							)}
							{character.isMainCharacter && (
								<div className="info-row">
									<span className="info-label">Type</span>
									<span className="info-value" style={{ color: 'var(--accent)' }}>
										Personnage principal
									</span>
								</div>
							)}
							{character.discordUsername && (
								<div className="info-row">
									<span className="info-label">Discord</span>
									<span className="info-value">@{character.discordUsername}</span>
								</div>
							)}
						</div>

						<div className="character-info-block">
							<h3>Identité</h3>
							{character.dateOfBirth && (
								<div className="info-row">
									<span className="info-label">Naissance</span>
									<span className="info-value">
										{new Date(character.dateOfBirth).toLocaleDateString('fr-FR')}
									</span>
								</div>
							)}
							{character.placeOfOrigin && (
								<div className="info-row">
									<span className="info-label">Origine</span>
									<span className="info-value">{character.placeOfOrigin}</span>
								</div>
							)}
							{character.height && (
								<div className="info-row">
									<span className="info-label">Taille</span>
									<span className="info-value">{character.height} cm</span>
								</div>
							)}
							{character.weight && (
								<div className="info-row">
									<span className="info-label">Poids</span>
									<span className="info-value">{character.weight} kg</span>
								</div>
							)}
						</div>

						{superior && (
							<div className="character-info-block">
								<h3>Hiérarchie</h3>
								<div className="info-row">
									<span className="info-label">Supérieur</span>
									<span className="info-value">
										<Link
											href={`/roleplay/personnage/${superior.id}`}
											style={{ color: 'var(--primary)' }}
										>
											{superior.fullName}
										</Link>
									</span>
								</div>
							</div>
						)}

						{character.motto && (
							<div className="character-info-block">
								<h3>Devise</h3>
								<p
									style={{
										fontStyle: 'italic',
										color: 'var(--accent)',
										textAlign: 'center',
										padding: '0.5rem 0',
									}}
								>
									&laquo; {character.motto} &raquo;
								</p>
							</div>
						)}

						{/* Game money section — visible if BI ID is linked and not anonymous (or owner/admin) */}
						{character.biId && (!character.bankAnonymous || isOwner || isAdmin) && (
							<GameMoneySection
								characterId={character.id}
								biId={character.biId}
								initialSavedMoney={character.savedMoney ?? null}
								initialLastSyncAt={character.lastMoneySyncAt ?? null}
								isAdmin={isAdmin}
								isOwner={isOwner}
								bankAnonymous={character.bankAnonymous ?? false}
							/>
						)}
					</div>

					{/* Main content */}
					<div className="character-main">
						{character.physicalDescription && (
							<div className="character-section">
								<h2>Description physique</h2>
								<div className="character-section-content">
									<p>{character.physicalDescription}</p>
								</div>
							</div>
						)}

						{character.previousUnit && (
							<div className="character-section">
								<h2>Unité précédente</h2>
								<div className="character-section-content">
									<p>{character.previousUnit}</p>
								</div>
							</div>
						)}

						{character.specialisations?.length > 0 && (
							<div className="character-section">
								<h2>Spécialisations</h2>
								<div className="character-section-content">
									<ul
										style={{
											listStyle: 'none',
											padding: 0,
											display: 'flex',
											gap: '0.5rem',
											flexWrap: 'wrap',
										}}
									>
										{character.specialisations.map((s: any, i: number) => (
											<li
												key={i}
												style={{
													padding: '0.25rem 0.75rem',
													border: '1px solid var(--primary)',
													fontSize: '0.85rem',
													color: 'var(--primary)',
												}}
											>
												{s.name}
											</li>
										))}
									</ul>
								</div>
							</div>
						)}

						{character.civilianBackground && (
							<div className="character-section">
								<h2>Parcours civil</h2>
								<div className="character-section-content">
									<RichTextRenderer content={character.civilianBackground} />
								</div>
							</div>
						)}

						{character.militaryBackground && (
							<div className="character-section">
								<h2>Parcours militaire</h2>
								<div className="character-section-content">
									<RichTextRenderer content={character.militaryBackground} />
								</div>
							</div>
						)}

						{character.legalBackground && (
							<div className="character-section">
								<h2>Parcours judiciaire</h2>
								<div className="character-section-content">
									<RichTextRenderer content={character.legalBackground} />
								</div>
							</div>
						)}

						{character.miscellaneous && (
							<div className="character-section">
								<h2>Informations complémentaires</h2>
								<div className="character-section-content">
									<RichTextRenderer content={character.miscellaneous} />
								</div>
							</div>
						)}

						{/* Admin notes - only visible to admins */}
						{isAdmin && character.etatMajorNotes && (
							<div className="character-section admin-section">
								<h2>Notes État-Major (Admin)</h2>
								<div className="character-section-content">
									<RichTextRenderer content={character.etatMajorNotes} />
								</div>
							</div>
						)}

						{timeline.docs.length > 0 ? (
							<div className="character-section">
								<h2 style={{ display: 'flex', alignItems: 'center' }}>
									Historique
									{isAdmin && <AddTimelineEvent characterId={character.id} />}
								</h2>
								<CharacterTimeline
									events={JSON.parse(JSON.stringify(timeline.docs))}
									isAdmin={isAdmin}
								/>
							</div>
						) : (
							<div className="character-section">
								<h2 style={{ display: 'flex', alignItems: 'center' }}>
									Historique
									{isAdmin && <AddTimelineEvent characterId={character.id} />}
								</h2>
								<div className="empty-state-inline">
									Aucun événement enregistré dans l&apos;historique.
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
