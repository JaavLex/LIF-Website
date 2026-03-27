import { getPayloadClient } from '@/lib/payload';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { RichTextRenderer } from '@/components/roleplay/RichTextRenderer';
import { CharacterTimeline } from '@/components/roleplay/CharacterTimeline';

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

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
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

	if (!character || character.isArchived) notFound();

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
	const superior = typeof character.superiorOfficer === 'object' ? character.superiorOfficer : null;

	return (
		<div className="terminal-container">
			<Link href="/roleplay" style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'inline-block', marginBottom: '1rem' }}>
				← Retour à la base de données
			</Link>

			<div className="terminal-header">
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">DOSSIER PERSONNEL — {character.militaryId || 'N/A'}</span>
				</div>
				<div className="terminal-header-right">
					<span className={`classification-badge ${character.classification}`}>
						{character.classification}
					</span>
				</div>
			</div>

			<div className="terminal-panel">
				<h1>
					{rank && <>{rank.abbreviation || rank.name} </>}
					{character.fullName}
				</h1>

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
								{character.firstName?.[0]}{character.lastName?.[0]}
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
								<span className="info-value">{rank?.name || '—'}</span>
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
								<span className="info-value">{unit?.name || '—'}</span>
							</div>
							{character.faction && (
								<div className="info-row">
									<span className="info-label">Faction</span>
									<span className="info-value">{character.faction}</span>
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
										<Link href={`/roleplay/personnage/${superior.id}`} style={{ color: 'var(--primary)' }}>
											{superior.fullName}
										</Link>
									</span>
								</div>
							</div>
						)}

						{character.motto && (
							<div className="character-info-block">
								<h3>Devise</h3>
								<p style={{ fontStyle: 'italic', color: 'var(--accent)', textAlign: 'center', padding: '0.5rem 0' }}>
									&laquo; {character.motto} &raquo;
								</p>
							</div>
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
									<ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
										{character.specialisations.map((s: any, i: number) => (
											<li key={i} style={{
												padding: '0.25rem 0.75rem',
												border: '1px solid var(--primary)',
												fontSize: '0.85rem',
												color: 'var(--primary)',
											}}>
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

						{timeline.docs.length > 0 && (
							<div className="character-section">
								<h2>Historique</h2>
								<CharacterTimeline events={JSON.parse(JSON.stringify(timeline.docs))} />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
