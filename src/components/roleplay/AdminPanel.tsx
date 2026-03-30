'use client';

import { useState } from 'react';
import Link from 'next/link';

interface UnitItem {
	id: number;
	name: string;
	slug: string;
	color?: string;
	insignia?: { url?: string; id?: number } | null;
	description?: any;
	parentFaction?: { id: number; name: string } | number | null;
}

interface FactionItem {
	id: number;
	name: string;
	slug: string;
	type?: string;
	color?: string;
	logo?: { url?: string; id?: number } | null;
	description?: any;
}

function extractPlainText(richText: any): string {
	if (!richText?.root?.children) return '';
	return richText.root.children
		.map((node: any) => {
			if (node.children) {
				return node.children
					.filter((child: any) => child.type === 'text')
					.map((child: any) => child.text || '')
					.join('');
			}
			return '';
		})
		.join('\n');
}

function textToRichText(text: string): any {
	if (!text.trim()) return undefined;
	const paragraphs = text.split('\n');
	return {
		root: {
			type: 'root',
			children: paragraphs.map(p => ({
				type: 'paragraph',
				children: p.trim()
					? [{ type: 'text', text: p, format: 0, mode: 'normal', detail: 0, style: '', version: 1 }]
					: [],
				direction: 'ltr',
				format: '',
				indent: 0,
				textFormat: 0,
				version: 1,
			})),
			direction: 'ltr',
			format: '',
			indent: 0,
			version: 1,
		},
	};
}

export function AdminPanel({
	units,
	factions,
	adminLevel = 'full',
}: {
	units: UnitItem[];
	factions: FactionItem[];
	adminLevel?: 'full' | 'limited';
}) {
	const isFullAccess = adminLevel === 'full';
	const [showUnitForm, setShowUnitForm] = useState(false);
	const [showFactionForm, setShowFactionForm] = useState(false);
	const [showExistingUnits, setShowExistingUnits] = useState(false);
	const [showExistingFactions, setShowExistingFactions] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [localUnits, setLocalUnits] = useState(units);
	const [localFactions, setLocalFactions] = useState(factions);

	// Create form state
	const [unitForm, setUnitForm] = useState({ name: '', slug: '', color: '#4a7c23', parentFaction: '', description: '' });
	const [unitInsignia, setUnitInsignia] = useState<File | null>(null);
	const [factionForm, setFactionForm] = useState({
		name: '',
		slug: '',
		type: 'neutral' as string,
		color: '#8b4513',
		description: '',
	});
	const [factionLogo, setFactionLogo] = useState<File | null>(null);

	// Edit state
	const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
	const [editingFaction, setEditingFaction] = useState<FactionItem | null>(null);
	const [editUnitForm, setEditUnitForm] = useState({ name: '', slug: '', color: '#4a7c23', parentFaction: '', description: '' });
	const [editUnitInsignia, setEditUnitInsignia] = useState<File | null>(null);
	const [editFactionForm, setEditFactionForm] = useState({ name: '', slug: '', type: 'neutral', color: '#8b4513', description: '' });
	const [editFactionLogo, setEditFactionLogo] = useState<File | null>(null);

	const uploadFile = async (file: File): Promise<number> => {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('alt', file.name);
		const res = await fetch('/api/upload', { method: 'POST', body: formData });
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error(data.message || "Erreur lors de l'upload");
		}
		const data = await res.json();
		return data.id;
	};

	const handleUnitSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			let insigniaId: number | undefined;
			if (unitInsignia) {
				insigniaId = await uploadFile(unitInsignia);
			}

			const body: any = { name: unitForm.name, slug: unitForm.slug, color: unitForm.color };
			if (insigniaId) body.insignia = insigniaId;
			if (unitForm.parentFaction) body.parentFaction = parseInt(unitForm.parentFaction);
			if (unitForm.description.trim()) body.description = textToRichText(unitForm.description);

			const res = await fetch('/api/roleplay/units', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}
			setSuccess(`Unité "${unitForm.name}" créée`);
			setUnitForm({ name: '', slug: '', color: '#4a7c23', parentFaction: '', description: '' });
			setUnitInsignia(null);
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
			let logoId: number | undefined;
			if (factionLogo) {
				logoId = await uploadFile(factionLogo);
			}

			const body: any = { name: factionForm.name, slug: factionForm.slug, type: factionForm.type, color: factionForm.color };
			if (logoId) body.logo = logoId;
			if (factionForm.description.trim()) body.description = textToRichText(factionForm.description);

			const res = await fetch('/api/roleplay/factions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}
			setSuccess(`Faction "${factionForm.name}" créée`);
			setFactionForm({ name: '', slug: '', type: 'neutral', color: '#8b4513', description: '' });
			setFactionLogo(null);
			setShowFactionForm(false);
			setTimeout(() => window.location.reload(), 1000);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	const startEditUnit = (unit: UnitItem) => {
		setEditingUnit(unit);
		setEditingFaction(null);
		setShowUnitForm(false);
		setShowFactionForm(false);
		const parentId = typeof unit.parentFaction === 'object' && unit.parentFaction
			? String(unit.parentFaction.id)
			: unit.parentFaction ? String(unit.parentFaction) : '';
		setEditUnitForm({
			name: unit.name,
			slug: unit.slug,
			color: unit.color || '#4a7c23',
			parentFaction: parentId,
			description: extractPlainText(unit.description),
		});
		setEditUnitInsignia(null);
	};

	const startEditFaction = (faction: FactionItem) => {
		setEditingFaction(faction);
		setEditingUnit(null);
		setShowUnitForm(false);
		setShowFactionForm(false);
		setEditFactionForm({
			name: faction.name,
			slug: faction.slug,
			type: faction.type || 'neutral',
			color: faction.color || '#8b4513',
			description: extractPlainText(faction.description),
		});
		setEditFactionLogo(null);
	};

	const handleEditUnitSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingUnit) return;
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			let insigniaId: number | undefined;
			if (editUnitInsignia) {
				insigniaId = await uploadFile(editUnitInsignia);
			}

			const body: any = { name: editUnitForm.name, slug: editUnitForm.slug, color: editUnitForm.color };
			if (insigniaId) body.insignia = insigniaId;
			if (editUnitForm.parentFaction) body.parentFaction = parseInt(editUnitForm.parentFaction);
			else body.parentFaction = null;
			body.description = editUnitForm.description.trim() ? textToRichText(editUnitForm.description) : null;

			const res = await fetch(`/api/roleplay/units/${editingUnit.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}
			setSuccess(`Unité "${editUnitForm.name}" modifiée`);
			setEditingUnit(null);
			setTimeout(() => window.location.reload(), 1000);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleEditFactionSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingFaction) return;
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			let logoId: number | undefined;
			if (editFactionLogo) {
				logoId = await uploadFile(editFactionLogo);
			}

			const body: any = { name: editFactionForm.name, slug: editFactionForm.slug, type: editFactionForm.type, color: editFactionForm.color };
			if (logoId) body.logo = logoId;
			body.description = editFactionForm.description.trim() ? textToRichText(editFactionForm.description) : null;

			const res = await fetch(`/api/roleplay/factions/${editingFaction.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}
			setSuccess(`Faction "${editFactionForm.name}" modifiée`);
			setEditingFaction(null);
			setTimeout(() => window.location.reload(), 1000);
		} catch (err: any) {
			setError(err.message);
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

	return (
		<div
			style={{
				border: '1px solid var(--primary)',
				padding: '1.5rem',
				marginBottom: '1.5rem',
				background: 'rgba(139, 69, 19, 0.05)',
			}}
		>
			<h2 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '1rem' }}>
				Administration
			</h2>

			{error && (
				<div
					style={{
						padding: '0.5rem 0.75rem',
						background: 'rgba(139,38,53,0.15)',
						border: '1px solid var(--danger)',
						color: 'var(--danger)',
						marginBottom: '1rem',
						fontSize: '0.85rem',
					}}
				>
					{error}
				</div>
			)}
			{success && (
				<div
					style={{
						padding: '0.5rem 0.75rem',
						background: 'rgba(74,124,35,0.15)',
						border: '1px solid var(--primary)',
						color: 'var(--primary)',
						marginBottom: '1rem',
						fontSize: '0.85rem',
					}}
				>
					{success}
				</div>
			)}

			<div
				style={{
					display: 'flex',
					gap: '0.75rem',
					flexWrap: 'wrap',
					marginBottom: '1rem',
				}}
			>
				<button
					type="button"
					onClick={() => {
						setShowUnitForm(!showUnitForm);
						setShowFactionForm(false);
						setEditingUnit(null);
						setEditingFaction(null);
					}}
					className="session-btn"
					style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
				>
					{showUnitForm ? 'Annuler' : '+ Nouvelle Unité'}
				</button>
				<button
					type="button"
					onClick={() => {
						setShowFactionForm(!showFactionForm);
						setShowUnitForm(false);
						setEditingUnit(null);
						setEditingFaction(null);
					}}
					className="session-btn"
					style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
				>
					{showFactionForm ? 'Annuler' : '+ Nouvelle Faction'}
				</button>
			</div>

			{/* Create Unit Form */}
			{showUnitForm && (
				<form
					onSubmit={handleUnitSubmit}
					style={{
						border: '1px solid var(--border)',
						padding: '1rem',
						marginBottom: '1rem',
						background: 'var(--bg-secondary)',
					}}
				>
					<h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--primary)' }}>
						Nouvelle Unité
					</h3>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 120px',
							gap: '1rem',
							marginBottom: '1rem',
						}}
					>
						<div>
							<label style={labelStyle}>Nom *</label>
							<input
								type="text"
								value={unitForm.name}
								onChange={e =>
									setUnitForm(f => ({
										...f,
										name: e.target.value,
										slug: e.target.value
											.toLowerCase()
											.replace(/[^a-z0-9]+/g, '-')
											.replace(/(^-|-$)/g, ''),
									}))
								}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Slug</label>
							<input
								type="text"
								value={unitForm.slug}
								onChange={e => setUnitForm(f => ({ ...f, slug: e.target.value }))}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Couleur</label>
							<input
								type="color"
								value={unitForm.color}
								onChange={e => setUnitForm(f => ({ ...f, color: e.target.value }))}
								style={{
									width: '100%',
									height: '32px',
									border: '1px solid var(--border)',
									background: 'transparent',
									cursor: 'pointer',
								}}
							/>
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Insigne</label>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
							<button
								type="button"
								onClick={() => {
									const input = document.createElement('input');
									input.type = 'file';
									input.accept = 'image/*';
									input.onchange = () => {
										if (input.files?.[0]) setUnitInsignia(input.files[0]);
									};
									input.click();
								}}
								style={{
									background: 'none',
									border: '1px dashed var(--border)',
									color: 'var(--muted)',
									padding: '0.4rem 1rem',
									cursor: 'pointer',
									fontSize: '0.8rem',
								}}
							>
								{unitInsignia ? '🔄 Changer' : '+ Ajouter un insigne'}
							</button>
							{unitInsignia && (
								<span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
									{unitInsignia.name}
								</span>
							)}
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Faction parente</label>
						<select
							value={unitForm.parentFaction}
							onChange={e => setUnitForm(f => ({ ...f, parentFaction: e.target.value }))}
							className="filter-select"
							style={{ width: '100%' }}
						>
							<option value="">— Aucune —</option>
							{localFactions.map(f => (
								<option key={f.id} value={f.id}>
									{f.name}
								</option>
							))}
						</select>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Description</label>
						<textarea
							value={unitForm.description}
							onChange={e => setUnitForm(f => ({ ...f, description: e.target.value }))}
							className="filter-input"
							style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
							placeholder="Description de l'unité..."
						/>
					</div>
					<button
						type="submit"
						disabled={submitting}
						className="discord-login-btn"
						style={{
							background: 'var(--primary)',
							padding: '0.5rem 1rem',
							opacity: submitting ? 0.6 : 1,
						}}
					>
						{submitting ? 'Création...' : "Créer l'unité"}
					</button>
				</form>
			)}

			{/* Create Faction Form */}
			{showFactionForm && (
				<form
					onSubmit={handleFactionSubmit}
					style={{
						border: '1px solid var(--border)',
						padding: '1rem',
						marginBottom: '1rem',
						background: 'var(--bg-secondary)',
					}}
				>
					<h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--primary)' }}>
						Nouvelle Faction
					</h3>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 140px 120px',
							gap: '1rem',
							marginBottom: '1rem',
						}}
					>
						<div>
							<label style={labelStyle}>Nom *</label>
							<input
								type="text"
								value={factionForm.name}
								onChange={e =>
									setFactionForm(f => ({
										...f,
										name: e.target.value,
										slug: e.target.value
											.toLowerCase()
											.replace(/[^a-z0-9]+/g, '-')
											.replace(/(^-|-$)/g, ''),
									}))
								}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Slug</label>
							<input
								type="text"
								value={factionForm.slug}
								onChange={e => setFactionForm(f => ({ ...f, slug: e.target.value }))}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Type</label>
							<select
								value={factionForm.type}
								onChange={e => setFactionForm(f => ({ ...f, type: e.target.value }))}
								className="filter-select"
								style={{ width: '100%' }}
							>
								<option value="allied">Alliée</option>
								<option value="neutral">Neutre</option>
								<option value="hostile">Hostile</option>
							</select>
						</div>
						<div>
							<label style={labelStyle}>Couleur</label>
							<input
								type="color"
								value={factionForm.color}
								onChange={e =>
									setFactionForm(f => ({ ...f, color: e.target.value }))
								}
								style={{
									width: '100%',
									height: '32px',
									border: '1px solid var(--border)',
									background: 'transparent',
									cursor: 'pointer',
								}}
							/>
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Logo</label>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
							<button
								type="button"
								onClick={() => {
									const input = document.createElement('input');
									input.type = 'file';
									input.accept = 'image/*';
									input.onchange = () => {
										if (input.files?.[0]) setFactionLogo(input.files[0]);
									};
									input.click();
								}}
								style={{
									background: 'none',
									border: '1px dashed var(--border)',
									color: 'var(--muted)',
									padding: '0.4rem 1rem',
									cursor: 'pointer',
									fontSize: '0.8rem',
								}}
							>
								{factionLogo ? '🔄 Changer' : '+ Ajouter un logo'}
							</button>
							{factionLogo && (
								<span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
									{factionLogo.name}
								</span>
							)}
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Description</label>
						<textarea
							value={factionForm.description}
							onChange={e => setFactionForm(f => ({ ...f, description: e.target.value }))}
							className="filter-input"
							style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
							placeholder="Description de la faction..."
						/>
					</div>
					<button
						type="submit"
						disabled={submitting}
						className="discord-login-btn"
						style={{
							background: 'var(--primary)',
							padding: '0.5rem 1rem',
							opacity: submitting ? 0.6 : 1,
						}}
					>
						{submitting ? 'Création...' : 'Créer la faction'}
					</button>
				</form>
			)}

			{/* Edit Unit Form */}
			{editingUnit && (
				<form
					onSubmit={handleEditUnitSubmit}
					style={{
						border: '1px solid var(--accent)',
						padding: '1rem',
						marginBottom: '1rem',
						background: 'var(--bg-secondary)',
					}}
				>
					<h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--accent)' }}>
						Modifier l&apos;unité : {editingUnit.name}
					</h3>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 120px',
							gap: '1rem',
							marginBottom: '1rem',
						}}
					>
						<div>
							<label style={labelStyle}>Nom *</label>
							<input
								type="text"
								value={editUnitForm.name}
								onChange={e => setEditUnitForm(f => ({ ...f, name: e.target.value }))}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Slug</label>
							<input
								type="text"
								value={editUnitForm.slug}
								onChange={e => setEditUnitForm(f => ({ ...f, slug: e.target.value }))}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Couleur</label>
							<input
								type="color"
								value={editUnitForm.color}
								onChange={e => setEditUnitForm(f => ({ ...f, color: e.target.value }))}
								style={{
									width: '100%',
									height: '32px',
									border: '1px solid var(--border)',
									background: 'transparent',
									cursor: 'pointer',
								}}
							/>
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Insigne</label>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
							{editingUnit.insignia?.url && !editUnitInsignia && (
								<img src={editingUnit.insignia.url} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
							)}
							<button
								type="button"
								onClick={() => {
									const input = document.createElement('input');
									input.type = 'file';
									input.accept = 'image/*';
									input.onchange = () => {
										if (input.files?.[0]) setEditUnitInsignia(input.files[0]);
									};
									input.click();
								}}
								style={{
									background: 'none',
									border: '1px dashed var(--border)',
									color: 'var(--muted)',
									padding: '0.4rem 1rem',
									cursor: 'pointer',
									fontSize: '0.8rem',
								}}
							>
								{editUnitInsignia ? '🔄 Changer' : editingUnit.insignia?.url ? '🔄 Remplacer' : '+ Ajouter un insigne'}
							</button>
							{editUnitInsignia && (
								<span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{editUnitInsignia.name}</span>
							)}
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Faction parente</label>
						<select
							value={editUnitForm.parentFaction}
							onChange={e => setEditUnitForm(f => ({ ...f, parentFaction: e.target.value }))}
							className="filter-select"
							style={{ width: '100%' }}
						>
							<option value="">— Aucune —</option>
							{localFactions.map(f => (
								<option key={f.id} value={f.id}>{f.name}</option>
							))}
						</select>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Description</label>
						<textarea
							value={editUnitForm.description}
							onChange={e => setEditUnitForm(f => ({ ...f, description: e.target.value }))}
							className="filter-input"
							style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
							placeholder="Description de l'unité..."
						/>
					</div>
					<div style={{ display: 'flex', gap: '0.75rem' }}>
						<button
							type="submit"
							disabled={submitting}
							className="discord-login-btn"
							style={{
								background: 'var(--accent)',
								padding: '0.5rem 1rem',
								opacity: submitting ? 0.6 : 1,
							}}
						>
							{submitting ? 'Sauvegarde...' : 'Sauvegarder'}
						</button>
						<button
							type="button"
							onClick={() => setEditingUnit(null)}
							className="session-btn"
							style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
						>
							Annuler
						</button>
					</div>
				</form>
			)}

			{/* Edit Faction Form */}
			{editingFaction && (
				<form
					onSubmit={handleEditFactionSubmit}
					style={{
						border: '1px solid var(--accent)',
						padding: '1rem',
						marginBottom: '1rem',
						background: 'var(--bg-secondary)',
					}}
				>
					<h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--accent)' }}>
						Modifier la faction : {editingFaction.name}
					</h3>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 140px 120px',
							gap: '1rem',
							marginBottom: '1rem',
						}}
					>
						<div>
							<label style={labelStyle}>Nom *</label>
							<input
								type="text"
								value={editFactionForm.name}
								onChange={e => setEditFactionForm(f => ({ ...f, name: e.target.value }))}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Slug</label>
							<input
								type="text"
								value={editFactionForm.slug}
								onChange={e => setEditFactionForm(f => ({ ...f, slug: e.target.value }))}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Type</label>
							<select
								value={editFactionForm.type}
								onChange={e => setEditFactionForm(f => ({ ...f, type: e.target.value }))}
								className="filter-select"
								style={{ width: '100%' }}
							>
								<option value="allied">Alliée</option>
								<option value="neutral">Neutre</option>
								<option value="hostile">Hostile</option>
							</select>
						</div>
						<div>
							<label style={labelStyle}>Couleur</label>
							<input
								type="color"
								value={editFactionForm.color}
								onChange={e => setEditFactionForm(f => ({ ...f, color: e.target.value }))}
								style={{
									width: '100%',
									height: '32px',
									border: '1px solid var(--border)',
									background: 'transparent',
									cursor: 'pointer',
								}}
							/>
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Logo</label>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
							{editingFaction.logo?.url && !editFactionLogo && (
								<img src={editingFaction.logo.url} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
							)}
							<button
								type="button"
								onClick={() => {
									const input = document.createElement('input');
									input.type = 'file';
									input.accept = 'image/*';
									input.onchange = () => {
										if (input.files?.[0]) setEditFactionLogo(input.files[0]);
									};
									input.click();
								}}
								style={{
									background: 'none',
									border: '1px dashed var(--border)',
									color: 'var(--muted)',
									padding: '0.4rem 1rem',
									cursor: 'pointer',
									fontSize: '0.8rem',
								}}
							>
								{editFactionLogo ? '🔄 Changer' : editingFaction.logo?.url ? '🔄 Remplacer' : '+ Ajouter un logo'}
							</button>
							{editFactionLogo && (
								<span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{editFactionLogo.name}</span>
							)}
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Description</label>
						<textarea
							value={editFactionForm.description}
							onChange={e => setEditFactionForm(f => ({ ...f, description: e.target.value }))}
							className="filter-input"
							style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
							placeholder="Description de la faction..."
						/>
					</div>
					<div style={{ display: 'flex', gap: '0.75rem' }}>
						<button
							type="submit"
							disabled={submitting}
							className="discord-login-btn"
							style={{
								background: 'var(--accent)',
								padding: '0.5rem 1rem',
								opacity: submitting ? 0.6 : 1,
							}}
						>
							{submitting ? 'Sauvegarde...' : 'Sauvegarder'}
						</button>
						<button
							type="button"
							onClick={() => setEditingFaction(null)}
							className="session-btn"
							style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
						>
							Annuler
						</button>
					</div>
				</form>
			)}

			{/* Existing Units */}
			{localUnits.length > 0 && (
				<div style={{ marginBottom: '1rem' }}>
					<h3
						style={{
							fontSize: '0.95rem',
							color: 'var(--primary)',
							marginBottom: '0.5rem',
							cursor: 'pointer',
							userSelect: 'none',
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
						}}
						onClick={() => setShowExistingUnits(v => !v)}
					>
						<span style={{ fontSize: '0.7rem', transition: 'transform 0.2s', display: 'inline-block', transform: showExistingUnits ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
						Unités existantes ({localUnits.length})
					</h3>
					{showExistingUnits && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
						{localUnits.map(unit => (
							<div
								key={unit.id}
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									padding: '0.4rem 0.75rem',
									background: 'var(--bg-secondary)',
									border: '1px solid var(--border)',
								}}
							>
								<div
									style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
								>
									{unit.insignia?.url && (
										<img
											src={unit.insignia.url}
											alt=""
											style={{ width: 20, height: 20, objectFit: 'contain' }}
										/>
									)}
									<Link
										href={`/roleplay/unite/${unit.slug}`}
										style={{
											fontSize: '0.85rem',
											color: unit.color || 'var(--text)',
											textDecoration: 'none',
										}}
									>
										{unit.name}
									</Link>
								</div>
								{isFullAccess && (
									<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
										<button
											type="button"
											onClick={() => startEditUnit(unit)}
											style={{
												background: 'none',
												border: 'none',
												color: 'var(--accent)',
												cursor: 'pointer',
												fontSize: '0.8rem',
												padding: '0.2rem 0.5rem',
											}}
										>
											✎
										</button>
										<button
											type="button"
											onClick={async () => {
												if (!confirm(`Supprimer l'unité "${unit.name}" ?`)) return;
												try {
													const res = await fetch(`/api/roleplay/units/${unit.id}`, {
														method: 'DELETE',
													});
													if (!res.ok) throw new Error('Erreur suppression');
													setLocalUnits(prev => prev.filter(u => u.id !== unit.id));
													setSuccess(`Unité "${unit.name}" supprimée`);
												} catch {
													setError('Erreur lors de la suppression');
												}
											}}
											style={{
												background: 'none',
												border: 'none',
												color: 'var(--danger)',
												cursor: 'pointer',
												fontSize: '0.8rem',
												padding: '0.2rem 0.5rem',
											}}
										>
											✕
										</button>
									</div>
								)}
							</div>
						))}
					</div>
					)}
				</div>
			)}

			{/* Existing Factions */}
			{localFactions.length > 0 && (
				<div style={{ marginBottom: '1rem' }}>
					<h3
						style={{
							fontSize: '0.95rem',
							color: 'var(--primary)',
							marginBottom: '0.5rem',
							cursor: 'pointer',
							userSelect: 'none',
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
						}}
						onClick={() => setShowExistingFactions(v => !v)}
					>
						<span style={{ fontSize: '0.7rem', transition: 'transform 0.2s', display: 'inline-block', transform: showExistingFactions ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
						Factions existantes ({localFactions.length})
					</h3>
					{showExistingFactions && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
						{localFactions.map(faction => (
							<div
								key={faction.id}
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									padding: '0.4rem 0.75rem',
									background: 'var(--bg-secondary)',
									border: '1px solid var(--border)',
								}}
							>
								<div
									style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
								>
									{faction.logo?.url && (
										<img
											src={faction.logo.url}
											alt=""
											style={{ width: 20, height: 20, objectFit: 'contain' }}
										/>
									)}
									<Link
										href={`/roleplay/faction/${faction.slug}`}
										style={{
											fontSize: '0.85rem',
											color: faction.color || 'var(--text)',
											textDecoration: 'none',
										}}
									>
										{faction.name}
									</Link>
									<span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
										({faction.type || 'neutre'})
									</span>
								</div>
								{isFullAccess && (
									<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
										<button
											type="button"
											onClick={() => startEditFaction(faction)}
											style={{
												background: 'none',
												border: 'none',
												color: 'var(--accent)',
												cursor: 'pointer',
												fontSize: '0.8rem',
												padding: '0.2rem 0.5rem',
											}}
										>
											✎
										</button>
										<button
											type="button"
											onClick={async () => {
												if (!confirm(`Supprimer la faction "${faction.name}" ?`)) return;
												try {
													const res = await fetch(
														`/api/roleplay/factions/${faction.id}`,
														{ method: 'DELETE' },
													);
													if (!res.ok) throw new Error('Erreur suppression');
													setLocalFactions(prev =>
														prev.filter(f => f.id !== faction.id),
													);
													setSuccess(`Faction "${faction.name}" supprimée`);
												} catch {
													setError('Erreur lors de la suppression');
												}
											}}
											style={{
												background: 'none',
												border: 'none',
												color: 'var(--danger)',
												cursor: 'pointer',
												fontSize: '0.8rem',
												padding: '0.2rem 0.5rem',
											}}
										>
											✕
										</button>
									</div>
								)}
							</div>
						))}
					</div>
					)}
				</div>
			)}
		</div>
	);
}
