'use client';

import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';

interface CharResult {
	id: number;
	fullName: string;
	rankName?: string | null;
	faction?: string | null;
}

const MAX_MEMBERS = 15;

export function NewGroupModal({
	onClose,
	onCreated,
}: {
	onClose: () => void;
	onCreated: (channelId: number) => void;
}) {
	const [name, setName] = useState('');
	const [q, setQ] = useState('');
	const [results, setResults] = useState<CharResult[]>([]);
	const [selected, setSelected] = useState<CharResult[]>([]);
	const [error, setError] = useState('');
	const [creating, setCreating] = useState(false);

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

	function toggle(c: CharResult) {
		if (selected.find((s) => s.id === c.id)) {
			setSelected(selected.filter((s) => s.id !== c.id));
		} else {
			if (selected.length >= MAX_MEMBERS - 1) {
				setError(`Maximum ${MAX_MEMBERS} membres (vous inclus)`);
				return;
			}
			setSelected([...selected, c]);
			setError('');
		}
	}

	async function create() {
		if (!name.trim()) {
			setError('Nom requis');
			return;
		}
		if (selected.length === 0) {
			setError('Sélectionnez au moins un membre');
			return;
		}
		setCreating(true);
		setError('');
		try {
			const res = await fetch('/api/comms/channels', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					type: 'group',
					memberCharacterIds: selected.map((s) => s.id),
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || 'Erreur');
				setCreating(false);
				return;
			}
			onCreated(data.channelId);
		} catch {
			setError('Erreur réseau');
			setCreating(false);
		}
	}

	return (
		<div className="comms-modal-backdrop" onClick={onClose}>
			<div className="comms-modal" onClick={(e) => e.stopPropagation()}>
				<h2 style={{ color: 'var(--primary)' }}>Nouveau groupe</h2>
				<input
					className="comms-search-input"
					placeholder="Nom du groupe"
					value={name}
					onChange={(e) => setName(e.target.value)}
					maxLength={80}
				/>
				{selected.length > 0 && (
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
						{selected.map((s) => (
							<span
								key={s.id}
								style={{
									border: '1px solid var(--primary)',
									padding: '0.2rem 0.4rem',
									fontSize: '0.7rem',
									display: 'inline-flex',
									alignItems: 'center',
									gap: '0.3rem',
								}}
							>
								{s.fullName}
								<button
									type="button"
									onClick={() => toggle(s)}
									aria-label={`Retirer ${s.fullName}`}
									style={{
										background: 'transparent',
										border: 'none',
										color: 'var(--danger)',
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
									}}
								>
									<X size={11} />
								</button>
							</span>
						))}
					</div>
				)}
				<input
					className="comms-search-input"
					placeholder="Rechercher des membres..."
					value={q}
					onChange={(e) => setQ(e.target.value)}
					style={{ marginTop: '0.5rem' }}
				/>
				<div style={{ marginTop: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
					{results.map((c) => {
						const isSelected = !!selected.find((s) => s.id === c.id);
						return (
							<div
								key={c.id}
								onClick={() => toggle(c)}
								style={{
									padding: '0.5rem',
									cursor: 'pointer',
									borderBottom: '1px solid rgba(255,255,255,0.05)',
									fontSize: '0.85rem',
									background: isSelected ? 'rgba(0,255,170,0.1)' : 'transparent',
									display: 'flex',
									alignItems: 'center',
									gap: '0.4rem',
								}}
							>
								{isSelected && <Check size={12} style={{ color: 'var(--primary)' }} />}
								<span>
									{c.rankName ? `${c.rankName} ` : ''}
									{c.fullName}
									{c.faction && (
										<span style={{ color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.7rem' }}>
											· {c.faction}
										</span>
									)}
								</span>
							</div>
						);
					})}
				</div>
				<p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
					{selected.length}/{MAX_MEMBERS - 1} membres sélectionnés
				</p>
				{error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}
				<div className="comms-modal-actions">
					<button className="comms-modal-btn" onClick={onClose}>
						Annuler
					</button>
					<button className="comms-modal-btn primary" onClick={create} disabled={creating}>
						{creating ? 'Création...' : 'CRÉER'}
					</button>
				</div>
			</div>
		</div>
	);
}
