'use client';

import { useState } from 'react';
import { textToLexical } from '@/lib/constants';

const TYPE_OPTIONS = [
	{ value: 'promotion', label: 'Promotion' },
	{ value: 'mutation', label: 'Mutation' },
	{ value: 'wound', label: 'Blessure' },
	{ value: 'mission', label: 'Mission' },
	{ value: 'disciplinary', label: 'Disciplinaire' },
	{ value: 'medal', label: 'Médaille / Décoration' },
	{ value: 'training', label: 'Formation' },
	{ value: 'other', label: 'Autre' },
];

export function AddTimelineEvent({ characterId }: { characterId: number }) {
	const [showForm, setShowForm] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [form, setForm] = useState({
		type: 'other',
		title: '',
		description: '',
		date: new Date().toISOString().split('T')[0],
		classification: 'public',
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError('');

		try {
			const body: any = {
				character: characterId,
				type: form.type,
				title: form.title,
				date: form.date,
				classification: form.classification,
			};

			const desc = textToLexical(form.description);
			if (desc) body.description = desc;

			const res = await fetch('/api/roleplay/timeline', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}

			window.location.reload();
		} catch (err: any) {
			setError(err.message || 'Erreur');
		} finally {
			setSubmitting(false);
		}
	};

	const labelStyle: React.CSSProperties = {
		display: 'block',
		fontSize: '0.8rem',
		color: 'var(--muted)',
		marginBottom: '0.35rem',
	};

	if (!showForm) {
		return (
			<button
				type="button"
				onClick={() => setShowForm(true)}
				className="session-btn"
				style={{
					padding: '0.4rem 0.8rem',
					fontSize: '0.8rem',
					marginLeft: '0.5rem',
				}}
			>
				+ Ajouter un événement
			</button>
		);
	}

	return (
		<div
			style={{
				border: '1px solid var(--primary)',
				padding: '1rem',
				marginTop: '0.75rem',
				background: 'rgba(139, 69, 19, 0.05)',
			}}
		>
			<h3 style={{ color: 'var(--primary)', marginTop: 0, fontSize: '0.95rem' }}>
				Nouvel événement
			</h3>
			{error && (
				<div
					style={{
						padding: '0.5rem',
						background: 'rgba(139,38,53,0.15)',
						border: '1px solid var(--danger)',
						color: 'var(--danger)',
						marginBottom: '0.75rem',
						fontSize: '0.85rem',
					}}
				>
					{error}
				</div>
			)}
			<form onSubmit={handleSubmit}>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: '0.75rem',
						marginBottom: '0.75rem',
					}}
				>
					<div>
						<label style={labelStyle}>Type *</label>
						<select
							value={form.type}
							onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
							className="filter-select"
							style={{ width: '100%' }}
						>
							{TYPE_OPTIONS.map(o => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<div>
						<label style={labelStyle}>Date *</label>
						<input
							type="date"
							value={form.date}
							onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
							required
							className="filter-input"
							style={{ width: '100%' }}
						/>
					</div>
				</div>
				<div style={{ marginBottom: '0.75rem' }}>
					<label style={labelStyle}>Titre *</label>
					<input
						type="text"
						value={form.title}
						onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
						required
						className="filter-input"
						style={{ width: '100%' }}
					/>
				</div>
				<div style={{ marginBottom: '0.75rem' }}>
					<label style={labelStyle}>Description</label>
					<textarea
						value={form.description}
						onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
						className="filter-input"
						style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
					/>
				</div>
				<div style={{ marginBottom: '0.75rem' }}>
					<label style={labelStyle}>Classification</label>
					<select
						value={form.classification}
						onChange={e => setForm(f => ({ ...f, classification: e.target.value }))}
						className="filter-select"
						style={{ width: '100%', maxWidth: '200px' }}
					>
						<option value="public">Public</option>
						<option value="confidential">Confidentiel</option>
						<option value="secret">Secret</option>
					</select>
				</div>
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
					<button
						type="button"
						onClick={() => setShowForm(false)}
						className="session-btn"
						style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
					>
						Annuler
					</button>
					<button
						type="submit"
						disabled={submitting}
						className="discord-login-btn"
						style={{
							background: 'var(--primary)',
							padding: '0.4rem 0.8rem',
							fontSize: '0.8rem',
							opacity: submitting ? 0.6 : 1,
						}}
					>
						{submitting ? 'Ajout...' : 'Ajouter'}
					</button>
				</div>
			</form>
		</div>
	);
}
