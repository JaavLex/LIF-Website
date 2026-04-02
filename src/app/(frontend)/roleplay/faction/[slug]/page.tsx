import { getPayloadClient } from '@/lib/payload';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { RichTextRenderer } from '@/components/roleplay/RichTextRenderer';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
	allied: 'Alliée',
	neutral: 'Neutre',
	hostile: 'Hostile',
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

	const faction = factions.docs[0] as any;
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
					<span className="terminal-title">FICHE FACTION</span>
				</div>
				<div className="terminal-header-right">
					<span
						className={`status-badge ${faction.type === 'hostile' ? 'kia' : faction.type === 'allied' ? 'in-service' : 'mia'}`}
					>
						{TYPE_LABELS[faction.type] || 'Neutre'}
					</span>
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
					{faction.logo?.url && (
						<Image
							src={faction.logo.url}
							alt={faction.name}
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
								color: faction.color || 'var(--text)',
							}}
						>
							{faction.name}
						</h1>
						<p style={{ color: 'var(--muted)', margin: '0.25rem 0 0' }}>
							{TYPE_LABELS[faction.type] || 'Neutre'}
						</p>
					</div>
				</div>

				{faction.description && (
					<div style={{ marginBottom: '2rem' }}>
						<h3 style={{ color: 'var(--primary)' }}>Description</h3>
						<RichTextRenderer content={faction.description} />
					</div>
				)}

				{/* Units */}
				{units.docs.length > 0 && (
					<div style={{ marginBottom: '2rem' }}>
						<h3 style={{ color: 'var(--primary)' }}>Unités ({units.docs.length})</h3>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.5rem',
							}}
						>
							{units.docs.map((unit: any) => (
								<Link
									key={unit.id}
									href={`/roleplay/unite/${unit.slug}`}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.75rem',
										padding: '0.75rem 1rem',
										background: 'var(--bg-secondary)',
										border: '1px solid var(--border)',
										textDecoration: 'none',
										color: 'var(--text)',
										transition: 'border-color 0.2s',
									}}
								>
									{unit.insignia?.url && (
										<Image
											src={unit.insignia.url}
											alt={unit.name}
											width={28}
											height={28}
											style={{ objectFit: 'contain' }}
											unoptimized
										/>
									)}
									<div>
										<div
											style={{
												fontWeight: 600,
												color: unit.color || 'var(--text)',
											}}
										>
											{unit.name}
										</div>
										{unit.commander && typeof unit.commander === 'object' && (
											<div
												style={{
													fontSize: '0.75rem',
													color: 'var(--muted)',
												}}
											>
												Commandant: {unit.commander.fullName}
											</div>
										)}
									</div>
								</Link>
							))}
						</div>
					</div>
				)}

				{/* Characters in this faction */}
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

				{characters.docs.length === 0 && units.docs.length === 0 && (
					<p style={{ color: 'var(--muted)', textAlign: 'center' }}>
						Aucune donnée associée à cette faction.
					</p>
				)}
			</div>
		</div>
	);
}
