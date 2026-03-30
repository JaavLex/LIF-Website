import { getPayloadClient } from '@/lib/payload';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { RichTextRenderer } from '@/components/roleplay/RichTextRenderer';
import { IntelMediaGallery } from '@/components/roleplay/IntelMediaGallery';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
	observation: 'Observation',
	interception: 'Interception',
	reconnaissance: 'Reconnaissance',
	infiltration: 'Infiltration',
	sigint: 'SIGINT',
	humint: 'HUMINT',
	other: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
	'to-investigate': 'À vérifier',
	verified: 'Vérifié',
	'false-info': 'Fausse info',
	inconclusive: 'Non concluant',
};

export default async function IntelReportPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const payload = await getPayloadClient();

	const reportId = parseInt(id, 10);
	if (isNaN(reportId)) notFound();

	let report: any;
	try {
		report = await payload.findByID({
			collection: 'intelligence',
			id: reportId,
			depth: 2,
		});
	} catch {
		notFound();
	}

	if (!report) notFound();

	const postedBy = typeof report.postedBy === 'object' ? report.postedBy : null;
	const linkedTarget = typeof report.linkedTarget === 'object' ? report.linkedTarget : null;
	const linkedFaction = typeof report.linkedFaction === 'object' ? report.linkedFaction : null;
	const media = (report.media || []).filter((m: any) => m.file?.url);

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

			<div className="terminal-header">
				<div className="terminal-header-left">
					<div className="terminal-header-dots">
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span className="terminal-title">
						RAPPORT DE RENSEIGNEMENT — #{report.id}
					</span>
				</div>
				<div className="terminal-header-right">
					<span className={`classification-badge ${report.classification}`}>
						{report.classification}
					</span>
				</div>
			</div>

			<div className="terminal-panel">
				{/* Header */}
				<div style={{ marginBottom: '1.5rem' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
						<span style={{ fontSize: '0.85rem', padding: '0.2rem 0.6rem', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
							{TYPE_LABELS[report.type] || report.type}
						</span>
						<span style={{
							fontSize: '0.8rem',
							padding: '0.2rem 0.5rem',
							border: '1px solid',
							borderColor: report.status === 'verified' ? 'var(--accent)' : report.status === 'false-info' ? 'var(--danger)' : 'var(--muted)',
							color: report.status === 'verified' ? 'var(--accent)' : report.status === 'false-info' ? 'var(--danger)' : 'var(--muted)',
						}}>
							{STATUS_LABELS[report.status] || report.status}
						</span>
					</div>
					<h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.6rem' }}>{report.title}</h1>
					<div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
						{new Date(report.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
						{postedBy && (
							<> — Rapporté par{' '}
								<Link href={`/roleplay/personnage/${postedBy.id}`} style={{ color: 'var(--primary)' }}>
									{postedBy.fullName}
								</Link>
							</>
						)}
					</div>
				</div>

				{/* Description */}
				<div style={{ marginBottom: '1.5rem', lineHeight: 1.7 }}>
					<h3 style={{ color: 'var(--primary)', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '0.75rem' }}>
						DESCRIPTION
					</h3>
					<div className="character-section-content">
						<RichTextRenderer content={report.description} />
					</div>
				</div>

				{/* Details grid */}
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
					{report.coordinates && (
						<div className="character-info-block" style={{ padding: '1rem' }}>
							<h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Coordonnées</h3>
							<span style={{ fontSize: '0.95rem' }}>{report.coordinates}</span>
						</div>
					)}
					{linkedTarget && (
						<div className="character-info-block" style={{ padding: '1rem' }}>
							<h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Cible liée</h3>
							<Link href={`/roleplay/personnage/${linkedTarget.id}`} style={{ color: 'var(--danger)', fontSize: '0.95rem' }}>
								{linkedTarget.fullName}
							</Link>
						</div>
					)}
					{linkedFaction && (
						<div className="character-info-block" style={{ padding: '1rem' }}>
							<h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Faction liée</h3>
							<span style={{ fontSize: '0.95rem' }}>{linkedFaction.name}</span>
						</div>
					)}
				</div>

				{/* Media gallery */}
				{media.length > 0 && (
					<div style={{ marginBottom: '1.5rem' }}>
						<h3 style={{ color: 'var(--primary)', fontSize: '0.9rem', letterSpacing: '1px', marginBottom: '0.75rem' }}>
							PIÈCES JOINTES ({media.length})
						</h3>
						<IntelMediaGallery media={media} />
					</div>
				)}
			</div>

			<div style={{ textAlign: 'center', padding: '1rem' }}>
				<Link href="/roleplay" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
					← Retour à la base de données
				</Link>
			</div>
		</div>
	);
}
