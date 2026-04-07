'use client';

import type { CommsChannel } from './CommsLayout';

const TYPE_LABELS: Record<CommsChannel['type'], string> = {
	faction: 'Factions',
	unit: 'Unités',
	dm: 'Messages directs',
	group: 'Groupes',
};

const TYPE_ORDER: CommsChannel['type'][] = ['faction', 'unit', 'group', 'dm'];

export function ChannelList({
	channels,
	activeId,
	onSelect,
}: {
	channels: CommsChannel[];
	activeId: number | null;
	onSelect: (id: number) => void;
}) {
	const grouped: Record<string, CommsChannel[]> = {};
	for (const ch of channels) {
		if (!grouped[ch.type]) grouped[ch.type] = [];
		grouped[ch.type].push(ch);
	}

	return (
		<div className="comms-channel-list">
			{TYPE_ORDER.map((type) => {
				const list = grouped[type];
				if (!list || list.length === 0) return null;
				return (
					<div key={type} className="comms-channel-section">
						<div className="comms-channel-section-title">{TYPE_LABELS[type]}</div>
						{list.map((ch) => (
							<div
								key={ch.id}
								className={`comms-channel-item${activeId === ch.id ? ' active' : ''}`}
								onClick={() => onSelect(ch.id)}
							>
								<div className="comms-channel-name">{ch.name}</div>
								<div className="comms-channel-meta">
									<span>{ch.memberCount} membres</span>
									{ch.lastMessageAt && (
										<span>{formatRelative(ch.lastMessageAt)}</span>
									)}
								</div>
								{ch.lastMessagePreview && (
									<div className="comms-channel-preview">{ch.lastMessagePreview}</div>
								)}
							</div>
						))}
					</div>
				);
			})}
		</div>
	);
}

function formatRelative(iso: string): string {
	const ms = Date.now() - new Date(iso).getTime();
	const m = Math.floor(ms / 60_000);
	if (m < 1) return 'maintenant';
	if (m < 60) return `${m}m`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h`;
	const d = Math.floor(h / 24);
	return `${d}j`;
}
