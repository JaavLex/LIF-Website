import { getPayloadClient } from '@/lib/payload';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { RichTextRenderer } from '@/components/roleplay/RichTextRenderer';

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

	const unit = units.docs[0] as any;
	if (!unit) notFound();

	const parentFaction =
		typeof unit.parentFaction === 'object' ? unit.parentFaction : null;
	const commander = typeof unit.commander === 'object' ? unit.commander : null;

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
		<div className="terminal-container">
			<Link href="/roleplay" className="retour-link">
				← Retour à la base de données
			</Link>

			<div className="terminal-header">
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">FICHE UNITÉ</span>
				</div>
				<div className="terminal-header-right">
					{parentFaction && (
						<Link
							href={`/roleplay/faction/${parentFaction.slug}`}
							style={{
								color: parentFaction.color || 'var(--muted)',
								textDecoration: 'none',
								fontSize: '0.85rem',
								display: 'flex',
								alignItems: 'center',
								gap: '0.35rem',
							}}
						>
							{parentFaction.logo?.url && (
								<Image
									src={parentFaction.logo.url}
									alt={parentFaction.name}
									width={18}
									height={18}
									style={{ objectFit: 'contain' }}
									unoptimized
								/>
							)}
							{parentFaction.name}
						</Link>
					)}
				</div>
			</div>

			<div className="terminal-panel">
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '1.5rem',
						marginBottom: '2rem',
					}}
				>
					{unit.insignia?.url && (
						<Image
							src={unit.insignia.url}
							alt={unit.name}
							width={80}
							height={80}
							style={{ objectFit: 'contain' }}
							unoptimized
						/>
					)}
					<div>
						<h1
							style={{
								margin: 0,
								color: unit.color || 'var(--text)',
							}}
						>
							{unit.name}
						</h1>
						{parentFaction && (
							<p style={{ color: 'var(--muted)', margin: '0.25rem 0 0' }}>
								Faction:{' '}
								<Link
									href={`/roleplay/faction/${parentFaction.slug}`}
									style={{ color: parentFaction.color || 'var(--primary)' }}
								>
									{parentFaction.name}
								</Link>
							</p>
						)}
					</div>
				</div>

				{/* Info block */}
				<div className="character-info-block" style={{ marginBottom: '2rem' }}>
					<h3>Informations</h3>
					{commander && (
						<div className="info-row">
							<span className="info-label">Commandant</span>
							<span className="info-value">
								<Link
									href={`/roleplay/personnage/${commander.id}`}
									style={{
										color: 'var(--primary)',
										display: 'flex',
										alignItems: 'center',
										gap: '0.35rem',
									}}
								>
									{commander.rank &&
										typeof commander.rank === 'object' &&
										commander.rank.icon?.url && (
											<Image
												src={commander.rank.icon.url}
												alt={commander.rank.name}
												width={18}
												height={18}
												unoptimized
											/>
										)}
									{commander.fullName}
								</Link>
							</span>
						</div>
					)}
					{parentFaction && (
						<div className="info-row">
							<span className="info-label">Faction</span>
							<span
								className="info-value"
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.35rem',
									color: parentFaction.color || 'inherit',
								}}
							>
								{parentFaction.logo?.url && (
									<Image
										src={parentFaction.logo.url}
										alt={parentFaction.name}
										width={18}
										height={18}
										style={{ objectFit: 'contain' }}
										unoptimized
									/>
								)}
								<Link
									href={`/roleplay/faction/${parentFaction.slug}`}
									style={{ color: parentFaction.color || 'var(--primary)' }}
								>
									{parentFaction.name}
								</Link>
							</span>
						</div>
					)}
				</div>

				{unit.description && (
					<div style={{ marginBottom: '2rem' }}>
						<h3 style={{ color: 'var(--primary)' }}>Description</h3>
						<RichTextRenderer content={unit.description} />
					</div>
				)}

				{/* Members */}
				{characters.docs.length > 0 && (
					<div>
						<h3 style={{ color: 'var(--primary)' }}>
							Membres ({characters.docs.length})
						</h3>
						<div className="personnel-grid">
							{characters.docs.map((character: any) => {
								const rank =
									typeof character.rank === 'object' ? character.rank : null;
								return (
									<Link
										key={character.id}
										href={`/roleplay/personnage/${character.id}`}
										className="personnel-card"
									>
										<div className="personnel-card-header">
											{character.avatar?.url ? (
												<Image
													src={character.avatar.url}
													alt={character.fullName}
													width={64}
													height={64}
													className="personnel-avatar"
													unoptimized
												/>
											) : (
												<div className="personnel-avatar-placeholder">
													{character.firstName?.[0]}
													{character.lastName?.[0]}
												</div>
											)}
											<div className="personnel-info">
												<div className="personnel-name">{character.fullName}</div>
												{rank && (
													<div
														className="personnel-rank"
														style={{
															display: 'flex',
															alignItems: 'center',
															gap: '0.35rem',
														}}
													>
														{rank.icon?.url && (
															<Image
																src={rank.icon.url}
																alt={rank.name}
																width={18}
																height={18}
																unoptimized
															/>
														)}
														<span>{rank.abbreviation || rank.name}</span>
													</div>
												)}
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					</div>
				)}

				{characters.docs.length === 0 && (
					<p style={{ color: 'var(--muted)', textAlign: 'center' }}>
						Aucun membre dans cette unité.
					</p>
				)}
			</div>
		</div>
	);
}
