import { getPayloadClient } from '@/lib/payload';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { RichTextRenderer } from '@/components/roleplay/RichTextRenderer';
import type { Faction, Unit, Character } from '@/payload-types';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
	allied: 'ALLIÉE',
	neutral: 'NEUTRE',
	hostile: 'HOSTILE',
};

const TYPE_CODES: Record<string, string> = {
	allied: 'A',
	neutral: 'N',
	hostile: 'H',
};

export default async function FactionPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const payload = await getPayloadClient();

	const factions = await payload.find({
		collection: 'factions',
		where: { slug: { equals: slug } },
		limit: 1,
		depth: 1,
	});

	const faction = factions.docs[0];
	if (!faction) notFound();

	// Fetch units belonging to this faction
	const units = await payload.find({
		collection: 'units',
		where: { parentFaction: { equals: faction.id } },
		limit: 100,
		depth: 2,
	});

	// Fetch characters in this faction
	const characters = await payload.find({
		collection: 'characters',
		where: {
			faction: { equals: faction.name },
			isArchived: { not_equals: true },
		},
		sort: '-createdAt',
		limit: 100,
		depth: 2,
	});

	const factionLogo =
		faction.logo && typeof faction.logo === 'object' ? faction.logo : null;
	const factionColor = faction.color || 'var(--primary)';
	const typeLabel =
		(faction.type && TYPE_LABELS[faction.type]) || 'NEUTRE';
	const typeCode = (faction.type && TYPE_CODES[faction.type]) || 'N';
	const isMain = (faction as any).isMainFaction;
	const mainUnits = units.docs.filter((u) => (u as any).isMain);
	const otherUnits = units.docs.filter((u) => !(u as any).isMain);

	return (
		<div className="terminal-container dossier-container">
			<div
				className={`dossier-shell type-${faction.type || 'neutral'}`}
				style={{ ['--dossier-color' as any]: factionColor }}
			>
				{/* Atmospheric layers */}
				<div className="dossier-grid-bg" aria-hidden />
				<div className="dossier-vignette" aria-hidden />
				<div className="dossier-rail" aria-hidden>
					<span>
						DOSSIER&nbsp;FACTION&nbsp;//&nbsp;{typeLabel}&nbsp;//&nbsp;LIF&nbsp;2026
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
							COMMANDEMENT&nbsp;LIF
						</span>
					)}
				</div>

				{/* Hero */}
				<header className="dossier-hero">
					<div className="dossier-hero-stamp" aria-hidden>
						<span className="dossier-hero-stamp-glyph">{typeCode}</span>
						<span className="dossier-hero-stamp-label">F-{String(faction.id).padStart(2, '0')}</span>
					</div>

					<div className="dossier-hero-meta">
						<div className="dossier-hero-eyebrow">
							<span className="dossier-hero-eyebrow-marker" />
							<span>FICHE&nbsp;FACTION&nbsp;//&nbsp;CLASSIFICATION&nbsp;{typeLabel}</span>
						</div>

						<h1 className="dossier-hero-title">
							<span className="dossier-hero-title-line dim">FACTION</span>
							<span className="dossier-hero-title-line accent">{faction.name}</span>
							<span className="dossier-hero-title-line muted">
								//&nbsp;{typeLabel}
							</span>
						</h1>

						<div className="dossier-hero-stats">
							<div className="dossier-stat">
								<span className="dossier-stat-num">{units.docs.length}</span>
								<span className="dossier-stat-label">UNITÉ{units.docs.length !== 1 ? 'S' : ''}</span>
							</div>
							<div className="dossier-stat-sep" aria-hidden />
							<div className="dossier-stat">
								<span className="dossier-stat-num">{characters.docs.length}</span>
								<span className="dossier-stat-label">EFFECTIF{characters.docs.length !== 1 ? 'S' : ''}</span>
							</div>
							<div className="dossier-stat-sep" aria-hidden />
							<div className="dossier-stat">
								<span className="dossier-stat-num">{mainUnits.length}</span>
								<span className="dossier-stat-label">FER&nbsp;DE&nbsp;LANCE</span>
							</div>
						</div>
					</div>

					<div className="dossier-hero-emblem">
						<div className="dossier-hero-emblem-frame">
							{factionLogo?.url ? (
								<Image
									src={factionLogo.url}
									alt={faction.name}
									width={130}
									height={130}
									style={{ objectFit: 'contain' }}
									unoptimized
								/>
							) : (
								<span>{faction.name.charAt(0)}</span>
							)}
							<span className="dossier-hero-emblem-corner tl" />
							<span className="dossier-hero-emblem-corner tr" />
							<span className="dossier-hero-emblem-corner bl" />
							<span className="dossier-hero-emblem-corner br" />
						</div>
					</div>
				</header>

				{/* Description */}
				{faction.description && (
					<section className="dossier-block">
						<div className="dossier-block-header">
							<span className="dossier-block-num">01</span>
							<span className="dossier-block-line" />
							<span className="dossier-block-title">DOCTRINE&nbsp;&amp;&nbsp;DOCTRINAIRE</span>
						</div>
						<div className="dossier-prose">
							<RichTextRenderer content={faction.description} />
						</div>
					</section>
				)}

				{/* Featured main units */}
				{mainUnits.length > 0 && (
					<section className="dossier-block">
						<div className="dossier-block-header">
							<span className="dossier-block-num">02</span>
							<span className="dossier-block-line" />
							<span className="dossier-block-title">FER&nbsp;DE&nbsp;LANCE</span>
							<span className="dossier-block-count">{mainUnits.length}</span>
						</div>
						<div className="dossier-units-featured">
							{mainUnits.map((unit, idx) => {
								const insignia =
									typeof unit.insignia === 'object' ? unit.insignia : null;
								const cmdr =
									unit.commander && typeof unit.commander === 'object'
										? unit.commander
										: null;
								const stamp = String(idx + 1).padStart(2, '0');
								return (
									<Link
										key={unit.id}
										href={`/roleplay/unite/${unit.slug}`}
										className="dossier-unit-feature"
										style={{
											['--unit-color' as any]: unit.color || factionColor,
										}}
									>
										<span className="dossier-unit-feature-stamp" aria-hidden>
											#{stamp}
										</span>
										<span
											className="dossier-unit-feature-watermark"
											aria-hidden
										>
											{unit.name}
										</span>
										<div className="dossier-unit-feature-insignia">
											{insignia?.url ? (
												<Image
													src={insignia.url}
													alt={unit.name}
													width={56}
													height={56}
													style={{ objectFit: 'contain' }}
													unoptimized
												/>
											) : (
												<span>{unit.name.charAt(0)}</span>
											)}
										</div>
										<div className="dossier-unit-feature-body">
											<div className="dossier-unit-feature-eyebrow">
												UNITÉ&nbsp;PRINCIPALE
											</div>
											<div className="dossier-unit-feature-name">
												{unit.name}
											</div>
											{cmdr && (
												<div className="dossier-unit-feature-cmdr">
													CMD &nbsp;·&nbsp; {cmdr.fullName}
												</div>
											)}
										</div>
										<span className="dossier-unit-feature-arrow" aria-hidden>
											→
										</span>
									</Link>
								);
							})}
						</div>
					</section>
				)}

				{/* Other units */}
				{otherUnits.length > 0 && (
					<section className="dossier-block">
						<div className="dossier-block-header">
							<span className="dossier-block-num">{mainUnits.length > 0 ? '03' : '02'}</span>
							<span className="dossier-block-line" />
							<span className="dossier-block-title">UNITÉS&nbsp;RATTACHÉES</span>
							<span className="dossier-block-count">{otherUnits.length}</span>
						</div>
						<div className="dossier-units-grid">
							{otherUnits.map((unit) => {
								const insignia =
									typeof unit.insignia === 'object' ? unit.insignia : null;
								const cmdr =
									unit.commander && typeof unit.commander === 'object'
										? unit.commander
										: null;
								return (
									<Link
										key={unit.id}
										href={`/roleplay/unite/${unit.slug}`}
										className="dossier-unit-card"
										style={{
											['--unit-color' as any]: unit.color || factionColor,
										}}
									>
										<div className="dossier-unit-card-insignia">
											{insignia?.url ? (
												<Image
													src={insignia.url}
													alt={unit.name}
													width={36}
													height={36}
													style={{ objectFit: 'contain' }}
													unoptimized
												/>
											) : (
												<span>{unit.name.charAt(0)}</span>
											)}
										</div>
										<div className="dossier-unit-card-body">
											<div className="dossier-unit-card-name">{unit.name}</div>
											<div className="dossier-unit-card-meta">
												{cmdr ? `CMD ${cmdr.fullName}` : 'UNITÉ'}
											</div>
										</div>
										<span className="dossier-unit-card-arrow" aria-hidden>
											›
										</span>
									</Link>
								);
							})}
						</div>
					</section>
				)}

				{/* Members */}
				{characters.docs.length > 0 && (
					<section className="dossier-block">
						<div className="dossier-block-header">
							<span className="dossier-block-num">
								{mainUnits.length > 0 && otherUnits.length > 0
									? '04'
									: mainUnits.length > 0 || otherUnits.length > 0
										? '03'
										: '02'}
							</span>
							<span className="dossier-block-line" />
							<span className="dossier-block-title">EFFECTIFS&nbsp;ENREGISTRÉS</span>
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

				{characters.docs.length === 0 && units.docs.length === 0 && (
					<section className="dossier-block">
						<div className="dossier-empty">
							<span className="dossier-empty-glyph" aria-hidden>
								◯
							</span>
							<span>Aucune donnée associée à cette faction.</span>
						</div>
					</section>
				)}

				{/* Footer signature */}
				<footer className="dossier-footer">
					<span className="dossier-footer-line" />
					<span className="dossier-footer-text">
						SCELLÉ&nbsp;//&nbsp;COMMANDEMENT&nbsp;LIF&nbsp;//&nbsp;DOSSIER&nbsp;F-{String(faction.id).padStart(4, '0')}
					</span>
					<span className="dossier-footer-line" />
				</footer>
			</div>
		</div>
	);
}
