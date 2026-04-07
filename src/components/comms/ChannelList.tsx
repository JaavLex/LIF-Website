'use client';

import type { CommsChannel, CommsChannelDisplayMember } from './CommsLayout';

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
	mentionCounts,
}: {
	channels: CommsChannel[];
	activeId: number | null;
	onSelect: (id: number) => void;
	mentionCounts?: Record<number, number>;
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
						{list.map((ch) => {
							const mentionCount = mentionCounts?.[ch.id] || 0;
							return (
							<div
								key={ch.id}
								className={`comms-channel-item${activeId === ch.id ? ' active' : ''}${mentionCount > 0 ? ' has-mentions' : ''}`}
								data-type={ch.type}
								onClick={() => onSelect(ch.id)}
							>
								<ChannelIcon channel={ch} />
								{mentionCount > 0 && (
									<div
										className="comms-channel-mention-badge"
										aria-label={`${mentionCount} mention${mentionCount > 1 ? 's' : ''} non lue${mentionCount > 1 ? 's' : ''}`}
										title={`${mentionCount} mention${mentionCount > 1 ? 's' : ''} non lue${mentionCount > 1 ? 's' : ''}`}
									>
										@{mentionCount}
									</div>
								)}
								<div className="comms-channel-body">
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
							</div>
							);
						})}
					</div>
				);
			})}
		</div>
	);
}

function ChannelIcon({ channel }: { channel: CommsChannel }) {
	// Group: avatar stack
	if (channel.type === 'group') {
		const previews = (channel.displayMembers || []).slice(0, 4);
		const overflow = Math.max(0, channel.memberCount - 1 - previews.length);
		// If overflow > 0 we replace the 4th slot with a "+N" bubble
		const renderSlots: Array<
			{ kind: 'member'; member: CommsChannelDisplayMember } | { kind: 'overflow'; count: number }
		> = [];
		const maxRender = overflow > 0 ? 3 : 4;
		for (const m of previews.slice(0, maxRender)) {
			renderSlots.push({ kind: 'member', member: m });
		}
		if (overflow > 0) {
			renderSlots.push({ kind: 'overflow', count: overflow + Math.max(0, previews.length - 3) });
		}
		return (
			<div className="comms-channel-stack" aria-label="Membres du groupe">
				{renderSlots.map((slot, idx) => (
					<div key={idx} className={`comms-channel-stack-bubble b${idx}`}>
						{slot.kind === 'member' ? (
							slot.member.avatarUrl ? (
								<img src={slot.member.avatarUrl} alt={slot.member.fullName} />
							) : (
								slot.member.fullName.charAt(0)
							)
						) : (
							`+${slot.count}`
						)}
					</div>
				))}
			</div>
		);
	}

	// Single icon (faction logo, unit insignia, DM avatar)
	const iconUrl = channel.iconUrl || channel.dmOther?.avatarUrl || null;
	const fallback =
		channel.type === 'dm'
			? channel.isAnonForViewer
				? '?'
				: (channel.dmOther?.fullName || channel.name || '?').charAt(0)
			: (channel.name || '?').charAt(0);
	return (
		<div className="comms-channel-icon" aria-hidden>
			{iconUrl ? <img src={iconUrl} alt="" /> : fallback}
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
