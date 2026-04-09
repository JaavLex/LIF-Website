import { getPayloadClient } from '@/lib/payload';
import { serialize } from '@/lib/constants';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import type { Character, Faction, Media } from '@/payload-types';
import { RichTextRenderer } from '@/components/roleplay/RichTextRenderer';
import { CharacterTimeline } from '@/components/roleplay/CharacterTimeline';
import { SyncRankButton } from '@/components/roleplay/SyncRankButton';
import { AddTimelineEvent } from '@/components/roleplay/AddTimelineEvent';
import { DeleteCharacterButton } from '@/components/roleplay/DeleteCharacterButton';
import { RequireImprovementsButton } from '@/components/roleplay/RequireImprovementsButton';
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

	let character: Character;
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
	const rankIcon = rank?.icon && typeof rank.icon === 'object' ? rank.icon : null;
	const unit = typeof character.unit === 'object' ? character.unit : null;
	const unitInsignia = unit?.insignia && typeof unit.insignia === 'object' ? unit.insignia : null;
	const superior =
		typeof character.superiorOfficer === 'object' ? character.superiorOfficer : null;
	const avatar = character.avatar && typeof character.avatar === 'object' ? character.avatar : null;

	// Fetch factions for logo/color display
	const factionsResult = await payload
		.find({ collection: 'factions', limit: 100, depth: 1 })
		.catch(() => ({ docs: [] }));
	const factionObj: Faction | null | undefined = character.faction
		? factionsResult.docs.find(f => f.name === character.faction)
		: null;
	const targetFactionObj: Faction | null | undefined = character.targetFaction
		? factionsResult.docs.find(f => f.name === character.targetFaction)
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

	const orgColor =
		(character.isTarget
			? targetFactionObj?.color
			: unit?.color || factionObj?.color) || 'var(--primary)';

	return (
		<div
			className={`char-window ${character.isTarget ? 'char-window--target' : ''} ${character.isMainCharacter ? 'char-window--main' : ''}`}
			style={{ ['--org-color' as any]: orgColor } as React.CSSProperties}
		>
			<div className="char-window-grid-bg" aria-hidden />
			<div className="char-window-vignette" aria-hidden />
			<span className="char-window-rail" aria-hidden>
				{character.isTarget ? 'FICHE CIBLE' : 'DOSSIER PERSONNEL'} //{' '}
				{character.militaryId || 'CLASSIFIÉ'}
			</span>

			<div className="char-window-topbar">
				<Link href="/roleplay" className="char-window-back">
					<span aria-hidden>←</span>
					<span>Retour</span>
				</Link>
				<div className="char-window-tab">
					<span className="char-window-tab-num">
						{character.isTarget ? 'FT-' : 'DP-'}
						{(character.militaryId || '0000').toString().padStart(4, '0')}
					</span>
					<span className="char-window-tab-label">
						{character.isTarget ? 'FICHE CIBLE' : 'DOSSIER PERSONNEL'}
					</span>
				</div>
				<div className="char-window-topbar-right">
					{isAdmin && adminPermissions && (
						<span className="char-window-admin-pill" title={adminPermissions.roleName}>
							<span className="char-window-admin-dot" />
							ADMIN
						</span>
					)}
					<span className={`classification-badge ${character.classification}`}>
						{character.classification}
					</span>
				</div>
			</div>

			{/* Archived banner */}
			{character.isArchived && (
				<div className="archived-banner">
					DOSSIER ARCHIVÉ
					{character.archiveReason && <span> — {character.archiveReason}</span>}
				</div>
			)}

			<div
				className={`char-dossier ${character.isTarget ? 'char-dossier--target' : ''} ${character.isMainCharacter ? 'char-dossier--main' : ''}`}
			>
				<div className="char-dossier-hero">
					<div className="char-dossier-hero-photo">
						{avatar?.url ? (
							<Image
								src={avatar.url}
								alt={character.fullName || ''}
								width={160}
								height={200}
								unoptimized
							/>
						) : (
							<span className="char-dossier-hero-photo-initials">
								{character.firstName?.[0]}
								{character.lastName?.[0]}
							</span>
						)}
						<span className="char-dossier-hero-photo-corner tl" aria-hidden />
						<span className="char-dossier-hero-photo-corner tr" aria-hidden />
						<span className="char-dossier-hero-photo-corner bl" aria-hidden />
						<span className="char-dossier-hero-photo-corner br" aria-hidden />
					</div>
					<div className="char-dossier-hero-body">
						<div className="char-dossier-hero-meta">
							<span className="char-dossier-hero-tag">
								{character.isTarget ? 'CIBLE' : 'PERSONNEL'}
							</span>
							<span className="char-dossier-hero-divider" />
							<span className="char-dossier-hero-id">
								{character.militaryId || '— — —'}
							</span>
							<span className="char-dossier-hero-divider" />
							<span className="char-dossier-hero-classification">
								{character.classification}
							</span>
						</div>
						<h1 className="char-dossier-hero-title">
							<span className="char-dossier-hero-name">{character.fullName}</span>
							{character.isMainCharacter && (
								<span
									className="char-dossier-hero-star"
									title="Personnage principal"
								>
									★
								</span>
							)}
						</h1>
						<div className="char-dossier-hero-sub">
							{rank && (
								<span className="char-dossier-hero-rank">
									{rankIcon?.url && (
										<Image
											src={rankIcon.url}
											alt={rank.name}
											width={18}
											height={18}
											unoptimized
										/>
									)}
									{rank.name}
								</span>
							)}
							{unit && (
								<span
									className="char-dossier-hero-chip"
									style={{
										['--chip-color' as any]: unit.color || 'var(--primary)',
									}}
								>
									{unitInsignia?.url && (
										<Image
											src={unitInsignia.url}
											alt={unit.name}
											width={16}
											height={16}
											unoptimized
										/>
									)}
									{unit.name}
								</span>
							)}
							{factionObj && (
								<span
									className="char-dossier-hero-chip"
									style={{
										['--chip-color' as any]: factionObj.color || 'var(--primary)',
									}}
								>
									{factionObj.logo &&
										typeof factionObj.logo === 'object' &&
										(factionObj.logo as Media).url && (
											<Image
												src={(factionObj.logo as Media).url!}
												alt={factionObj.name}
												width={16}
												height={16}
												style={{ objectFit: 'contain' }}
												unoptimized
											/>
										)}
									{factionObj.name}
								</span>
							)}
							<span
								className={`char-dossier-hero-status char-dossier-hero-status--${character.status}`}
							>
								<span className="char-dossier-hero-status-dot" />
								{STATUS_LABELS[character.status] || character.status}
							</span>
						</div>
					</div>
					<span className="char-dossier-hero-corner tl" aria-hidden />
					<span className="char-dossier-hero-corner tr" aria-hidden />
					<span className="char-dossier-hero-corner bl" aria-hidden />
					<span className="char-dossier-hero-corner br" aria-hidden />
					{character.callsign && (
						<span className="char-dossier-hero-watermark" aria-hidden>
							{character.callsign}
						</span>
					)}
					{(canEdit || canDelete) && (
						<div className="char-dossier-hero-actions">
							{isOwner && <SyncRankButton characterId={character.id} />}
							{canEdit && (
								<Link
									href={`/roleplay/personnage/${character.id}/modifier`}
									className="session-btn"
								>
									Modifier
								</Link>
							)}
							{isAdmin && character.discordId && (
								<RequireImprovementsButton
									characterId={character.id}
									characterName={
										character.fullName ||
										`${character.firstName} ${character.lastName}`
									}
									alreadyFlagged={Boolean(
										(character as { requiresImprovements?: boolean })
											.requiresImprovements,
									)}
								/>
							)}
							{canDelete && (
								<DeleteCharacterButton
									characterId={character.id}
									characterName={
										character.fullName ||
										`${character.firstName} ${character.lastName}`
									}
								/>
							)}
						</div>
					)}
				</div>

				{(character as { requiresImprovements?: boolean }).requiresImprovements &&
					(isOwner || isAdmin) && (
						<div
							role="alert"
							style={{
								margin: '1.25rem 0 0.5rem',
								padding: '1rem 1.25rem',
								border: '1px solid #d4781e',
								background:
									'linear-gradient(90deg, rgba(212,120,30,0.18), rgba(212,120,30,0.04))',
								color: '#f5c38a',
								fontSize: '0.85rem',
								lineHeight: 1.55,
							}}
						>
							<div
								style={{
									fontWeight: 700,
									textTransform: 'uppercase',
									letterSpacing: '0.08em',
									marginBottom: '0.4rem',
									color: '#d4781e',
									fontSize: '0.75rem',
								}}
							>
								⚠ Améliorations requises sur ce dossier
							</div>
							{(character as { improvementReason?: string | null })
								.improvementReason && (
								<div
									style={{
										whiteSpace: 'pre-wrap',
										marginBottom: '0.5rem',
										fontStyle: 'italic',
										color: '#f5e3c8',
									}}
								>
									«{' '}
									{
										(character as { improvementReason?: string | null })
											.improvementReason
									}{' '}
									»
								</div>
							)}
							{(character as { improvementRequestedBy?: string | null })
								.improvementRequestedBy && (
								<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
									Demandé par{' '}
									<strong>
										{
											(character as { improvementRequestedBy?: string | null })
												.improvementRequestedBy
										}
									</strong>
									{(character as { improvementRequestedAt?: string | null })
										.improvementRequestedAt && (
										<>
											{' '}le{' '}
											{new Date(
												(character as { improvementRequestedAt: string })
													.improvementRequestedAt,
											).toLocaleDateString('fr-FR')}
										</>
									)}
								</div>
							)}
							{isOwner && (
								<div style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
									Modifiez votre fiche (photo + parcours civil et militaire
									d&apos;au moins 500 caractères chacun) pour revenir
									automatiquement au statut <strong>En service</strong>.
								</div>
							)}
						</div>
					)}

				<div className="character-detail">
					{/* Sidebar */}
					<div className="character-sidebar">
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
									{rankIcon?.url ? (
										<Image
											src={rankIcon!.url}
											alt={rank!.name}
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
									{unitInsignia?.url && (
										<Image
											src={unitInsignia.url}
											alt={unit!.name}
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
											color: factionObj?.color || 'inherit',
										}}
									>
										{factionObj?.logo && typeof factionObj.logo === 'object' && factionObj.logo.url && (
											<Image
												src={(factionObj!.logo as Media).url!}
												alt={character.faction || ''}
												width={18}
												height={18}
												style={{ objectFit: 'contain' }}
												unoptimized
											/>
										)}
										{factionObj?.slug ? (
											<Link
												href={`/roleplay/faction/${factionObj!.slug}`}
												style={{
													color: factionObj?.color || 'var(--primary)',
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
													color: targetFactionObj?.color || 'var(--danger)',
												}}
											>
												{targetFactionObj?.logo && typeof targetFactionObj.logo === 'object' && targetFactionObj.logo.url && (
													<Image
														src={(targetFactionObj!.logo as Media).url!}
														alt={character.targetFaction || ''}
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

						{(character.specialisations?.length ?? 0) > 0 && (
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
										{character.specialisations!.map((s: any, i: number) => (
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
									events={serialize(timeline.docs)}
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
