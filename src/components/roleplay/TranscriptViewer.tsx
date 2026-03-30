'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

interface Participant {
	count: number;
	name: string;
}

interface Transcript {
	messageId: string;
	ticketOwner: string;
	ticketOwnerAvatar: string;
	ticketName: string;
	panelName: string;
	participants: Participant[];
	transcriptUrl: string;
	downloadUrl: string;
	filename: string;
	size: number;
	timestamp: string;
}

export function TranscriptViewer() {
	const [transcripts, setTranscripts] = useState<Transcript[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [selectedOwner, setSelectedOwner] = useState('');
	const [selectedPanel, setSelectedPanel] = useState('');
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [previewTitle, setPreviewTitle] = useState('');
	const [detailTranscript, setDetailTranscript] = useState<Transcript | null>(null);

	useEffect(() => {
		fetch('/api/roleplay/transcripts')
			.then(res => {
				if (!res.ok) throw new Error('Erreur de chargement');
				return res.json();
			})
			.then(data => {
				setTranscripts(data.transcripts || []);
				setLoading(false);
			})
			.catch(err => {
				setError(err.message);
				setLoading(false);
			});
	}, []);

	const owners = useMemo(() => {
		const set = new Set<string>();
		for (const t of transcripts) {
			if (t.ticketOwner) set.add(t.ticketOwner);
		}
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [transcripts]);

	const panels = useMemo(() => {
		const set = new Set<string>();
		for (const t of transcripts) {
			if (t.panelName) set.add(t.panelName);
		}
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [transcripts]);

	const filtered = useMemo(() => {
		let list = transcripts;
		if (selectedOwner) {
			list = list.filter(t => t.ticketOwner === selectedOwner);
		}
		if (selectedPanel) {
			list = list.filter(t => t.panelName === selectedPanel);
		}
		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(
				t =>
					t.ticketName.toLowerCase().includes(q) ||
					t.ticketOwner.toLowerCase().includes(q) ||
					t.panelName.toLowerCase().includes(q) ||
					t.participants.some(p => p.name.toLowerCase().includes(q)),
			);
		}
		return list;
	}, [transcripts, search, selectedOwner, selectedPanel]);

	const grouped = useMemo(() => {
		const map = new Map<string, Transcript[]>();
		for (const t of filtered) {
			const key = t.ticketOwner || 'Inconnu';
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(t);
		}
		return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	}, [filtered]);

	const [collapsedOwners, setCollapsedOwners] = useState<Set<string>>(() => {
		const allOwners = new Set<string>();
		for (const t of transcripts) {
			allOwners.add(t.ticketOwner || 'Inconnu');
		}
		return allOwners;
	});

	const toggleOwner = (owner: string) => {
		setCollapsedOwners(prev => {
			const next = new Set(prev);
			if (next.has(owner)) next.delete(owner);
			else next.add(owner);
			return next;
		});
	};

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	if (loading) {
		return (
			<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
				<div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
					Chargement des transcripts...
				</div>
				<div style={{ fontSize: '0.85rem' }}>
					Récupération depuis Discord en cours, cela peut prendre un moment.
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div
				style={{
					padding: '1rem',
					background: 'rgba(139,38,53,0.15)',
					border: '1px solid var(--danger)',
					color: 'var(--danger)',
					textAlign: 'center',
				}}
			>
				{error}
			</div>
		);
	}

	return (
		<div>
			{/* Filters */}
			<div
				style={{
					display: 'flex',
					gap: '0.75rem',
					marginBottom: '1.5rem',
					flexWrap: 'wrap',
				}}
			>
				<div style={{ flex: 1, minWidth: '200px' }}>
					<input
						type="text"
						placeholder="Rechercher par nom, ticket, participant..."
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="filter-input"
						style={{ width: '100%', padding: '0.6rem 0.75rem' }}
					/>
				</div>
				<div style={{ minWidth: '160px' }}>
					<select
						value={selectedOwner}
						onChange={e => setSelectedOwner(e.target.value)}
						className="filter-select"
						style={{ width: '100%', padding: '0.6rem 0.75rem' }}
					>
						<option value="">Tous les propriétaires ({owners.length})</option>
						{owners.map(o => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				</div>
				<div style={{ minWidth: '160px' }}>
					<select
						value={selectedPanel}
						onChange={e => setSelectedPanel(e.target.value)}
						className="filter-select"
						style={{ width: '100%', padding: '0.6rem 0.75rem' }}
					>
						<option value="">Tous les panels ({panels.length})</option>
						{panels.map(p => (
							<option key={p} value={p}>
								{p}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Stats */}
			<div
				style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}
			>
				{filtered.length} transcript{filtered.length !== 1 ? 's' : ''} trouvé
				{filtered.length !== 1 ? 's' : ''}
				{transcripts.length !== filtered.length && ` sur ${transcripts.length}`}
				{' · '}
				{grouped.length} propriétaire{grouped.length !== 1 ? 's' : ''}
			</div>

			{/* Transcript list grouped by owner */}
			{filtered.length === 0 ? (
				<div className="empty-state-inline">
					{transcripts.length === 0
						? 'Aucun transcript trouvé dans le salon Discord.'
						: 'Aucun transcript ne correspond aux filtres.'}
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
					{grouped.map(([owner, tickets]) => {
						const collapsed = collapsedOwners.has(owner);
						const avatar = tickets[0]?.ticketOwnerAvatar;
						return (
							<div
								key={owner}
								style={{
									border: '1px solid var(--border)',
									background: 'var(--bg-secondary)',
								}}
							>
								{/* Owner header */}
								<button
									type="button"
									onClick={() => toggleOwner(owner)}
									style={{
										width: '100%',
										display: 'flex',
										alignItems: 'center',
										gap: '0.75rem',
										padding: '0.75rem 1rem',
										background: 'none',
										border: 'none',
										color: 'inherit',
										cursor: 'pointer',
										textAlign: 'left',
										borderBottom: collapsed ? 'none' : '1px solid var(--border)',
									}}
								>
									<span
										style={{
											fontSize: '0.85rem',
											transition: 'transform 0.2s',
											transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
										}}
									>
										▼
									</span>
									{avatar && (
										<Image
											src={avatar}
											alt={owner}
											width={32}
											height={32}
											style={{ borderRadius: '50%', flexShrink: 0 }}
											unoptimized
										/>
									)}
									<span style={{ fontWeight: 600, fontSize: '0.95rem', flex: 1 }}>
										{owner}
									</span>
									<span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
										{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
									</span>
								</button>

								{/* Tickets */}
								{!collapsed && (
									<div style={{ display: 'flex', flexDirection: 'column' }}>
										{tickets.map(t => (
											<div
												key={t.messageId}
												style={{
													padding: '0.6rem 1rem 0.6rem 3.25rem',
													display: 'flex',
													alignItems: 'center',
													gap: '0.75rem',
													flexWrap: 'wrap',
													borderBottom: '1px solid var(--border)',
												}}
											>
												{/* Ticket name */}
												<div style={{ flex: 1, minWidth: '180px' }}>
													<div style={{ fontSize: '0.9rem' }}>{t.ticketName}</div>
												</div>

												{/* Panel */}
												<div style={{ minWidth: '120px' }}>
													<span
														style={{
															fontSize: '0.75rem',
															padding: '0.15rem 0.5rem',
															border: '1px solid var(--primary)',
															color: 'var(--primary)',
														}}
													>
														{t.panelName || '—'}
													</span>
												</div>

												{/* Date & size */}
												<div
													style={{
														fontSize: '0.8rem',
														color: 'var(--muted)',
														textAlign: 'right',
														minWidth: '100px',
													}}
												>
													<div>
														{new Date(t.timestamp).toLocaleDateString('fr-FR', {
															year: 'numeric',
															month: 'short',
															day: 'numeric',
														})}
													</div>
													{t.size > 0 && <div>{formatSize(t.size)}</div>}
												</div>

												{/* Actions */}
												<div
													style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}
												>
													<button
														type="button"
														onClick={() => setDetailTranscript(t)}
														className="session-btn"
														style={{
															padding: '0.35rem 0.6rem',
															fontSize: '0.8rem',
															whiteSpace: 'nowrap',
														}}
													>
														ℹ️ Détails
													</button>
													{t.transcriptUrl && (
														<a
															href={t.transcriptUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="session-btn"
															style={{
																padding: '0.35rem 0.6rem',
																fontSize: '0.8rem',
																textDecoration: 'none',
																whiteSpace: 'nowrap',
															}}
														>
															👁 Voir
														</a>
													)}
													{t.downloadUrl && (
														<a
															href={t.downloadUrl}
															download={t.filename}
															className="session-btn"
															style={{
																padding: '0.35rem 0.6rem',
																fontSize: '0.8rem',
																textDecoration: 'none',
																whiteSpace: 'nowrap',
															}}
														>
															⬇
														</a>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Detail Modal */}
			{detailTranscript && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.85)',
						zIndex: 9999,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: '1rem',
					}}
					onClick={() => setDetailTranscript(null)}
				>
					<div
						style={{
							background: 'var(--bg-secondary)',
							border: '1px solid var(--border)',
							padding: '1.5rem',
							maxWidth: '500px',
							width: '100%',
							maxHeight: '80vh',
							overflow: 'auto',
						}}
						onClick={e => e.stopPropagation()}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'flex-start',
								marginBottom: '1rem',
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
								{detailTranscript.ticketOwnerAvatar && (
									<Image
										src={detailTranscript.ticketOwnerAvatar}
										alt={detailTranscript.ticketOwner}
										width={48}
										height={48}
										style={{ borderRadius: '50%' }}
										unoptimized
									/>
								)}
								<div>
									<h3 style={{ margin: 0, fontSize: '1.1rem' }}>
										{detailTranscript.ticketOwner}
									</h3>
									<div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
										Propriétaire du ticket
									</div>
								</div>
							</div>
							<button
								onClick={() => setDetailTranscript(null)}
								style={{
									background: 'none',
									border: 'none',
									color: 'var(--muted)',
									fontSize: '1.2rem',
									cursor: 'pointer',
								}}
							>
								✕
							</button>
						</div>

						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '0.75rem',
								marginBottom: '1rem',
							}}
						>
							<div>
								<div
									style={{
										fontSize: '0.75rem',
										color: 'var(--muted)',
										marginBottom: '0.2rem',
									}}
								>
									Ticket
								</div>
								<div style={{ fontSize: '0.9rem' }}>
									{detailTranscript.ticketName}
								</div>
							</div>
							<div>
								<div
									style={{
										fontSize: '0.75rem',
										color: 'var(--muted)',
										marginBottom: '0.2rem',
									}}
								>
									Panel
								</div>
								<div style={{ fontSize: '0.9rem' }}>
									{detailTranscript.panelName || '—'}
								</div>
							</div>
							<div>
								<div
									style={{
										fontSize: '0.75rem',
										color: 'var(--muted)',
										marginBottom: '0.2rem',
									}}
								>
									Date
								</div>
								<div style={{ fontSize: '0.9rem' }}>
									{new Date(detailTranscript.timestamp).toLocaleDateString('fr-FR', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
									})}
								</div>
							</div>
							<div>
								<div
									style={{
										fontSize: '0.75rem',
										color: 'var(--muted)',
										marginBottom: '0.2rem',
									}}
								>
									Taille
								</div>
								<div style={{ fontSize: '0.9rem' }}>
									{formatSize(detailTranscript.size)}
								</div>
							</div>
						</div>

						{detailTranscript.participants.length > 0 && (
							<div style={{ marginBottom: '1rem' }}>
								<div
									style={{
										fontSize: '0.75rem',
										color: 'var(--muted)',
										marginBottom: '0.5rem',
									}}
								>
									Participants
								</div>
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '0.25rem',
									}}
								>
									{detailTranscript.participants.map((p, i) => (
										<div
											key={i}
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												fontSize: '0.85rem',
												padding: '0.2rem 0',
											}}
										>
											<span>{p.name}</span>
											<span style={{ color: 'var(--muted)' }}>
												{p.count} message{p.count !== 1 ? 's' : ''}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						<div
							style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}
						>
							{detailTranscript.transcriptUrl && (
								<a
									href={detailTranscript.transcriptUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="discord-login-btn"
									style={{
										background: 'var(--primary)',
										padding: '0.5rem 1rem',
										fontSize: '0.85rem',
										textDecoration: 'none',
									}}
								>
									👁 Ouvrir le transcript
								</a>
							)}
							{detailTranscript.downloadUrl && (
								<a
									href={detailTranscript.downloadUrl}
									download={detailTranscript.filename}
									className="session-btn"
									style={{
										padding: '0.5rem 1rem',
										fontSize: '0.85rem',
										textDecoration: 'none',
									}}
								>
									⬇ Télécharger
								</a>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
