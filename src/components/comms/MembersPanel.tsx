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
	canKick = false,
	viewerId,
	onMembersChanged,
}: {
	channelId: number;
	onClose: () => void;
	onSelectMember: (id: number) => void;
	onlineIds?: number[];
	canKick?: boolean;
	viewerId?: number;
	onMembersChanged?: () => void;
}) {
	const onlineSet = new Set(onlineIds || []);
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<number | null>(null);

	const loadMembers = () => {
		setLoading(true);
		return fetch(`/api/comms/channels/${channelId}/members`)
			.then((r) => (r.ok ? r.json() : { members: [] }))
			.then((d) => {
				setMembers(d.members || []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	};

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

	async function handleKick(memberId: number, memberName: string) {
		if (!confirm(`Retirer ${memberName} du groupe ?`)) return;
		setBusyId(memberId);
		try {
			const remaining = members
				.map((m) => m.id)
				.filter((id) => id !== memberId);
			const res = await fetch(`/api/comms/channels/${channelId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ members: remaining }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				alert(data.error || 'Erreur');
				return;
			}
			await loadMembers();
			onMembersChanged?.();
		} finally {
			setBusyId(null);
		}
	}

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
							<div
								key={m.id}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									padding: '0.5rem',
									background: 'rgba(0,0,0,0.4)',
									border: '1px solid var(--primary)',
								}}
							>
							<button
								type="button"
								onClick={() => onSelectMember(m.id)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.75rem',
									flex: 1,
									minWidth: 0,
									padding: 0,
									background: 'transparent',
									border: 'none',
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
								{canKick && m.id !== viewerId && (
									<button
										type="button"
										className="comms-modal-btn"
										onClick={() => handleKick(m.id, m.fullName)}
										disabled={busyId === m.id}
										style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
										title="Retirer du groupe"
									>
										{busyId === m.id ? '…' : '✕ Retirer'}
									</button>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
