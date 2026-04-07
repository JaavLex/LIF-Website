'use client';

import { useState, useEffect } from 'react';

export function AttachmentPicker({
	onClose,
	onPick,
}: {
	onClose: () => void;
	onPick: (att: any) => void;
}) {
	const [tab, setTab] = useState<'character' | 'intel' | 'media'>('media');

	return (
		<div className="comms-modal-backdrop" onClick={onClose}>
			<div className="comms-modal" onClick={(e) => e.stopPropagation()}>
				<h2 style={{ color: 'var(--primary)' }}>Joindre</h2>
				<div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
					<button
						className={`comms-modal-btn${tab === 'media' ? ' primary' : ''}`}
						onClick={() => setTab('media')}
					>
						Média
					</button>
					<button
						className={`comms-modal-btn${tab === 'character' ? ' primary' : ''}`}
						onClick={() => setTab('character')}
					>
						Personnage
					</button>
					<button
						className={`comms-modal-btn${tab === 'intel' ? ' primary' : ''}`}
						onClick={() => setTab('intel')}
					>
						Renseignement
					</button>
				</div>
				{tab === 'media' && <MediaPicker onPick={onPick} />}
				{tab === 'character' && <CharacterPicker onPick={onPick} />}
				{tab === 'intel' && <IntelPicker onPick={onPick} />}
				<div className="comms-modal-actions">
					<button className="comms-modal-btn" onClick={onClose}>
						Fermer
					</button>
				</div>
			</div>
		</div>
	);
}

const ALLOWED_MIME = [
	'image/png',
	'image/jpeg',
	'image/webp',
	'image/gif',
	'video/mp4',
	'video/webm',
	'application/pdf',
];

function MediaPicker({ onPick }: { onPick: (att: any) => void }) {
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState('');

	async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!ALLOWED_MIME.includes(file.type)) {
			setError('Type de fichier non autorisé');
			return;
		}
		if (file.size > 25 * 1024 * 1024) {
			setError('Fichier trop volumineux (max 25 MB)');
			return;
		}
		setError('');
		setUploading(true);
		try {
			const fd = new FormData();
			fd.append('file', file);
			fd.append('alt', `Comms upload ${file.name}`);
			const res = await fetch('/api/upload', { method: 'POST', body: fd });
			if (!res.ok) {
				setError('Erreur upload');
				setUploading(false);
				return;
			}
			const data = await res.json();
			onPick({
				kind: 'media',
				refId: data.id,
				meta: {
					url: data.url || data.doc?.url,
					mimeType: file.type,
					filename: file.name,
				},
			});
		} catch {
			setError('Erreur upload');
		}
		setUploading(false);
	}

	return (
		<div>
			<p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
				Types autorisés : images (PNG, JPEG, WebP, GIF), vidéos (MP4, WebM), PDF.
				Max 25 MB.
			</p>
			<input type="file" onChange={handleFile} disabled={uploading} accept={ALLOWED_MIME.join(',')} />
			{uploading && <p>Envoi en cours...</p>}
			{error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
		</div>
	);
}

function CharacterPicker({ onPick }: { onPick: (att: any) => void }) {
	const [q, setQ] = useState('');
	const [results, setResults] = useState<any[]>([]);

	useEffect(() => {
		const t = setTimeout(async () => {
			const res = await fetch(`/api/comms/characters/search?q=${encodeURIComponent(q)}`);
			if (res.ok) {
				const data = await res.json();
				setResults(data.characters || []);
			}
		}, 250);
		return () => clearTimeout(t);
	}, [q]);

	return (
		<div>
			<input
				className="comms-search-input"
				placeholder="Rechercher un personnage..."
				value={q}
				onChange={(e) => setQ(e.target.value)}
			/>
			<div style={{ marginTop: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
				{results.map((c) => (
					<div
						key={c.id}
						onClick={() =>
							onPick({
								kind: 'character',
								refId: c.id,
								meta: { fullName: c.fullName, rankName: c.rankName },
							})
						}
						style={{
							padding: '0.5rem',
							cursor: 'pointer',
							borderBottom: '1px solid rgba(255,255,255,0.05)',
							fontSize: '0.85rem',
						}}
					>
						{c.rankName ? `${c.rankName} ` : ''}
						{c.fullName}
					</div>
				))}
			</div>
		</div>
	);
}

function IntelPicker({ onPick }: { onPick: (att: any) => void }) {
	const [results, setResults] = useState<any[]>([]);

	useEffect(() => {
		(async () => {
			const res = await fetch('/api/roleplay/intelligence?limit=50').catch(() => null);
			if (res?.ok) {
				const data = await res.json();
				setResults(data.docs || data.intelligence || []);
			} else {
				// Fallback: search via Payload's REST API directly is admin-protected; show empty
				setResults([]);
			}
		})();
	}, []);

	return (
		<div>
			<p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
				Renseignements visibles selon votre niveau d&apos;accès.
			</p>
			<div style={{ maxHeight: '300px', overflowY: 'auto' }}>
				{results.length === 0 && (
					<p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
						Aucun renseignement disponible
					</p>
				)}
				{results.map((r: any) => (
					<div
						key={r.id}
						onClick={() =>
							onPick({
								kind: 'intel',
								refId: r.id,
								meta: { title: r.title, classification: r.classification },
							})
						}
						style={{
							padding: '0.5rem',
							cursor: 'pointer',
							borderBottom: '1px solid rgba(255,255,255,0.05)',
							fontSize: '0.85rem',
						}}
					>
						{r.title}
						{r.classification && (
							<span style={{ color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.7rem' }}>
								[{r.classification}]
							</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
