'use client';

import { useState, useEffect, useMemo } from 'react';

interface Transcript {
	messageId: string;
	filename: string;
	url: string;
	size: number;
	timestamp: string;
	ticketOwner: string;
	participants: string[];
}

export function TranscriptViewer() {
	const [transcripts, setTranscripts] = useState<Transcript[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [search, setSearch] = useState('');
	const [selectedOwner, setSelectedOwner] = useState('');
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [previewTitle, setPreviewTitle] = useState('');

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

	const filtered = useMemo(() => {
		let list = transcripts;
		if (selectedOwner) {
			list = list.filter(t => t.ticketOwner === selectedOwner);
		}
		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter(t =>
				t.filename.toLowerCase().includes(q) ||
				t.ticketOwner.toLowerCase().includes(q) ||
				t.participants.some(p => p.toLowerCase().includes(q)),
			);
		}
		return list;
	}, [transcripts, search, selectedOwner]);

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	if (loading) {
		return (
			<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
				<div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Chargement des transcripts...</div>
				<div style={{ fontSize: '0.85rem' }}>Récupération depuis Discord en cours, cela peut prendre un moment.</div>
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ padding: '1rem', background: 'rgba(139,38,53,0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', textAlign: 'center' }}>
				{error}
			</div>
		);
	}

	return (
		<div>
			{/* Filters */}
			<div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
				<div style={{ flex: 1, minWidth: '200px' }}>
					<input
						type="text"
						placeholder="Rechercher par nom, fichier, participant..."
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="filter-input"
						style={{ width: '100%', padding: '0.6rem 0.75rem' }}
					/>
				</div>
				<div style={{ minWidth: '180px' }}>
					<select
						value={selectedOwner}
						onChange={e => setSelectedOwner(e.target.value)}
						className="filter-select"
						style={{ width: '100%', padding: '0.6rem 0.75rem' }}
					>
						<option value="">Tous les propriétaires ({owners.length})</option>
						{owners.map(o => (
							<option key={o} value={o}>{o}</option>
						))}
					</select>
				</div>
			</div>

			{/* Stats */}
			<div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
				{filtered.length} transcript{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
				{transcripts.length !== filtered.length && ` sur ${transcripts.length}`}
			</div>

			{/* Transcript list */}
			{filtered.length === 0 ? (
				<div className="empty-state-inline">
					{transcripts.length === 0
						? 'Aucun transcript trouvé. Vérifiez que l\'intent MESSAGE_CONTENT est activé dans le portail développeur Discord.'
						: 'Aucun transcript ne correspond aux filtres.'
					}
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
					{filtered.map(t => (
						<div
							key={`${t.messageId}-${t.filename}`}
							style={{
								border: '1px solid var(--border)',
								padding: '0.75rem 1rem',
								background: 'var(--bg-secondary)',
								display: 'flex',
								alignItems: 'center',
								gap: '1rem',
								flexWrap: 'wrap',
							}}
						>
							<div style={{ flex: 1, minWidth: '200px' }}>
								<div style={{ fontSize: '0.95rem', marginBottom: '0.25rem', fontWeight: 500 }}>
									{t.ticketOwner || 'Inconnu'}
								</div>
								<div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
									{t.filename}
								</div>
								{t.participants.length > 0 && (
									<div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
										Participants: {t.participants.join(', ')}
									</div>
								)}
							</div>
							<div style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'right', minWidth: '120px' }}>
								<div>{new Date(t.timestamp).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
								<div>{formatSize(t.size)}</div>
							</div>
							<div style={{ display: 'flex', gap: '0.5rem' }}>
								<button
									type="button"
									onClick={() => {
										setPreviewUrl(t.url);
										setPreviewTitle(t.ticketOwner ? `Transcript — ${t.ticketOwner}` : t.filename);
									}}
									className="session-btn"
									style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
								>
									👁 Voir
								</button>
								<a
									href={t.url}
									download={t.filename}
									className="session-btn"
									style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
								>
									⬇ Télécharger
								</a>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Preview Modal */}
			{previewUrl && (
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
						flexDirection: 'column',
						padding: '1rem',
					}}
				>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
						<h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>{previewTitle}</h3>
						<div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
							<a
								href={previewUrl}
								download
								style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none' }}
							>
								⬇ Télécharger
							</a>
							<button
								onClick={() => setPreviewUrl(null)}
								style={{
									background: 'none',
									border: 'none',
									color: '#fff',
									fontSize: '1.5rem',
									cursor: 'pointer',
									lineHeight: 1,
								}}
							>
								✕
							</button>
						</div>
					</div>
					<iframe
						src={previewUrl}
						style={{
							flex: 1,
							width: '100%',
							border: '1px solid var(--border)',
							borderRadius: '4px',
							background: '#fff',
						}}
						title="Transcript preview"
						sandbox="allow-same-origin"
					/>
				</div>
			)}
		</div>
	);
}
