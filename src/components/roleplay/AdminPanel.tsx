'use client';

import { useState } from 'react';

export function AdminPanel() {
	const [showUnitForm, setShowUnitForm] = useState(false);
	const [showFactionForm, setShowFactionForm] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const [unitForm, setUnitForm] = useState({ name: '', slug: '', color: '#4a7c23' });
	const [factionForm, setFactionForm] = useState({ name: '', slug: '', type: 'neutral' as string, color: '#8b4513' });

	const handleUnitSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			const res = await fetch('/api/roleplay/units', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(unitForm),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}
			setSuccess(`Unité "${unitForm.name}" créée`);
			setUnitForm({ name: '', slug: '', color: '#4a7c23' });
			setShowUnitForm(false);
			setTimeout(() => window.location.reload(), 1000);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleFactionSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			const res = await fetch('/api/roleplay/factions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(factionForm),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}
			setSuccess(`Faction "${factionForm.name}" créée`);
			setFactionForm({ name: '', slug: '', type: 'neutral', color: '#8b4513' });
			setShowFactionForm(false);
			setTimeout(() => window.location.reload(), 1000);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.35rem' };

	return (
		<div style={{ border: '1px solid var(--primary)', padding: '1.5rem', marginBottom: '1.5rem', background: 'rgba(139, 69, 19, 0.05)' }}>
			<h2 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '1rem' }}>Administration</h2>

			{error && (
				<div style={{ padding: '0.5rem 0.75rem', background: 'rgba(139,38,53,0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
					{error}
				</div>
			)}
			{success && (
				<div style={{ padding: '0.5rem 0.75rem', background: 'rgba(74,124,35,0.15)', border: '1px solid var(--primary)', color: 'var(--primary)', marginBottom: '1rem', fontSize: '0.85rem' }}>
					{success}
				</div>
			)}

			<div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
				<button type="button" onClick={() => { setShowUnitForm(!showUnitForm); setShowFactionForm(false); }} className="session-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
					{showUnitForm ? 'Annuler' : '+ Nouvelle Unité'}
				</button>
				<button type="button" onClick={() => { setShowFactionForm(!showFactionForm); setShowUnitForm(false); }} className="session-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
					{showFactionForm ? 'Annuler' : '+ Nouvelle Faction'}
				</button>
			</div>

			{showUnitForm && (
				<form onSubmit={handleUnitSubmit} style={{ border: '1px solid var(--border)', padding: '1rem', marginBottom: '1rem', background: 'var(--bg-secondary)' }}>
					<h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--primary)' }}>Nouvelle Unité</h3>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '1rem', marginBottom: '1rem' }}>
						<div>
							<label style={labelStyle}>Nom *</label>
							<input type="text" value={unitForm.name} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }))} required className="filter-input" style={{ width: '100%' }} />
						</div>
						<div>
							<label style={labelStyle}>Slug</label>
							<input type="text" value={unitForm.slug} onChange={e => setUnitForm(f => ({ ...f, slug: e.target.value }))} required className="filter-input" style={{ width: '100%' }} />
						</div>
						<div>
							<label style={labelStyle}>Couleur</label>
							<input type="color" value={unitForm.color} onChange={e => setUnitForm(f => ({ ...f, color: e.target.value }))} style={{ width: '100%', height: '32px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }} />
						</div>
					</div>
					<button type="submit" disabled={submitting} className="discord-login-btn" style={{ background: 'var(--primary)', padding: '0.5rem 1rem', opacity: submitting ? 0.6 : 1 }}>
						{submitting ? 'Création...' : 'Créer l\'unité'}
					</button>
				</form>
			)}

			{showFactionForm && (
				<form onSubmit={handleFactionSubmit} style={{ border: '1px solid var(--border)', padding: '1rem', marginBottom: '1rem', background: 'var(--bg-secondary)' }}>
					<h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--primary)' }}>Nouvelle Faction</h3>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 120px', gap: '1rem', marginBottom: '1rem' }}>
						<div>
							<label style={labelStyle}>Nom *</label>
							<input type="text" value={factionForm.name} onChange={e => setFactionForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }))} required className="filter-input" style={{ width: '100%' }} />
						</div>
						<div>
							<label style={labelStyle}>Slug</label>
							<input type="text" value={factionForm.slug} onChange={e => setFactionForm(f => ({ ...f, slug: e.target.value }))} required className="filter-input" style={{ width: '100%' }} />
						</div>
						<div>
							<label style={labelStyle}>Type</label>
							<select value={factionForm.type} onChange={e => setFactionForm(f => ({ ...f, type: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
								<option value="allied">Alliée</option>
								<option value="neutral">Neutre</option>
								<option value="hostile">Hostile</option>
							</select>
						</div>
						<div>
							<label style={labelStyle}>Couleur</label>
							<input type="color" value={factionForm.color} onChange={e => setFactionForm(f => ({ ...f, color: e.target.value }))} style={{ width: '100%', height: '32px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }} />
						</div>
					</div>
					<button type="submit" disabled={submitting} className="discord-login-btn" style={{ background: 'var(--primary)', padding: '0.5rem 1rem', opacity: submitting ? 0.6 : 1 }}>
						{submitting ? 'Création...' : 'Créer la faction'}
					</button>
				</form>
			)}
		</div>
	);
}
