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

interface TimelineEvent {
	id: number;
	type: string;
	title: string;
	description?: any;
	date: string;
}

export function CharacterTimeline({ events, isAdmin }: { events: TimelineEvent[]; isAdmin?: boolean }) {
	const [deleting, setDeleting] = useState<number | null>(null);

	const handleDelete = async (eventId: number) => {
		if (!confirm('Supprimer cet événement ?')) return;
		setDeleting(eventId);
		try {
			const res = await fetch(`/api/roleplay/timeline?id=${eventId}`, { method: 'DELETE' });
			if (res.ok) {
				window.location.reload();
			}
		} catch { /* ignore */ } finally {
			setDeleting(null);
		}
	};

	return (
		<div className="timeline">
			{events.map(event => (
				<div key={event.id} className={`timeline-item ${event.type}`}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
						<div style={{ flex: 1 }}>
							<div className="timeline-date">
								{new Date(event.date).toLocaleDateString('fr-FR', {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
								})}
							</div>
							<span
								className="timeline-type"
								style={{
									color: `var(--${event.type === 'promotion' || event.type === 'medal' ? 'accent' : event.type === 'wound' || event.type === 'disciplinary' ? 'danger' : 'primary'})`,
								}}
							>
								{TYPE_LABELS[event.type] || event.type}
							</span>
							<div className="timeline-title">{event.title}</div>
							{event.description && (
								<div className="timeline-description">
									{typeof event.description === 'string' ? event.description : null}
								</div>
							)}
						</div>
						{isAdmin && (
							<button
								type="button"
								onClick={() => handleDelete(event.id)}
								disabled={deleting === event.id}
								style={{
									background: 'none',
									border: '1px solid var(--danger)',
									color: 'var(--danger)',
									padding: '0.15rem 0.4rem',
									cursor: 'pointer',
									fontSize: '0.7rem',
									opacity: deleting === event.id ? 0.5 : 1,
									flexShrink: 0,
									marginLeft: '0.5rem',
								}}
								title="Supprimer cet événement"
							>
								{deleting === event.id ? '...' : '✕'}
							</button>
						)}
					</div>
				</div>
			))}
		</div>
	);
}
