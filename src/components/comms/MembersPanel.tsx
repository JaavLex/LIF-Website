'use client';

import { useEffect, useState } from 'react';

interface Member {
	id: number;
	fullName: string;
	callsign?: string | null;
	rankName?: string | null;
	unitName?: string | null;
	faction?: string | null;
	avatarUrl?: string | null;
}

export function MembersPanel({
	channelId,
	onClose,
	onSelectMember,
	onlineIds,
}: {
	channelId: number;
	onClose: () => void;
	onSelectMember: (id: number) => void;
	onlineIds?: number[];
}) {
	const onlineSet = new Set(onlineIds || []);
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		fetch(`/api/comms/channels/${channelId}/members`)
			.then((r) => (r.ok ? r.json() : { members: [] }))
			.then((d) => {
				if (!cancelled) {
					setMembers(d.members || []);
					setLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [channelId]);

	return (
		<div className="comms-modal-backdrop" onClick={onClose}>
			<div
				className="comms-modal"
				onClick={(e) => e.stopPropagation()}
				style={{ maxWidth: '500px' }}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '0.75rem',
					}}
				>
					<h2 style={{ color: 'var(--primary)', margin: 0, letterSpacing: 1 }}>
						MEMBRES ({members.length})
					</h2>
					<button
						className="comms-modal-btn"
						onClick={onClose}
						style={{ padding: '0.25rem 0.6rem' }}
					>
						✕
					</button>
				</div>
				{loading ? (
					<div style={{ color: 'var(--muted)', padding: '1rem' }}>Chargement…</div>
				) : members.length === 0 ? (
					<div style={{ color: 'var(--muted)', padding: '1rem' }}>Aucun membre</div>
				) : (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
						{members.map((m) => (
							<button
								key={m.id}
								type="button"
								onClick={() => onSelectMember(m.id)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.75rem',
									padding: '0.5rem',
									background: 'rgba(0,0,0,0.4)',
									border: '1px solid var(--primary)',
									color: 'var(--text)',
									cursor: 'pointer',
									fontFamily: 'inherit',
									textAlign: 'left',
								}}
							>
								<div
									style={{
										width: 36,
										height: 36,
										border: '1px solid var(--primary)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: 'var(--primary)',
										fontSize: '0.85rem',
										flexShrink: 0,
										overflow: 'hidden',
									}}
								>
									{m.avatarUrl ? (
										<img
											src={m.avatarUrl}
											alt=""
											style={{ width: '100%', height: '100%', objectFit: 'cover' }}
										/>
									) : (
										m.fullName
											.split(' ')
											.map((p) => p[0])
											.slice(0, 2)
											.join('')
									)}
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											color: 'var(--text)',
											fontSize: '0.85rem',
											display: 'flex',
											alignItems: 'center',
											gap: '0.4rem',
										}}
									>
										<span
											aria-label={onlineSet.has(m.id) ? 'En ligne' : 'Hors ligne'}
											title={onlineSet.has(m.id) ? 'En ligne' : 'Hors ligne'}
											style={{
												width: 8,
												height: 8,
												borderRadius: '50%',
												background: onlineSet.has(m.id)
													? 'var(--primary)'
													: 'rgba(120,120,120,0.5)',
												boxShadow: onlineSet.has(m.id)
													? '0 0 6px rgba(80,180,80,0.6)'
													: 'none',
												flexShrink: 0,
											}}
										/>
										<span>
											{m.rankName ? `${m.rankName} ` : ''}
											{m.fullName}
											{m.callsign ? ` « ${m.callsign} »` : ''}
										</span>
									</div>
									<div
										style={{
											color: 'var(--muted)',
											fontSize: '0.7rem',
										}}
									>
										{[m.unitName, m.faction].filter(Boolean).join(' · ')}
									</div>
								</div>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
