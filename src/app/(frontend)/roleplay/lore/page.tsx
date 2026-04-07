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
			<div className="lore-window">
				<div className="lore-window-grid-bg" aria-hidden />
				<div className="lore-window-vignette" aria-hidden />
				<div className="lore-window-topbar">
					<Link href="/roleplay" className="lore-window-back">
						<span aria-hidden>←</span>
						<span>Retour</span>
					</Link>
				</div>
				<div className="lore-empty">
					<div className="lore-empty-glyph" aria-hidden>
						§
					</div>
					<h2 className="lore-empty-title">ARCHIVES VERROUILLÉES</h2>
					<p className="lore-empty-text">
						Le lore est en cours de rédaction. Revenez prochainement.
					</p>
				</div>
			</div>
		);
	}

	let chapterNum = 0;

	return (
		<div className="lore-window">
			<div className="lore-window-grid-bg" aria-hidden />
			<div className="lore-window-vignette" aria-hidden />
			<span className="lore-window-rail" aria-hidden>
				ARCHIVES // LORE & HISTORIQUE
			</span>

			<div className="lore-window-topbar">
				<Link href="/roleplay" className="lore-window-back">
					<span aria-hidden>←</span>
					<span>Retour</span>
				</Link>
				<div className="lore-window-tab">
					<span className="lore-window-tab-num">AR-001</span>
					<span className="lore-window-tab-label">ARCHIVES</span>
				</div>
				<div className="lore-window-topbar-right">
					<span className="classification-badge public">PUBLIC</span>
				</div>
			</div>

			<header className="lore-masthead">
				<div className="lore-masthead-eyebrow">
					<span className="lore-masthead-marker" aria-hidden />
					Dossier d&apos;archives — Volume I
				</div>
				<h1 className="lore-masthead-title">
					<span className="lore-masthead-title-line">Lore</span>
					<span className="lore-masthead-title-line accent">&amp;</span>
					<span className="lore-masthead-title-line">Historique</span>
				</h1>
				<div className="lore-masthead-meta">
					<span>{loreBlocks.length} sections</span>
					<span className="lore-masthead-divider" />
					<span>{timelineEvents.length} entrées chronologiques</span>
				</div>
			</header>

			<div className="lore-stream">
				{loreBlocks.map((block: any, index: number) => {
					switch (block.blockType) {
						case 'loreText': {
							chapterNum += 1;
							return (
								<section key={index} className="lore-section lore-section--text">
									<div className="lore-section-marker">
										<span className="lore-section-marker-symbol">§</span>
										<span className="lore-section-marker-num">
											{String(chapterNum).padStart(2, '0')}
										</span>
									</div>
									<div className="lore-section-body">
										{block.title && (
											<h2 className="lore-section-title">{block.title}</h2>
										)}
										<div className="lore-text">
											<RichTextRenderer content={block.content} />
										</div>
									</div>
								</section>
							);
						}
						case 'loreBanner':
							return (
								<figure key={index} className="lore-banner-figure">
									{block.image?.url && (
										<div className="lore-banner-frame">
											<Image
												src={block.image.url}
												alt={block.caption || ''}
												width={1600}
												height={500}
												className="lore-banner"
												unoptimized
											/>
											<span className="lore-banner-corner tl" aria-hidden />
											<span className="lore-banner-corner tr" aria-hidden />
											<span className="lore-banner-corner bl" aria-hidden />
											<span className="lore-banner-corner br" aria-hidden />
										</div>
									)}
									{block.caption && (
										<figcaption className="lore-banner-caption">
											<span className="lore-banner-caption-marker" aria-hidden />
											{block.caption}
										</figcaption>
									)}
								</figure>
							);
						case 'loreGallery': {
							chapterNum += 1;
							return (
								<section key={index} className="lore-section lore-section--gallery">
									<div className="lore-section-marker">
										<span className="lore-section-marker-symbol">§</span>
										<span className="lore-section-marker-num">
											{String(chapterNum).padStart(2, '0')}
										</span>
									</div>
									<div className="lore-section-body">
										{block.title && (
											<h2 className="lore-section-title">{block.title}</h2>
										)}
										<div className="lore-gallery">
											{block.images?.map(
												(img: any, i: number) =>
													img.image?.url && (
														<figure key={i} className="lore-gallery-item">
															<div className="lore-gallery-frame">
																<Image
																	src={img.image.url}
																	alt={img.caption || ''}
																	width={600}
																	height={450}
																	unoptimized
																/>
																<span
																	className="lore-gallery-corner tl"
																	aria-hidden
																/>
																<span
																	className="lore-gallery-corner br"
																	aria-hidden
																/>
															</div>
															{img.caption && (
																<figcaption className="lore-gallery-caption">
																	{img.caption}
																</figcaption>
															)}
														</figure>
													),
											)}
										</div>
									</div>
								</section>
							);
						}
						default:
							return null;
					}
				})}

				{timelineEvents.length > 0 && (
					<section className="lore-section lore-section--timeline">
						<div className="lore-section-marker">
							<span className="lore-section-marker-symbol">⌖</span>
							<span className="lore-section-marker-num">CHR</span>
						</div>
						<div className="lore-section-body">
							<h2 className="lore-section-title">Chronologie</h2>
							<ol className="lore-timeline">
								{timelineEvents.map((event: any, index: number) => {
									const date = new Date(event.date);
									const day = date.toLocaleDateString('fr-FR', {
										day: '2-digit',
									});
									const month = date.toLocaleDateString('fr-FR', {
										month: 'short',
									});
									const year = date.toLocaleDateString('fr-FR', {
										year: 'numeric',
									});
									return (
										<li key={index} className="lore-timeline-entry">
											<div className="lore-timeline-stamp" aria-hidden>
												<span className="lore-timeline-stamp-year">{year}</span>
												<span className="lore-timeline-stamp-day">{day}</span>
												<span className="lore-timeline-stamp-month">{month}</span>
											</div>
											<div className="lore-timeline-rail" aria-hidden>
												<span className="lore-timeline-node" />
											</div>
											<article className="lore-timeline-card">
												<header className="lore-timeline-card-header">
													<span className="lore-timeline-index">
														№ {String(index + 1).padStart(3, '0')}
													</span>
												</header>
												<h4 className="lore-timeline-title">{event.title}</h4>
												{event.description && (
													<p className="lore-timeline-description">
														{event.description}
													</p>
												)}
											</article>
										</li>
									);
								})}
							</ol>
						</div>
					</section>
				)}

				{loreBlocks.length === 0 && timelineEvents.length === 0 && (
					<div className="lore-empty">
						<div className="lore-empty-glyph" aria-hidden>
							§
						</div>
						<h2 className="lore-empty-title">PAGES BLANCHES</h2>
						<p className="lore-empty-text">
							Le lore n&apos;a pas encore été rédigé. Consultez cette page
							ultérieurement.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
