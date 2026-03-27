import { getPayloadClient } from '@/lib/payload';
import Link from 'next/link';
import Image from 'next/image';
import { RichTextRenderer } from '@/components/roleplay/RichTextRenderer';

export const dynamic = 'force-dynamic';

export default async function LorePage() {
	const payload = await getPayloadClient();

	let roleplayConfig: any = null;
	try {
		roleplayConfig = await payload.findGlobal({ slug: 'roleplay' });
	} catch {
		// Global may not exist yet
	}

	const loreBlocks = roleplayConfig?.loreSections || [];
	const timelineEvents = roleplayConfig?.timelineEvents || [];
	const showLore = roleplayConfig?.isLoreVisible !== false;

	if (!showLore) {
		return (
			<div className="terminal-container">
				<div className="terminal-panel" style={{ textAlign: 'center', padding: '4rem' }}>
					<h2 style={{ color: 'var(--muted)' }}>Section en cours de rédaction</h2>
					<p style={{ color: 'var(--muted)', marginTop: '1rem' }}>Le lore sera disponible prochainement.</p>
					<Link href="/roleplay" style={{ color: 'var(--primary)', marginTop: '1rem', display: 'inline-block' }}>
						← Retour à la base de données
					</Link>
				</div>
			</div>
		);
	}

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
					<span className="terminal-title">ARCHIVES — LORE & HISTORIQUE</span>
				</div>
				<div className="terminal-header-right">
					CLASSIFICATION: PUBLIC
				</div>
			</div>

			<div className="terminal-panel">
				<h1>LORE & HISTORIQUE</h1>

				{loreBlocks.map((block: any, index: number) => {
					switch (block.blockType) {
						case 'loreText':
							return (
								<div key={index} className="lore-section">
									{block.title && <h2>{block.title}</h2>}
									<div className="lore-text">
										<RichTextRenderer content={block.content} />
									</div>
								</div>
							);
						case 'loreBanner':
							return (
								<div key={index} className="lore-section">
									{block.image?.url && (
										<Image
											src={block.image.url}
											alt={block.caption || ''}
											width={1200}
											height={400}
											className="lore-banner"
											unoptimized
										/>
									)}
									{block.caption && (
										<p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
											{block.caption}
										</p>
									)}
								</div>
							);
						case 'loreGallery':
							return (
								<div key={index} className="lore-section">
									{block.title && <h2>{block.title}</h2>}
									<div className="lore-gallery">
										{block.images?.map((img: any, i: number) => (
											img.image?.url && (
												<Image
													key={i}
													src={img.image.url}
													alt={img.caption || ''}
													width={400}
													height={300}
													unoptimized
												/>
											)
										))}
									</div>
								</div>
							);
						default:
							return null;
					}
				})}

				{timelineEvents.length > 0 && (
					<>
						<h2 style={{ color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '3rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--primary)' }}>
							Chronologie
						</h2>
						<div className="timeline">
							{timelineEvents.map((event: any, index: number) => (
								<div key={index} className="timeline-item">
									<div className="timeline-date">
										{new Date(event.date).toLocaleDateString('fr-FR', {
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										})}
									</div>
									<div className="timeline-title">{event.title}</div>
									{event.description && (
										<div className="timeline-description">
											{event.description}
										</div>
									)}
								</div>
							))}
						</div>
					</>
				)}

				{loreBlocks.length === 0 && timelineEvents.length === 0 && (
					<div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
						Le lore n&apos;a pas encore été rédigé. Consultez cette page ultérieurement.
					</div>
				)}
			</div>
		</div>
	);
}
