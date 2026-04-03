'use client';

import { useState } from 'react';
import Link from 'next/link';
import { lexicalToText, textToLexical } from '@/lib/constants';
import { FactionItem, uploadFile, labelStyle } from './types';

export function FactionManagement({
	factions,
	isFullAccess,
	showCreateForm,
	isEditing,
	onStartEdit,
	onStopEdit,
	setError,
	setSuccess,
	submitting,
	setSubmitting,
}: {
	factions: FactionItem[];
	isFullAccess: boolean;
	showCreateForm: boolean;
	isEditing: boolean;
	onStartEdit: () => void;
	onStopEdit: () => void;
	setError: (v: string) => void;
	setSuccess: (v: string) => void;
	submitting: boolean;
	setSubmitting: (v: boolean) => void;
}) {
	const [showExisting, setShowExisting] = useState(false);
	const [localFactions, setLocalFactions] = useState(factions);

	// Create form state
	const [form, setForm] = useState({
		name: '',
		slug: '',
		type: 'neutral' as string,
		color: '#8b4513',
		description: '',
	});
	const [logo, setLogo] = useState<File | null>(null);

	// Edit state
	const [editingFaction, setEditingFaction] = useState<FactionItem | null>(null);
	const [editForm, setEditForm] = useState({
		name: '',
		slug: '',
		type: 'neutral',
		color: '#8b4513',
		description: '',
	});
	const [editLogo, setEditLogo] = useState<File | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			let logoId: number | undefined;
			if (logo) {
				logoId = await uploadFile(logo);
			}

			const body: any = {
				name: form.name,
				slug: form.slug,
				type: form.type,
				color: form.color,
			};
			if (logoId) body.logo = logoId;
			if (form.description.trim())
				body.description = textToLexical(form.description);

			const res = await fetch('/api/roleplay/factions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}
			setSuccess(`Faction "${form.name}" créée`);
			setForm({
				name: '',
				slug: '',
				type: 'neutral',
				color: '#8b4513',
				description: '',
			});
			setLogo(null);
			setTimeout(() => window.location.reload(), 1000);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	const startEdit = (faction: FactionItem) => {
		setEditingFaction(faction);
		onStartEdit();
		setEditForm({
			name: faction.name,
			slug: faction.slug,
			type: faction.type || 'neutral',
			color: faction.color || '#8b4513',
			description: lexicalToText(faction.description),
		});
		setEditLogo(null);
	};

	const cancelEdit = () => {
		setEditingFaction(null);
		onStopEdit();
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingFaction) return;
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			let logoId: number | undefined;
			if (editLogo) {
				logoId = await uploadFile(editLogo);
			}

			const body: any = {
				name: editForm.name,
				slug: editForm.slug,
				type: editForm.type,
				color: editForm.color,
			};
			if (logoId) body.logo = logoId;
			body.description = editForm.description.trim()
				? textToLexical(editForm.description)
				: null;

			const res = await fetch(`/api/roleplay/factions/${editingFaction.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}
			setSuccess(`Faction "${editForm.name}" modifiée`);
			setEditingFaction(null);
			onStopEdit();
			setTimeout(() => window.location.reload(), 1000);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	const showEditForm = isEditing && editingFaction !== null;

	return (
		<>
			{/* Create Faction Form */}
			{showCreateForm && (
				<form
					onSubmit={handleSubmit}
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
								value={form.name}
								onChange={e =>
									setForm(f => ({
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
								value={form.slug}
								onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Type</label>
							<select
								value={form.type}
								onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
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
								value={form.color}
								onChange={e =>
									setForm(f => ({ ...f, color: e.target.value }))
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
										if (input.files?.[0]) setLogo(input.files[0]);
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
								{logo ? '🔄 Changer' : '+ Ajouter un logo'}
							</button>
							{logo && (
								<span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
									{logo.name}
								</span>
							)}
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Description</label>
						<textarea
							value={form.description}
							onChange={e =>
								setForm(f => ({ ...f, description: e.target.value }))
							}
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

			{/* Edit Faction Form */}
			{showEditForm && editingFaction && (
				<form
					onSubmit={handleEditSubmit}
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
								value={editForm.name}
								onChange={e =>
									setEditForm(f => ({ ...f, name: e.target.value }))
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
								value={editForm.slug}
								onChange={e =>
									setEditForm(f => ({ ...f, slug: e.target.value }))
								}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Type</label>
							<select
								value={editForm.type}
								onChange={e =>
									setEditForm(f => ({ ...f, type: e.target.value }))
								}
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
								value={editForm.color}
								onChange={e =>
									setEditForm(f => ({ ...f, color: e.target.value }))
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
							{editingFaction.logo?.url && !editLogo && (
								<img
									src={editingFaction.logo.url}
									alt=""
									style={{ width: 24, height: 24, objectFit: 'contain' }}
								/>
							)}
							<button
								type="button"
								onClick={() => {
									const input = document.createElement('input');
									input.type = 'file';
									input.accept = 'image/*';
									input.onchange = () => {
										if (input.files?.[0]) setEditLogo(input.files[0]);
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
								{editLogo
									? '🔄 Changer'
									: editingFaction.logo?.url
										? '🔄 Remplacer'
										: '+ Ajouter un logo'}
							</button>
							{editLogo && (
								<span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
									{editLogo.name}
								</span>
							)}
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Description</label>
						<textarea
							value={editForm.description}
							onChange={e =>
								setEditForm(f => ({ ...f, description: e.target.value }))
							}
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
							onClick={cancelEdit}
							className="session-btn"
							style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
						>
							Annuler
						</button>
					</div>
				</form>
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
						onClick={() => setShowExisting(v => !v)}
					>
						<span
							style={{
								fontSize: '0.7rem',
								transition: 'transform 0.2s',
								display: 'inline-block',
								transform: showExisting ? 'rotate(90deg)' : 'rotate(0deg)',
							}}
						>
							▶
						</span>
						Factions existantes ({localFactions.length})
					</h3>
					{showExisting && (
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
										<div
											style={{
												display: 'flex',
												gap: '0.5rem',
												alignItems: 'center',
											}}
										>
											<button
												type="button"
												onClick={() => startEdit(faction)}
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
													if (!confirm(`Supprimer la faction "${faction.name}" ?`))
														return;
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
		</>
	);
}
