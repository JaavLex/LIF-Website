'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RichTextRenderer } from './RichTextRenderer';

const TYPE_LABELS: Record<string, string> = {
	observation: 'Observation',
	interception: 'Interception',
	reconnaissance: 'Reconnaissance',
	infiltration: 'Infiltration',
	sigint: 'SIGINT',
	humint: 'HUMINT',
	other: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
	'to-investigate': 'À vérifier',
	verified: 'Vérifié',
	'false-info': 'Fausse info',
	inconclusive: 'Non concluant',
};

function textToLexical(text: string): any {
	if (!text?.trim()) return undefined;
	const paragraphs = text.split('\n');
	return {
		root: {
			type: 'root',
			children: paragraphs.map(p => ({
				type: 'paragraph',
				children: p.trim()
					? [{ type: 'text', text: p, mode: 'normal', detail: 0, format: 0, style: '', version: 1 }]
					: [],
				direction: 'ltr',
				format: '',
				indent: 0,
				version: 1,
				textFormat: 0,
				textStyle: '',
			})),
			direction: 'ltr',
			format: '',
			indent: 0,
			version: 1,
		},
	};
}

interface IntelReport {
	id: number;
	title: string;
	date: string;
	description: any;
	type: string;
	coordinates?: string;
	media?: { file?: { url: string; mimeType?: string }; caption?: string }[];
	linkedTarget?: { id: number; fullName: string } | null;
	linkedFaction?: { id: number; name: string } | null;
	postedBy?: { id: number; fullName: string } | null;
	postedByDiscordId?: string;
	postedByDiscordUsername?: string;
	status: string;
	classification: string;
}

export function IntelligenceList({
	reports,
	isAdmin,
	hasIntelRole,
	userCharacters,
	allCharacters,
	factions,
	sessionDiscordId,
}: {
	reports: IntelReport[];
	isAdmin: boolean;
	hasIntelRole: boolean;
	userCharacters: { id: number; fullName: string }[];
	allCharacters: { id: number; fullName: string; isTarget?: boolean }[];
	factions: { id: number; name: string }[];
	sessionDiscordId: string | null;
}) {
	const [localReports, setLocalReports] = useState(reports);
	const [filterType, setFilterType] = useState('');
	const [filterStatus, setFilterStatus] = useState('');
	const [expanded, setExpanded] = useState<number | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [mediaFiles, setMediaFiles] = useState<{ file: File; caption: string }[]>([]);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editSubmitting, setEditSubmitting] = useState(false);
	const [editError, setEditError] = useState('');
	const [modalImage, setModalImage] = useState<string | null>(null);

	const [editForm, setEditForm] = useState({
		title: '',
		date: '',
		description: '',
		type: 'observation',
		coordinates: '',
		linkedTarget: '',
		linkedFaction: '',
		postedBy: '',
		classification: 'restricted',
		status: 'to-investigate',
	});
	const [editMediaFiles, setEditMediaFiles] = useState<{ file: File; caption: string }[]>([]);

	const [form, setForm] = useState({
		title: '',
		date: new Date().toISOString().split('T')[0],
		description: '',
		type: 'observation',
		coordinates: '',
		linkedTarget: '',
		linkedFaction: '',
		postedBy: userCharacters[0]?.id?.toString() || '',
		classification: 'restricted',
	});

	const filtered = localReports.filter(r => {
		if (filterType && r.type !== filterType) return false;
		if (filterStatus && r.status !== filterStatus) return false;
		return true;
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		try {
			// Upload media files first
			const uploadedMedia: { file: number; caption: string }[] = [];
			for (const m of mediaFiles) {
				const formData = new FormData();
				formData.append('file', m.file);
				formData.append('alt', m.caption || m.file.name);
				const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
				if (!uploadRes.ok) {
					const errData = await uploadRes.json().catch(() => ({}));
					throw new Error(errData.message || "Erreur lors de l'upload d'un fichier");
				}
				const uploadData = await uploadRes.json();
				uploadedMedia.push({ file: uploadData.id, caption: m.caption });
			}

			const body: any = {
				title: form.title,
				date: form.date,
				description: textToLexical(form.description),
				type: form.type,
				classification: form.classification,
			};
			if (form.coordinates) body.coordinates = form.coordinates;
			if (form.linkedTarget) body.linkedTarget = parseInt(form.linkedTarget);
			if (form.linkedFaction) body.linkedFaction = parseInt(form.linkedFaction);
			if (form.postedBy) body.postedBy = parseInt(form.postedBy);
			if (uploadedMedia.length > 0) body.media = uploadedMedia;

			const res = await fetch('/api/roleplay/intelligence', {
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

	const updateStatus = async (reportId: number, newStatus: string) => {
		try {
			const res = await fetch(`/api/roleplay/intelligence/${reportId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});
			if (res.ok) {
				setLocalReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
			}
		} catch { /* ignore */ }
	};

	// Extract plain text from Lexical JSON for editing
	const lexicalToText = (content: any): string => {
		if (!content?.root?.children) return '';
		return content.root.children
			.map((p: any) => (p.children || []).map((c: any) => c.text || '').join(''))
			.join('\n');
	};

	const startEditing = (report: IntelReport) => {
		setEditingId(report.id);
		setEditError('');
		setEditMediaFiles([]);
		setEditForm({
			title: report.title,
			date: report.date?.split('T')[0] || '',
			description: lexicalToText(report.description),
			type: report.type,
			coordinates: report.coordinates || '',
			linkedTarget: report.linkedTarget?.id?.toString() || '',
			linkedFaction: report.linkedFaction?.id?.toString() || '',
			postedBy: report.postedBy?.id?.toString() || '',
			classification: report.classification,
			status: report.status,
		});
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setEditSubmitting(true);
		setEditError('');
		try {
			// Upload new media files
			const uploadedMedia: { file: number; caption: string }[] = [];
			for (const m of editMediaFiles) {
				const formData = new FormData();
				formData.append('file', m.file);
				formData.append('alt', m.caption || m.file.name);
				const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
				if (!uploadRes.ok) {
					const errData = await uploadRes.json().catch(() => ({}));
					throw new Error(errData.message || "Erreur lors de l'upload d'un fichier");
				}
				const uploadData = await uploadRes.json();
				uploadedMedia.push({ file: uploadData.id, caption: m.caption });
			}

			const body: any = {
				title: editForm.title,
				date: editForm.date,
				description: textToLexical(editForm.description),
				type: editForm.type,
				classification: editForm.classification,
				coordinates: editForm.coordinates || null,
				linkedTarget: editForm.linkedTarget ? parseInt(editForm.linkedTarget) : null,
				linkedFaction: editForm.linkedFaction ? parseInt(editForm.linkedFaction) : null,
				postedBy: editForm.postedBy ? parseInt(editForm.postedBy) : null,
			};

			if (isAdmin) {
				body.status = editForm.status;
			}

			// Only add new media if uploaded, otherwise keep existing
			if (uploadedMedia.length > 0) {
				// Get existing media from report
				const currentReport = reports.find(r => r.id === editingId);
				const existingMedia = (currentReport?.media || [])
					.filter(m => m.file)
					.map(m => ({ file: (m.file as any).id || m.file, caption: m.caption || '' }));
				body.media = [...existingMedia, ...uploadedMedia];
			}

			const res = await fetch(`/api/roleplay/intelligence/${editingId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}

			window.location.reload();
		} catch (err: any) {
			setEditError(err.message || 'Erreur');
		} finally {
			setEditSubmitting(false);
		}
	};

	const canEditReport = (report: IntelReport) => {
		if (isAdmin) return true;
		return sessionDiscordId && report.postedByDiscordId === sessionDiscordId;
	};

	const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.35rem' };

	return (
		<div>
			{/* Filters */}
			<div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
				<div>
					<label style={labelStyle}>Type</label>
					<select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
						<option value="">Tous les types</option>
						{Object.entries(TYPE_LABELS).map(([k, v]) => (
							<option key={k} value={k}>{v}</option>
						))}
					</select>
				</div>
				{isAdmin && (
					<div>
						<label style={labelStyle}>Statut</label>
						<select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
							<option value="">Tous les statuts</option>
							{Object.entries(STATUS_LABELS).map(([k, v]) => (
								<option key={k} value={k}>{v}</option>
							))}
						</select>
					</div>
				)}
				<div style={{ marginLeft: 'auto' }}>
					<span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
						{filtered.length} rapport{filtered.length !== 1 ? 's' : ''}
					</span>
				</div>
				{hasIntelRole && (
					<button
						type="button"
						onClick={() => setShowForm(!showForm)}
						className="session-btn"
						style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
					>
						{showForm ? 'Annuler' : '+ Nouveau rapport'}
					</button>
				)}
			</div>

			{/* Create Form */}
			{showForm && (
				<div style={{ border: '1px solid var(--primary)', padding: '1.5rem', marginBottom: '1.5rem', background: 'rgba(139, 69, 19, 0.05)' }}>
					<h2 style={{ color: 'var(--primary)', marginTop: 0 }}>Nouveau rapport de renseignement</h2>
					{error && (
						<div style={{ padding: '0.75rem', background: 'rgba(139,38,53,0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>
							{error}
						</div>
					)}
					<form onSubmit={handleSubmit}>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
							<div>
								<label style={labelStyle}>Titre *</label>
								<input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="filter-input" style={{ width: '100%' }} />
							</div>
							<div>
								<label style={labelStyle}>Date *</label>
								<input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="filter-input" style={{ width: '100%' }} />
							</div>
						</div>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
							<div>
								<label style={labelStyle}>Type *</label>
								<select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
									{Object.entries(TYPE_LABELS).map(([k, v]) => (
										<option key={k} value={k}>{v}</option>
									))}
								</select>
							</div>
							<div>
								<label style={labelStyle}>Classification</label>
								<select value={form.classification} onChange={e => setForm(f => ({ ...f, classification: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
									<option value="public">Public</option>
									<option value="restricted">Restreint</option>
									<option value="classified">Classifié</option>
								</select>
							</div>
						</div>
						<div style={{ marginBottom: '1rem' }}>
							<label style={labelStyle}>Description *</label>
							<textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required className="filter-input" style={{ width: '100%', minHeight: '120px', resize: 'vertical' }} />
						</div>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
							<div>
								<label style={labelStyle}>Coordonnées</label>
								<input type="text" value={form.coordinates} onChange={e => setForm(f => ({ ...f, coordinates: e.target.value }))} className="filter-input" style={{ width: '100%' }} placeholder="Ex: 48.8566, 2.3522" />
							</div>
							<div>
								<label style={labelStyle}>Rapporté par</label>
								<select value={form.postedBy} onChange={e => setForm(f => ({ ...f, postedBy: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
									<option value="">— Aucun —</option>
									{userCharacters.map(c => (
										<option key={c.id} value={c.id}>{c.fullName}</option>
									))}
								</select>
							</div>
						</div>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
							<div>
								<label style={labelStyle}>Cible liée</label>
								<select value={form.linkedTarget} onChange={e => setForm(f => ({ ...f, linkedTarget: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
									<option value="">— Aucune —</option>
									{allCharacters.filter(c => c.isTarget).map(c => (
										<option key={c.id} value={c.id}>{c.fullName}</option>
									))}
								</select>
							</div>
							<div>
								<label style={labelStyle}>Faction liée</label>
								<select value={form.linkedFaction} onChange={e => setForm(f => ({ ...f, linkedFaction: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
									<option value="">— Aucune —</option>
									{factions.map(f => (
										<option key={f.id} value={f.id}>{f.name}</option>
									))}
								</select>
							</div>
						</div>
						<div style={{ marginBottom: '1rem' }}>
							<label style={labelStyle}>Photos / Fichiers joints</label>
							{mediaFiles.map((m, i) => (
								<div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
									<span style={{ fontSize: '0.8rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.file.name}</span>
									<input
										type="text"
										value={m.caption}
										onChange={e => {
											const updated = [...mediaFiles];
											updated[i] = { ...updated[i], caption: e.target.value };
											setMediaFiles(updated);
										}}
										className="filter-input"
										style={{ width: '200px' }}
										placeholder="Légende (optionnel)"
									/>
									<button type="button" onClick={() => setMediaFiles(mediaFiles.filter((_, j) => j !== i))} style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0 0.5rem', cursor: 'pointer' }}>×</button>
								</div>
							))}
							<button
								type="button"
								onClick={() => {
									const input = document.createElement('input');
									input.type = 'file';
									input.accept = 'image/*,.pdf,.doc,.docx';
									input.multiple = true;
									input.onchange = () => {
										if (input.files) {
											const newFiles = Array.from(input.files).map(f => ({ file: f, caption: '' }));
											setMediaFiles(prev => [...prev, ...newFiles]);
										}
									};
									input.click();
								}}
								style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--muted)', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.8rem' }}
							>
								+ Ajouter des fichiers
							</button>
						</div>
						<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
							<button type="button" onClick={() => setShowForm(false)} className="session-btn" style={{ padding: '0.5rem 1rem' }}>Annuler</button>
							<button type="submit" disabled={submitting} className="discord-login-btn" style={{ background: 'var(--primary)', padding: '0.5rem 1rem', opacity: submitting ? 0.6 : 1 }}>
								{submitting ? 'Envoi...' : 'Envoyer le rapport'}
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Reports list */}
			{filtered.length === 0 ? (
				<div className="empty-state-inline">Aucun rapport de renseignement.</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
					{filtered.map(report => (
						<div key={report.id} className="intel-report" style={{ border: '1px solid var(--border)', padding: '1rem', background: 'var(--bg-secondary)', cursor: 'pointer' }} onClick={() => setExpanded(expanded === report.id ? null : report.id)}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
								<div style={{ flex: 1 }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
										<span className={`classification-badge ${report.classification}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
											{report.classification}
										</span>
										<span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
											{TYPE_LABELS[report.type] || report.type}
										</span>
										{isAdmin && (
											<span style={{
												fontSize: '0.7rem',
												padding: '0.1rem 0.4rem',
												border: '1px solid',
												borderColor: report.status === 'verified' ? 'var(--accent)' : report.status === 'false-info' ? 'var(--danger)' : 'var(--muted)',
												color: report.status === 'verified' ? 'var(--accent)' : report.status === 'false-info' ? 'var(--danger)' : 'var(--muted)',
											}}>
												{STATUS_LABELS[report.status] || report.status}
											</span>
										)}
									</div>
									<h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>{report.title}</h3>
									<div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
										{new Date(report.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
										{report.postedBy && <> — Rapporté par <Link href={`/roleplay/personnage/${report.postedBy.id}`} style={{ color: 'var(--primary)' }} onClick={e => e.stopPropagation()}>{report.postedBy.fullName}</Link></>}
									</div>
								</div>
								<span style={{ color: 'var(--muted)', fontSize: '0.8rem', flexShrink: 0 }}>
									{expanded === report.id ? '▲' : '▼'}
								</span>
							</div>

							{expanded === report.id && (
								<div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
									<div className="character-section-content" style={{ marginBottom: '1rem' }}>
										<RichTextRenderer content={report.description} />
									</div>

									{report.coordinates && (
										<div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
											<strong>Coordonnées:</strong> {report.coordinates}
										</div>
									)}

									{report.linkedTarget && (
										<div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
											<strong>Cible liée:</strong>{' '}
											<Link href={`/roleplay/personnage/${report.linkedTarget.id}`} style={{ color: 'var(--danger)' }} onClick={e => e.stopPropagation()}>
												{report.linkedTarget.fullName}
											</Link>
										</div>
									)}

									{report.linkedFaction && (
										<div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
											<strong>Faction liée:</strong> {report.linkedFaction.name}
										</div>
									)}

									{report.media && report.media.length > 0 && (
										<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
											{report.media.map((m, i) => (
												m.file?.url && (
													<div key={i} style={{ border: '1px solid var(--border)', padding: '0.25rem' }}>
														{m.file.mimeType?.startsWith('image/') ? (
															<Image
																src={m.file.url}
																alt={m.caption || ''}
																width={200}
																height={150}
																style={{ objectFit: 'cover', cursor: 'pointer' }}
																unoptimized
																onClick={e => { e.stopPropagation(); setModalImage(m.file!.url); }}
															/>
														) : (
															<a href={m.file.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '0.85rem' }} onClick={e => e.stopPropagation()}>
																{m.caption || 'Fichier'}
															</a>
														)}
														{m.caption && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>{m.caption}</div>}
													</div>
												)
											))}
										</div>
									)}

									{/* Edit button */}
									{canEditReport(report) && editingId !== report.id && (
										<div style={{ marginTop: '0.75rem' }}>
											<button
												type="button"
												onClick={e => { e.stopPropagation(); startEditing(report); }}
												className="session-btn"
												style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
											>
												✏️ Modifier
											</button>
										</div>
									)}

									{/* Edit form */}
									{editingId === report.id && (
										<div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--primary)', background: 'rgba(139, 69, 19, 0.05)', padding: '1rem' }} onClick={e => e.stopPropagation()}>
											<h3 style={{ color: 'var(--primary)', marginTop: 0, fontSize: '1rem' }}>Modifier le rapport</h3>
											{editError && (
												<div style={{ padding: '0.5rem 0.75rem', background: 'rgba(139,38,53,0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
													{editError}
												</div>
											)}
											<form onSubmit={handleEditSubmit}>
												<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
													<div>
														<label style={labelStyle}>Titre *</label>
														<input type="text" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required className="filter-input" style={{ width: '100%' }} />
													</div>
													<div>
														<label style={labelStyle}>Date *</label>
														<input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} required className="filter-input" style={{ width: '100%' }} />
													</div>
												</div>
												<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
													<div>
														<label style={labelStyle}>Type *</label>
														<select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
															{Object.entries(TYPE_LABELS).map(([k, v]) => (
																<option key={k} value={k}>{v}</option>
															))}
														</select>
													</div>
													<div>
														<label style={labelStyle}>Classification</label>
														<select value={editForm.classification} onChange={e => setEditForm(f => ({ ...f, classification: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
															<option value="public">Public</option>
															<option value="restricted">Restreint</option>
															<option value="classified">Classifié</option>
														</select>
													</div>
												</div>
												<div style={{ marginBottom: '0.75rem' }}>
													<label style={labelStyle}>Description *</label>
													<textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} required className="filter-input" style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} />
												</div>
												<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
													<div>
														<label style={labelStyle}>Coordonnées</label>
														<input type="text" value={editForm.coordinates} onChange={e => setEditForm(f => ({ ...f, coordinates: e.target.value }))} className="filter-input" style={{ width: '100%' }} />
													</div>
													<div>
														<label style={labelStyle}>Rapporté par</label>
														<select value={editForm.postedBy} onChange={e => setEditForm(f => ({ ...f, postedBy: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
															<option value="">— Aucun —</option>
															{isAdmin
																? allCharacters.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)
																: userCharacters.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)
															}
														</select>
													</div>
												</div>
												<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
													<div>
														<label style={labelStyle}>Cible liée</label>
														<select value={editForm.linkedTarget} onChange={e => setEditForm(f => ({ ...f, linkedTarget: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
															<option value="">— Aucune —</option>
															{allCharacters.filter(c => c.isTarget).map(c => (
																<option key={c.id} value={c.id}>{c.fullName}</option>
															))}
														</select>
													</div>
													<div>
														<label style={labelStyle}>Faction liée</label>
														<select value={editForm.linkedFaction} onChange={e => setEditForm(f => ({ ...f, linkedFaction: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
															<option value="">— Aucune —</option>
															{factions.map(f => (
																<option key={f.id} value={f.id}>{f.name}</option>
															))}
														</select>
													</div>
												</div>
												{isAdmin && (
													<div style={{ marginBottom: '0.75rem' }}>
														<label style={labelStyle}>Statut</label>
														<select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="filter-select" style={{ width: '100%' }}>
															{Object.entries(STATUS_LABELS).map(([k, v]) => (
																<option key={k} value={k}>{v}</option>
															))}
														</select>
													</div>
												)}
												<div style={{ marginBottom: '0.75rem' }}>
													<label style={labelStyle}>Ajouter des fichiers</label>
													{editMediaFiles.map((m, i) => (
														<div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
															<span style={{ fontSize: '0.8rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.file.name}</span>
															<input type="text" value={m.caption} onChange={e => { const u = [...editMediaFiles]; u[i] = { ...u[i], caption: e.target.value }; setEditMediaFiles(u); }} className="filter-input" style={{ width: '200px' }} placeholder="Légende" />
															<button type="button" onClick={() => setEditMediaFiles(editMediaFiles.filter((_, j) => j !== i))} style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0 0.5rem', cursor: 'pointer' }}>×</button>
														</div>
													))}
													<button type="button" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*,.pdf,.doc,.docx'; input.multiple = true; input.onchange = () => { if (input.files) { setEditMediaFiles(prev => [...prev, ...Array.from(input.files!).map(f => ({ file: f, caption: '' }))]); } }; input.click(); }} style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--muted)', padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}>
														+ Ajouter des fichiers
													</button>
												</div>
												<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
													<button type="button" onClick={() => setEditingId(null)} className="session-btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Annuler</button>
													<button type="submit" disabled={editSubmitting} className="discord-login-btn" style={{ background: 'var(--primary)', padding: '0.4rem 0.75rem', fontSize: '0.85rem', opacity: editSubmitting ? 0.6 : 1 }}>
														{editSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
													</button>
												</div>
											</form>
										</div>
									)}

									{/* Admin controls */}
									{isAdmin && (
										<div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
											<span style={{ fontSize: '0.8rem', color: 'var(--muted)', alignSelf: 'center' }}>Statut:</span>
											{Object.entries(STATUS_LABELS).map(([k, v]) => (
												<button
													key={k}
													type="button"
													onClick={e => { e.stopPropagation(); updateStatus(report.id, k); }}
													style={{
														padding: '0.25rem 0.5rem',
														fontSize: '0.75rem',
														cursor: 'pointer',
														background: report.status === k ? 'var(--primary)' : 'transparent',
														color: report.status === k ? 'var(--bg)' : 'var(--muted)',
														border: `1px solid ${report.status === k ? 'var(--primary)' : 'var(--border)'}`,
													}}
												>
													{v}
												</button>
											))}
										</div>
									)}
								</div>
							)}
						</div>
					))}
				</div>
			)}
			{/* Image Modal */}
			{modalImage && (
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
						cursor: 'pointer',
					}}
					onClick={() => setModalImage(null)}
				>
					<div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
						<button
							onClick={() => setModalImage(null)}
							style={{
								position: 'absolute',
								top: '-2rem',
								right: '-0.5rem',
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
						<Image
							src={modalImage}
							alt=""
							width={1200}
							height={900}
							style={{ objectFit: 'contain', maxWidth: '90vw', maxHeight: '90vh', width: 'auto', height: 'auto' }}
							unoptimized
						/>
					</div>
				</div>
			)}
		</div>
	);
}
