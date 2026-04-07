'use client';

import { useEffect, useState } from 'react';

export function NewDmModal({
	onClose,
	onCreated,
}: {
	onClose: () => void;
	onCreated: (channelId: number) => void;
}) {
	const [q, setQ] = useState('');
	const [results, setResults] = useState<any[]>([]);
	const [error, setError] = useState('');
	const [creating, setCreating] = useState(false);
	const [anonymous, setAnonymous] = useState(false);

	useEffect(() => {
		const t = setTimeout(async () => {
			const res = await fetch(
				`/api/comms/characters/search?q=${encodeURIComponent(q)}`,
			);
			if (res.ok) {
				const data = await res.json();
				setResults(data.characters || []);
			}
		}, 250);
		return () => clearTimeout(t);
	}, [q]);

	async function createDm(characterId: number) {
		setCreating(true);
		setError('');
		try {
			const res = await fetch('/api/comms/channels/dm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetCharacterId: characterId, anonymous }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || 'Erreur');
				setCreating(false);
				return;
			}
			onCreated(data.id);
		} catch {
			setError('Erreur réseau');
			setCreating(false);
		}
	}

	return (
		<div className="comms-modal-backdrop" onClick={onClose}>
			<div className="comms-modal" onClick={(e) => e.stopPropagation()}>
				<h2 style={{ color: 'var(--primary)' }}>Nouveau message direct</h2>
				<input
					className="comms-search-input"
					placeholder="Rechercher un personnage..."
					value={q}
					onChange={(e) => setQ(e.target.value)}
					autoFocus
				/>
				<label
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.5rem',
						marginTop: '0.5rem',
						fontSize: '0.8rem',
						color: 'var(--text)',
						cursor: 'pointer',
					}}
				>
					<input
						type="checkbox"
						checked={anonymous}
						onChange={(e) => setAnonymous(e.target.checked)}
					/>
					Mode anonyme — votre identité sera masquée pour le destinataire
				</label>
				<div style={{ marginTop: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
					{results.map((c) => (
						<div
							key={c.id}
							onClick={() => !creating && createDm(c.id)}
							style={{
								padding: '0.5rem',
								cursor: creating ? 'wait' : 'pointer',
								borderBottom: '1px solid rgba(255,255,255,0.05)',
								fontSize: '0.85rem',
							}}
						>
							{c.rankName ? `${c.rankName} ` : ''}
							{c.fullName}
							{c.faction && (
								<span style={{ color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.7rem' }}>
									· {c.faction}
								</span>
							)}
						</div>
					))}
					{results.length === 0 && q && (
						<p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
							Aucun résultat
						</p>
					)}
				</div>
				{error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}
				<div className="comms-modal-actions">
					<button className="comms-modal-btn" onClick={onClose}>
						Annuler
					</button>
				</div>
			</div>
		</div>
	);
}
