import { getPayloadClient } from '@/lib/payload';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { RichTextRenderer } from '@/components/roleplay/RichTextRenderer';
import type { Unit, Character, Faction, Media } from '@/payload-types';

export const dynamic = 'force-dynamic';

export default async function UnitPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const payload = await getPayloadClient();

	const units = await payload.find({
		collection: 'units',
		where: { slug: { equals: slug } },
		limit: 1,
		depth: 2,
	});

	const unit = units.docs[0];
	if (!unit) notFound();

	const parentFaction =
		typeof unit.parentFaction === 'object' ? unit.parentFaction : null;
	const parentFactionLogo =
		parentFaction?.logo && typeof parentFaction.logo === 'object'
			? parentFaction.logo
			: null;
	const commander = typeof unit.commander === 'object' ? unit.commander : null;
	const commanderRank =
		commander?.rank && typeof commander.rank === 'object' ? commander.rank : null;
	const commanderRankIcon =
		commanderRank?.icon && typeof commanderRank.icon === 'object'
			? commanderRank.icon
			: null;
	const unitInsignia =
		unit.insignia && typeof unit.insignia === 'object' ? unit.insignia : null;
	const unitColor = unit.color || 'var(--primary)';
	const isMain = (unit as any).isMain;
	const tagline = (unit as any).selectorTagline as string | null | undefined;
	const pitch = (unit as any).selectorPitch as string | null | undefined;
	const traits = ((unit as any).selectorTraits || []) as Array<{
		id?: string;
		label: string;
	}>;

	// Fetch characters in this unit
	const characters = await payload.find({
		collection: 'characters',
		where: {
			unit: { equals: unit.id },
			isArchived: { not_equals: true },
		},
		sort: '-createdAt',
		limit: 100,
		depth: 2,
	});

	return (
		<div className="terminal-container dossier-container">
			<div
				className="dossier-shell dossier-shell-unit"
				style={{ ['--dossier-color' as any]: unitColor }}
			>
				<div className="dossier-grid-bg" aria-hidden />
				<div className="dossier-vignette" aria-hidden />
				<div className="dossier-rail" aria-hidden>
					<span>
						DOSSIER&nbsp;UNITÉ&nbsp;//&nbsp;
						{(parentFaction?.name || 'INDÉPENDANTE').toUpperCase()}
						&nbsp;//&nbsp;LIF&nbsp;2026
					</span>
				</div>

				{/* Back nav */}
				<div className="dossier-back-row">
					<Link href="/roleplay" className="dossier-back-link">
						<span aria-hidden>←</span>
						<span>Retour à la base de données</span>
					</Link>
					{isMain && (
						<span className="dossier-pill dossier-pill-main">
							<span className="dossier-pill-dot" />
							FER&nbsp;DE&nbsp;LANCE
						</span>
					)}
				</div>

				{/* Hero */}
				<header className="dossier-hero">
					<div className="dossier-hero-stamp" aria-hidden>
						<span className="dossier-hero-stamp-glyph">U</span>
						<span className="dossier-hero-stamp-label">
							U-{String(unit.id).padStart(2, '0')}
						</span>
					</div>

					<div className="dossier-hero-meta">
						<div className="dossier-hero-eyebrow">
							<span className="dossier-hero-eyebrow-marker" />
							<span>
								FICHE&nbsp;UNITÉ&nbsp;//&nbsp;
								{isMain ? 'UNITÉ PRINCIPALE' : 'UNITÉ RATTACHÉE'}
							</span>
						</div>

						<h1 className="dossier-hero-title">
							<span className="dossier-hero-title-line dim">UNITÉ</span>
							<span className="dossier-hero-title-line accent">{unit.name}</span>
							{tagline ? (
								<span className="dossier-hero-title-line muted italic">
									«&nbsp;{tagline}&nbsp;»
								</span>
							) : (
								parentFaction && (
									<span className="dossier-hero-title-line muted">
										//&nbsp;{parentFaction.name.toUpperCase()}
									</span>
								)
							)}
						</h1>

						<div className="dossier-hero-stats">
							<div className="dossier-stat">
								<span className="dossier-stat-num">
									{characters.docs.length}
								</span>
								<span className="dossier-stat-label">
									EFFECTIF{characters.docs.length !== 1 ? 'S' : ''}
								</span>
							</div>
							{commander && (
								<>
									<div className="dossier-stat-sep" aria-hidden />
									<div className="dossier-stat">
										<span className="dossier-stat-num">01</span>
										<span className="dossier-stat-label">CMD&nbsp;ACTIF</span>
									</div>
								</>
							)}
							{traits.length > 0 && (
								<>
									<div className="dossier-stat-sep" aria-hidden />
									<div className="dossier-stat">
										<span className="dossier-stat-num">{traits.length}</span>
										<span className="dossier-stat-label">DOCTRINES</span>
									</div>
								</>
							)}
						</div>
					</div>

					<div className="dossier-hero-emblem">
						<div className="dossier-hero-emblem-frame">
							{unitInsignia?.url ? (
								<Image
									src={unitInsignia.url}
									alt={unit.name}
									width={130}
									height={130}
									style={{ objectFit: 'contain' }}
									unoptimized
								/>
							) : (
								<span>{unit.name.charAt(0)}</span>
							)}
							<span className="dossier-hero-emblem-corner tl" />
							<span className="dossier-hero-emblem-corner tr" />
							<span className="dossier-hero-emblem-corner bl" />
							<span className="dossier-hero-emblem-corner br" />
						</div>
					</div>
				</header>

				{/* Pitch / Doctrines panel */}
				{(pitch || traits.length > 0) && (
					<section className="dossier-block">
						<div className="dossier-block-header">
							<span className="dossier-block-num">01</span>
							<span className="dossier-block-line" />
							<span className="dossier-block-title">PROFIL&nbsp;DOCTRINAL</span>
						</div>
						<div className="dossier-doctrine">
							{pitch && <p className="dossier-doctrine-pitch">{pitch}</p>}
							{traits.length > 0 && (
								<ul className="dossier-doctrine-traits">
									{traits.map((t, i) => (
										<li key={t.id || i}>
											<span className="dossier-doctrine-bullet" aria-hidden>
												▸
											</span>
											<span>{t.label}</span>
										</li>
									))}
								</ul>
							)}
						</div>
					</section>
				)}

				{/* Command panel */}
				<section className="dossier-block">
					<div className="dossier-block-header">
						<span className="dossier-block-num">{pitch || traits.length > 0 ? '02' : '01'}</span>
						<span className="dossier-block-line" />
						<span className="dossier-block-title">CHAÎNE&nbsp;DE&nbsp;COMMANDEMENT</span>
					</div>
					<div className="dossier-command-grid">
						<div className="dossier-info-cell">
							<span className="dossier-info-label">FACTION</span>
							{parentFaction ? (
								<Link
									href={`/roleplay/faction/${parentFaction.slug}`}
									className="dossier-info-value linkish"
									style={{
										['--unit-color' as any]:
											parentFaction.color || unitColor,
									}}
								>
									{parentFactionLogo?.url && (
										<Image
											src={parentFactionLogo.url}
											alt={parentFaction.name}
											width={20}
											height={20}
											style={{ objectFit: 'contain' }}
											unoptimized
										/>
									)}
									<span>{parentFaction.name}</span>
								</Link>
							) : (
								<span className="dossier-info-value">— Indépendante —</span>
							)}
						</div>

						<div className="dossier-info-cell">
							<span className="dossier-info-label">COMMANDANT</span>
							{commander ? (
								<Link
									href={`/roleplay/personnage/${commander.id}`}
									className="dossier-info-value linkish"
								>
									{commanderRankIcon?.url && (
										<Image
											src={commanderRankIcon.url}
											alt={commanderRank?.name || ''}
											width={18}
											height={18}
											unoptimized
										/>
									)}
									<span>{commander.fullName}</span>
								</Link>
							) : (
								<span className="dossier-info-value">— Vacant —</span>
							)}
						</div>

						<div className="dossier-info-cell">
							<span className="dossier-info-label">EFFECTIFS</span>
							<span className="dossier-info-value">
								{characters.docs.length} membre
								{characters.docs.length !== 1 ? 's' : ''}
							</span>
						</div>

						<div className="dossier-info-cell">
							<span className="dossier-info-label">STATUT</span>
							<span className="dossier-info-value">
								<span className="dossier-info-dot" />
								OPÉRATIONNEL
							</span>
						</div>
					</div>
				</section>

				{/* Description */}
				{unit.description && (
					<section className="dossier-block">
						<div className="dossier-block-header">
							<span className="dossier-block-num">
								{(pitch || traits.length > 0 ? 1 : 0) + 2}
							</span>
							<span className="dossier-block-line" />
							<span className="dossier-block-title">HISTORIQUE&nbsp;OPÉRATIONNEL</span>
						</div>
						<div className="dossier-prose">
							<RichTextRenderer content={unit.description} />
						</div>
					</section>
				)}

				{/* Members */}
				{characters.docs.length > 0 && (
					<section className="dossier-block">
						<div className="dossier-block-header">
							<span className="dossier-block-num">
								{(pitch || traits.length > 0 ? 1 : 0) +
									(unit.description ? 1 : 0) +
									2}
							</span>
							<span className="dossier-block-line" />
							<span className="dossier-block-title">EFFECTIFS&nbsp;DE&nbsp;L&apos;UNITÉ</span>
							<span className="dossier-block-count">{characters.docs.length}</span>
						</div>
						<div className="dossier-roster-grid">
							{characters.docs.map((character) => {
								const rank =
									typeof character.rank === 'object' ? character.rank : null;
								const avatar =
									typeof character.avatar === 'object' ? character.avatar : null;
								const rankIcon =
									rank?.icon && typeof rank.icon === 'object' ? rank.icon : null;
								return (
									<Link
										key={character.id}
										href={`/roleplay/personnage/${character.id}`}
										className="dossier-roster-card"
									>
										<div className="dossier-roster-avatar">
											{avatar?.url ? (
												<Image
													src={avatar.url}
													alt={character.fullName || ''}
													width={56}
													height={56}
													style={{ objectFit: 'cover' }}
													unoptimized
												/>
											) : (
												<span>
													{character.firstName?.[0]}
													{character.lastName?.[0]}
												</span>
											)}
										</div>
										<div className="dossier-roster-body">
											<div className="dossier-roster-name">
												{character.fullName}
											</div>
											{rank && (
												<div className="dossier-roster-rank">
													{rankIcon?.url && (
														<Image
															src={rankIcon.url}
															alt={rank.name}
															width={14}
															height={14}
															unoptimized
														/>
													)}
													<span>{rank.abbreviation || rank.name}</span>
												</div>
											)}
										</div>
									</Link>
								);
							})}
						</div>
					</section>
				)}

				{characters.docs.length === 0 && (
					<section className="dossier-block">
						<div className="dossier-empty">
							<span className="dossier-empty-glyph" aria-hidden>
								◯
							</span>
							<span>Aucun membre dans cette unité.</span>
						</div>
					</section>
				)}

				{/* Footer signature */}
				<footer className="dossier-footer">
					<span className="dossier-footer-line" />
					<span className="dossier-footer-text">
						SCELLÉ&nbsp;//&nbsp;COMMANDEMENT&nbsp;LIF&nbsp;//&nbsp;DOSSIER&nbsp;U-{String(unit.id).padStart(4, '0')}
					</span>
					<span className="dossier-footer-line" />
				</footer>
			</div>
		</div>
	);
}
