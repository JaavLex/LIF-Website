'use client';

import { DynamicIcon } from './DynamicIcon';

interface PresentationVideoProps {
	title: string;
	titleIcon: string;
	videoTitle?: string;
	link: string;
}

export function PresentationVideo({
	title,
	titleIcon,
	videoTitle,
	link,
}: PresentationVideoProps) {
	return (
		<section className="presentation-video-section">
			<div className="section-container">
				<h2 className="section-title">
					<span className="title-icon">
						<DynamicIcon name={titleIcon} size={32} />
					</span>
					{title}
				</h2>
				<div className="video-grid">
					<div className="video-card">
						<iframe
							src={link}
							title={videoTitle || 'Présentation de la LIF'}
							frameBorder="0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
							className="presentation-video-iframe"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
