'use client';

import { useState } from 'react';
import Link from 'next/link';
import { lexicalToText, textToLexical } from '@/lib/constants';
import { UnitItem, FactionItem, uploadFile, labelStyle } from './types';

export function UnitManagement({
	units,
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
	units: UnitItem[];
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
	const [localUnits, setLocalUnits] = useState(units);

	// Create form state
	const [form, setForm] = useState({
		name: '',
		slug: '',
		color: '#4a7c23',
		parentFaction: '',
		description: '',
	});
	const [insignia, setInsignia] = useState<File | null>(null);

	// Edit state
	const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
	const [editForm, setEditForm] = useState({
		name: '',
		slug: '',
		color: '#4a7c23',
		parentFaction: '',
		description: '',
	});
	const [editInsignia, setEditInsignia] = useState<File | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			let insigniaId: number | undefined;
			if (insignia) {
				insigniaId = await uploadFile(insignia);
			}

			const body: any = {
				name: form.name,
				slug: form.slug,
				color: form.color,
			};
			if (insigniaId) body.insignia = insigniaId;
			if (form.parentFaction)
				body.parentFaction = parseInt(form.parentFaction);
			if (form.description.trim())
				body.description = textToLexical(form.description);

			const res = await fetch('/api/roleplay/units', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}
			setSuccess(`Unité "${form.name}" créée`);
			setForm({
				name: '',
				slug: '',
				color: '#4a7c23',
				parentFaction: '',
				description: '',
			});
			setInsignia(null);
			setTimeout(() => window.location.reload(), 1000);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	const startEdit = (unit: UnitItem) => {
		setEditingUnit(unit);
		onStartEdit();
		const parentId =
			typeof unit.parentFaction === 'object' && unit.parentFaction
				? String(unit.parentFaction.id)
				: unit.parentFaction
					? String(unit.parentFaction)
					: '';
		setEditForm({
			name: unit.name,
			slug: unit.slug,
			color: unit.color || '#4a7c23',
			parentFaction: parentId,
			description: lexicalToText(unit.description),
		});
		setEditInsignia(null);
	};

	const cancelEdit = () => {
		setEditingUnit(null);
		onStopEdit();
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingUnit) return;
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			let insigniaId: number | undefined;
			if (editInsignia) {
				insigniaId = await uploadFile(editInsignia);
			}

			const body: any = {
				name: editForm.name,
				slug: editForm.slug,
				color: editForm.color,
			};
			if (insigniaId) body.insignia = insigniaId;
			if (editForm.parentFaction)
				body.parentFaction = parseInt(editForm.parentFaction);
			else body.parentFaction = null;
			body.description = editForm.description.trim()
				? textToLexical(editForm.description)
				: null;

			const res = await fetch(`/api/roleplay/units/${editingUnit.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}
			setSuccess(`Unité "${editForm.name}" modifiée`);
			setEditingUnit(null);
			onStopEdit();
			setTimeout(() => window.location.reload(), 1000);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	// Clear internal edit state when parent switches away from unit-edit
	const showEditForm = isEditing && editingUnit !== null;

	return (
		<>
			{/* Create Unit Form */}
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
							<label style={labelStyle}>Couleur</label>
							<input
								type="color"
								value={form.color}
								onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
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
										if (input.files?.[0]) setInsignia(input.files[0]);
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
								{insignia ? '🔄 Changer' : '+ Ajouter un insigne'}
							</button>
							{insignia && (
								<span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
									{insignia.name}
								</span>
							)}
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Faction parente</label>
						<select
							value={form.parentFaction}
							onChange={e =>
								setForm(f => ({ ...f, parentFaction: e.target.value }))
							}
							className="filter-select"
							style={{ width: '100%' }}
						>
							<option value="">— Aucune —</option>
							{factions.map(f => (
								<option key={f.id} value={f.id}>
									{f.name}
								</option>
							))}
						</select>
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

			{/* Edit Unit Form */}
			{showEditForm && editingUnit && (
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
						<label style={labelStyle}>Insigne</label>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
							{editingUnit.insignia?.url && !editInsignia && (
								<img
									src={editingUnit.insignia.url}
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
										if (input.files?.[0]) setEditInsignia(input.files[0]);
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
								{editInsignia
									? '🔄 Changer'
									: editingUnit.insignia?.url
										? '🔄 Remplacer'
										: '+ Ajouter un insigne'}
							</button>
							{editInsignia && (
								<span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
									{editInsignia.name}
								</span>
							)}
						</div>
					</div>
					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Faction parente</label>
						<select
							value={editForm.parentFaction}
							onChange={e =>
								setEditForm(f => ({ ...f, parentFaction: e.target.value }))
							}
							className="filter-select"
							style={{ width: '100%' }}
						>
							<option value="">— Aucune —</option>
							{factions.map(f => (
								<option key={f.id} value={f.id}>
									{f.name}
								</option>
							))}
						</select>
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
							onClick={cancelEdit}
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
						Unités existantes ({localUnits.length})
					</h3>
					{showExisting && (
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
										<div
											style={{
												display: 'flex',
												gap: '0.5rem',
												alignItems: 'center',
											}}
										>
											<button
												type="button"
												onClick={() => startEdit(unit)}
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
														const res = await fetch(
															`/api/roleplay/units/${unit.id}`,
															{
																method: 'DELETE',
															},
														);
														if (!res.ok) throw new Error('Erreur suppression');
														setLocalUnits(prev =>
															prev.filter(u => u.id !== unit.id),
														);
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
		</>
	);
}
