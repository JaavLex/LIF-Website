'use client';

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

export function CharacterTimeline({ events }: { events: TimelineEvent[] }) {
	return (
		<div className="timeline">
			{events.map(event => (
				<div key={event.id} className={`timeline-item ${event.type}`}>
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
			))}
		</div>
	);
}
