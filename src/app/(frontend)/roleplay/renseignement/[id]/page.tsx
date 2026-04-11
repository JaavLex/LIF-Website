import { getPayloadClient } from '@/lib/payload';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FileText, MapPin, Crosshair, Flag, User, Calendar, Map as MapIcon, ArrowRight } from 'lucide-react';
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
	const linkedTarget =
		typeof report.linkedTarget === 'object' ? report.linkedTarget : null;
	const linkedFaction =
		typeof report.linkedFaction === 'object' ? report.linkedFaction : null;
	const media = (report.media || []).filter((m: any) => m.file?.url);

	// Parse coordinates (format: "XXXXX / ZZZZZ") for map deep-link
	const coordMatch = report.coordinates?.match(/^(\d{3,5})\s*\/\s*(\d{3,5})$/);
	const mapCoords = coordMatch
		? { x: parseInt(coordMatch[1], 10), z: parseInt(coordMatch[2], 10) }
		: null;

	const dateStr = new Date(report.date).toLocaleDateString('fr-FR', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	return (
		<div className="terminal-container">
			<Link href="/roleplay" className="retour-link">
				← Retour à la base de données
			</Link>

			<div
				className="intel-detail"
				data-classification={report.classification}
			>
				{/* Hero */}
				<div className="intel-detail-hero">
					<div className="intel-detail-hero-bg" aria-hidden />
					<div className="intel-detail-hero-grain" aria-hidden />
					<div className="intel-detail-hero-content">
						<div className="intel-detail-icon">
							<FileText size={30} strokeWidth={1.4} />
						</div>
						<div className="intel-detail-head">
							<div className="intel-detail-top">
								<span className="intel-detail-id">
									RAPPORT #{String(report.id).padStart(4, '0')}
								</span>
								<span className="intel-detail-sep">·</span>
								<span className="intel-detail-classification">
									{report.classification}
								</span>
							</div>
							<h1 className="intel-detail-title">{report.title}</h1>
							<div className="intel-detail-tags">
								<span className="intel-detail-tag tag-type">
									{TYPE_LABELS[report.type] || report.type}
								</span>
								<span
									className={`intel-detail-tag tag-status status-${report.status}`}
								>
									{STATUS_LABELS[report.status] || report.status}
								</span>
							</div>
						</div>
					</div>
					<div className="intel-detail-watermark" aria-hidden>
						INTEL
					</div>
				</div>

				{/* Meta strip */}
				<div className="intel-detail-meta">
					<div className="intel-detail-meta-item">
						<Calendar size={13} strokeWidth={1.6} />
						<span className="intel-detail-meta-label">Date</span>
						<span className="intel-detail-meta-value">{dateStr}</span>
					</div>
					{postedBy && (
						<div className="intel-detail-meta-item">
							<User size={13} strokeWidth={1.6} />
							<span className="intel-detail-meta-label">Rapporté par</span>
							<Link
								href={`/roleplay/personnage/${postedBy.id}`}
								className="intel-detail-meta-value intel-detail-link"
							>
								{postedBy.fullName}
							</Link>
						</div>
					)}
					{report.coordinates && (
						<div className="intel-detail-meta-item">
							<MapPin size={13} strokeWidth={1.6} />
							<span className="intel-detail-meta-label">Coordonnées</span>
							<span className="intel-detail-meta-value mono">
								{report.coordinates}
							</span>
						</div>
					)}
					{mapCoords && (
						<Link
							href={`/roleplay/map?focus=${mapCoords.x},${mapCoords.z}&label=${encodeURIComponent(report.title)}`}
							className="intel-detail-map-cta"
							aria-label="Voir la position de ce rapport sur la carte tactique"
						>
							<span className="intel-detail-map-cta-glow" aria-hidden />
							<span className="intel-detail-map-cta-icon" aria-hidden>
								<MapIcon size={15} strokeWidth={1.8} />
							</span>
							<span className="intel-detail-map-cta-text">
								<span className="intel-detail-map-cta-code">CMD-04 // TACTIQUE</span>
								<span className="intel-detail-map-cta-label">
									Voir sur la carte
								</span>
							</span>
							<span className="intel-detail-map-cta-coords">
								{String(mapCoords.x).padStart(5, '0')} / {String(mapCoords.z).padStart(5, '0')}
							</span>
							<span className="intel-detail-map-cta-arrow" aria-hidden>
								<ArrowRight size={14} strokeWidth={2} />
							</span>
						</Link>
					)}
					{linkedTarget && (
						<div className="intel-detail-meta-item">
							<Crosshair size={13} strokeWidth={1.6} />
							<span className="intel-detail-meta-label">Cible</span>
							<Link
								href={`/roleplay/personnage/${linkedTarget.id}`}
								className="intel-detail-meta-value intel-detail-link danger"
							>
								{linkedTarget.fullName}
							</Link>
						</div>
					)}
					{linkedFaction && (
						<div className="intel-detail-meta-item">
							<Flag size={13} strokeWidth={1.6} />
							<span className="intel-detail-meta-label">Faction</span>
							<span className="intel-detail-meta-value">
								{linkedFaction.name}
							</span>
						</div>
					)}
				</div>

				{/* Description */}
				<section className="intel-detail-section">
					<h2 className="intel-detail-section-title">
						<span className="intel-detail-section-bar" />
						Description
					</h2>
					<div className="intel-detail-description">
						<RichTextRenderer content={report.description} />
					</div>
				</section>

				{/* Media */}
				{media.length > 0 && (
					<section className="intel-detail-section">
						<h2 className="intel-detail-section-title">
							<span className="intel-detail-section-bar" />
							Pièces jointes
							<span className="intel-detail-section-count">{media.length}</span>
						</h2>
						<IntelMediaGallery media={media} />
					</section>
				)}
			</div>

			<div style={{ textAlign: 'center', padding: '1rem' }}>
				<Link href="/roleplay" className="retour-link">
					← Retour à la base de données
				</Link>
			</div>
		</div>
	);
}
