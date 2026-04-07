'use client';

import { useState } from 'react';

const TYPE_LABELS: Record<string, string> = {
	promotion: 'Promotion',
	mutation: 'Mutation',
	wound: 'Blessure',
	mission: 'Mission',
	disciplinary: 'Disciplinaire',
	medal: 'Décoration',
	training: 'Formation',
	other: 'Autre',
};

// Short stencil glyph + tone class
const TYPE_META: Record<string, { glyph: string; tone: string }> = {
	promotion: { glyph: '↑', tone: 'tone-accent' },
	mutation: { glyph: '⇄', tone: 'tone-primary' },
	wound: { glyph: '✚', tone: 'tone-danger' },
	mission: { glyph: '◆', tone: 'tone-primary' },
	disciplinary: { glyph: '!', tone: 'tone-danger' },
	medal: { glyph: '★', tone: 'tone-gold' },
	training: { glyph: '◎', tone: 'tone-primary' },
	other: { glyph: '·', tone: 'tone-muted' },
};

interface TimelineEvent {
	id: number;
	type: string;
	title: string;
	description?: any;
	date: string;
}

export function CharacterTimeline({
	events,
	isAdmin,
}: {
	events: TimelineEvent[];
	isAdmin?: boolean;
}) {
	const [deleting, setDeleting] = useState<number | null>(null);

	const handleDelete = async (eventId: number) => {
		if (!confirm('Supprimer cet événement ?')) return;
		setDeleting(eventId);
		try {
			const res = await fetch(`/api/roleplay/timeline?id=${eventId}`, {
				method: 'DELETE',
			});
			if (res.ok) {
				window.location.reload();
			}
		} catch {
			/* ignore */
		} finally {
			setDeleting(null);
		}
	};

	return (
		<ol className="char-timeline">
			{events.map((event, idx) => {
				const meta = TYPE_META[event.type] || TYPE_META.other;
				const date = new Date(event.date);
				const day = date.toLocaleDateString('fr-FR', { day: '2-digit' });
				const month = date.toLocaleDateString('fr-FR', { month: 'short' });
				const year = date.toLocaleDateString('fr-FR', { year: 'numeric' });
				return (
					<li
						key={event.id}
						className={`char-timeline-entry ${event.type} ${meta.tone}`}
					>
						<div className="char-timeline-stamp" aria-hidden>
							<span className="char-timeline-stamp-day">{day}</span>
							<span className="char-timeline-stamp-month">{month}</span>
							<span className="char-timeline-stamp-year">{year}</span>
						</div>
						<div className="char-timeline-rail" aria-hidden>
							<span className="char-timeline-node">{meta.glyph}</span>
						</div>
						<article className="char-timeline-card">
							<header className="char-timeline-card-header">
								<span className="char-timeline-type-badge">
									{TYPE_LABELS[event.type] || event.type}
								</span>
								<span className="char-timeline-card-index">
									№ {String(events.length - idx).padStart(3, '0')}
								</span>
								{isAdmin && (
									<button
										type="button"
										onClick={() => handleDelete(event.id)}
										disabled={deleting === event.id}
										className="char-timeline-delete"
										title="Supprimer cet événement"
									>
										{deleting === event.id ? '…' : '✕'}
									</button>
								)}
							</header>
							<h4 className="char-timeline-title">{event.title}</h4>
							{event.description &&
								typeof event.description === 'string' && (
									<p className="char-timeline-description">
										{event.description}
									</p>
								)}
						</article>
					</li>
				);
			})}
		</ol>
	);
}
