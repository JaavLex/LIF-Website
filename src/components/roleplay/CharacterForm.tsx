'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// Convert plain text to Lexical JSON for Payload richText fields
function textToLexical(text: string): any {
	if (!text || !text.trim()) return undefined;
	const paragraphs = text.split('\n');
	return {
		root: {
			type: 'root',
			children: paragraphs.map(p => ({
				type: 'paragraph',
				children: p.trim()
					? [
							{
								type: 'text',
								text: p,
								mode: 'normal',
								detail: 0,
								format: 0,
								style: '',
								version: 1,
							},
						]
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

// Convert Lexical JSON to plain text for editing in textarea
function lexicalToText(content: any): string {
	if (!content) return '';
	if (typeof content === 'string') return content;
	if (!content.root?.children) return '';
	return content.root.children
		.map((node: any) => {
			if (node.children) {
				return node.children.map((child: any) => child.text || '').join('');
			}
			return '';
		})
		.join('\n');
}

interface SessionUser {
	userId: number;
	discordId: string;
	discordUsername: string;
	discordAvatar: string;
	roles: string[];
}

interface Rank {
	id: number;
	name: string;
	abbreviation: string;
	order: number;
	discordRoleId?: string;
	icon?: { url: string } | null;
}

interface Unit {
	id: number;
	name: string;
}

interface Faction {
	id: number;
	name: string;
	type?: string;
}

export function CharacterForm({
	ranks,
	units,
	factions,
	editData,
	isAdmin,
	allCharacters,
	allUsers,
}: {
	ranks: Rank[];
	units: Unit[];
	factions?: Faction[];
	editData?: any;
	isAdmin?: boolean;
	allCharacters?: { id: number; fullName: string }[];
	allUsers?: { discordId: string; discordUsername: string }[];
}) {
	const router = useRouter();
	const [user, setUser] = useState<SessionUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(
		editData?.avatar?.url || null,
	);
	const [specialisations, setSpecialisations] = useState<string[]>(
		editData?.specialisations?.map((s: any) => s.name) || [''],
	);
	const [linkedDiscordId, setLinkedDiscordId] = useState<string>(
		editData?.discordId || '',
	);

	const [form, setForm] = useState({
		firstName: editData?.firstName || '',
		lastName: editData?.lastName || '',
		dateOfBirth: editData?.dateOfBirth?.split('T')[0] || '',
		placeOfOrigin: editData?.placeOfOrigin || '',
		height: editData?.height || '',
		weight: editData?.weight || '',
		physicalDescription: editData?.physicalDescription || '',
		motto: editData?.motto || '',
		previousUnit: editData?.previousUnit || '',
		faction: editData?.faction || '',
		unit: editData?.unit?.id || editData?.unit || '',
		isMainCharacter: editData?.isMainCharacter || false,
		civilianBackground: lexicalToText(editData?.civilianBackground),
		militaryBackground: lexicalToText(editData?.militaryBackground),
		legalBackground: lexicalToText(editData?.legalBackground),
		// Admin-only fields
		status: editData?.status || 'in-service',
		rank: editData?.rank?.id || editData?.rank || '',
		isTarget: editData?.isTarget || false,
		targetFaction: editData?.targetFaction || '',
		threatLevel: editData?.threatLevel || '',
		classification: editData?.classification || 'public',
		miscellaneous: lexicalToText(editData?.miscellaneous),
		etatMajorNotes: lexicalToText(editData?.etatMajorNotes),
		superiorOfficer:
			editData?.superiorOfficer?.id || editData?.superiorOfficer || '',
		isArchived: editData?.isArchived || false,
		archiveReason: editData?.archiveReason || '',
		rankOverride: editData?.rankOverride || false,
		isNpc: editData ? !editData.discordId : false,
	});

	// Determine rank from Discord roles
	const detectedRank = (() => {
		if (!user) return null;
		// Find the highest rank matching user's Discord roles
		const matchingRanks = ranks
			.filter(r => r.discordRoleId && user.roles.includes(r.discordRoleId))
			.sort((a, b) => b.order - a.order);
		return matchingRanks[0] || ranks.find(r => r.order === 1) || null;
	})();

	useEffect(() => {
		fetch('/api/auth/me')
			.then(res => (res.ok ? res.json() : null))
			.then(data => {
				if (data?.authenticated) setUser(data.user);
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
	) => {
		const target = e.target;
		if (target instanceof HTMLInputElement && target.type === 'checkbox') {
			setForm(prev => ({ ...prev, [target.name]: target.checked }));
		} else {
			setForm(prev => ({ ...prev, [target.name]: target.value }));
		}
	};

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setAvatarFile(file);
			setAvatarPreview(URL.createObjectURL(file));
		}
	};

	const addSpecialisation = () => setSpecialisations(prev => [...prev, '']);
	const removeSpecialisation = (index: number) =>
		setSpecialisations(prev => prev.filter((_, i) => i !== index));
	const updateSpecialisation = (index: number, value: string) =>
		setSpecialisations(prev => prev.map((s, i) => (i === index ? value : s)));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const isNpcMode = isAdmin && form.isNpc;
		if (!user && !isNpcMode) return;
		setSubmitting(true);
		setError('');

		try {
			// Upload avatar if changed
			let avatarId = editData?.avatar?.id || editData?.avatar || undefined;
			if (avatarFile) {
				const formData = new FormData();
				formData.append('file', avatarFile);
				formData.append('alt', `Photo de ${form.firstName} ${form.lastName}`);
				const uploadRes = await fetch('/api/upload', {
					method: 'POST',
					body: formData,
				});
				if (uploadRes.ok) {
					const uploadData = await uploadRes.json();
					avatarId = uploadData.id;
				} else {
					const errData = await uploadRes.json().catch(() => ({}));
					throw new Error(errData.message || "Erreur lors de l'upload de l'avatar");
				}
			}

			const body: any = {
				firstName: form.firstName,
				lastName: form.lastName,
				placeOfOrigin: form.placeOfOrigin || undefined,
				physicalDescription: form.physicalDescription || undefined,
				motto: form.motto || undefined,
				previousUnit: form.previousUnit || undefined,
				isMainCharacter: form.isMainCharacter,
			};

			// Only set discord info for non-NPC characters on CREATE (not edit)
			if (!editData && !isNpcMode && user) {
				body.discordId = user.discordId;
				body.discordUsername = user.discordUsername;
			} else if (isNpcMode) {
				body.isNpc = true;
			}

			if (form.dateOfBirth) body.dateOfBirth = form.dateOfBirth;
			if (form.height) body.height = parseInt(form.height);
			if (form.weight) body.weight = parseInt(form.weight);
			if (form.unit) body.unit = parseInt(form.unit);
			if (avatarId) body.avatar = avatarId;

			// Specialisations
			const filteredSpecs = specialisations.filter(s => s.trim());
			if (filteredSpecs.length > 0) {
				body.specialisations = filteredSpecs.map(s => ({ name: s }));
			}

			// Rich text backgrounds: convert plain text to Lexical JSON
			const civilianLexical = textToLexical(form.civilianBackground);
			const militaryLexical = textToLexical(form.militaryBackground);
			const legalLexical = textToLexical(form.legalBackground);
			if (civilianLexical) body.civilianBackground = civilianLexical;
			if (militaryLexical) body.militaryBackground = militaryLexical;
			if (legalLexical) body.legalBackground = legalLexical;

			// Rank: auto-detected from Discord roles (not user-settable) — only for non-NPC
			if (detectedRank && !editData && !isNpcMode) {
				body.rank = detectedRank.id;
			}

			// Admin-only fields
			if (isAdmin) {
				body.status = form.status;
				if (form.rank) body.rank = parseInt(form.rank);
				body.faction = form.faction || undefined;
				body.isTarget = form.isTarget;
				if (form.isTarget && form.targetFaction)
					body.targetFaction = form.targetFaction;
				if (form.isTarget && form.threatLevel) body.threatLevel = form.threatLevel;
				body.classification = form.classification;
				body.rankOverride = form.rankOverride;
				if (form.superiorOfficer)
					body.superiorOfficer = parseInt(form.superiorOfficer);
				body.isArchived = form.isArchived;
				if (form.isArchived && form.archiveReason)
					body.archiveReason = form.archiveReason;

				const miscLexical = textToLexical(form.miscellaneous);
				if (miscLexical) body.miscellaneous = miscLexical;
				const notesLexical = textToLexical(form.etatMajorNotes);
				if (notesLexical) body.etatMajorNotes = notesLexical;

				// Admin reassign linked Discord account
				if (editData && linkedDiscordId && linkedDiscordId !== editData.discordId) {
					const selectedUser = allUsers?.find(u => u.discordId === linkedDiscordId);
					body.linkedDiscordId = linkedDiscordId;
					body.linkedDiscordUsername = selectedUser?.discordUsername || '';
				}
			}

			const url = editData
				? `/api/roleplay/characters/${editData.id}`
				: '/api/roleplay/characters';

			const res = await fetch(url, {
				method: editData ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur lors de la sauvegarde');
			}

			const result = await res.json();
			router.push(`/roleplay/personnage/${result.doc?.id || result.id}`);
		} catch (err: any) {
			setError(err.message || 'Une erreur est survenue');
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div
				className="terminal-panel"
				style={{ textAlign: 'center', padding: '3rem' }}
			>
				<p style={{ color: 'var(--muted)' }}>Chargement...</p>
			</div>
		);
	}

	if (!user && !isAdmin) {
		return (
			<div className="terminal-panel">
				<div className="auth-section">
					<h2>Authentification requise</h2>
					<p>
						Vous devez être connecté via Discord pour créer ou modifier un
						personnage.
					</p>
					<a href="/api/auth/discord" className="discord-login-btn">
						Connexion Discord
					</a>
				</div>
			</div>
		);
	}

	const labelStyle = {
		display: 'block' as const,
		fontSize: '0.8rem',
		color: 'var(--muted)',
		marginBottom: '0.35rem',
	};
	const gridTwo = {
		display: 'grid',
		gridTemplateColumns: '1fr 1fr',
		gap: '1rem',
		marginBottom: '1rem',
	};

	return (
		<form onSubmit={handleSubmit}>
			<div className="terminal-panel">
				<h1>{editData ? 'Modifier le dossier' : 'Nouveau dossier personnel'}</h1>

				{error && (
					<div
						style={{
							padding: '0.75rem 1rem',
							background: 'rgba(139, 38, 53, 0.15)',
							border: '1px solid var(--danger)',
							color: 'var(--danger)',
							marginBottom: '1.5rem',
							fontSize: '0.9rem',
						}}
					>
						{error}
					</div>
				)}

				{/* --- Avatar & Rank Detection --- */}
				<div
					style={{
						display: 'flex',
						gap: '2rem',
						marginBottom: '2rem',
						alignItems: 'flex-start',
					}}
				>
					<div>
						<label style={labelStyle}>Photo du personnage</label>
						<div
							style={{
								width: 120,
								height: 120,
								border: '2px dashed var(--border)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								overflow: 'hidden',
								cursor: 'pointer',
								position: 'relative',
							}}
							onClick={() => document.getElementById('avatar-upload')?.click()}
						>
							{avatarPreview ? (
								<Image
									src={avatarPreview}
									alt="Avatar"
									fill
									style={{ objectFit: 'cover' }}
								/>
							) : (
								<span
									style={{
										color: 'var(--muted)',
										fontSize: '0.8rem',
										textAlign: 'center',
									}}
								>
									Cliquer pour
									<br />
									ajouter
								</span>
							)}
						</div>
						<input
							id="avatar-upload"
							type="file"
							accept="image/*"
							onChange={handleAvatarChange}
							style={{ display: 'none' }}
						/>
					</div>

					<div style={{ flex: 1 }}>
						{!(isAdmin && form.isNpc) && (
							<>
								<label style={labelStyle}>Grade détecté (via Discord)</label>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.75rem',
										padding: '0.75rem',
										background: 'var(--bg-tertiary)',
										border: '1px solid var(--border)',
									}}
								>
									{detectedRank?.icon?.url && (
										<Image
											src={detectedRank.icon.url}
											alt={detectedRank.name}
											width={32}
											height={32}
										/>
									)}
									<div>
										<div style={{ fontWeight: 600 }}>
											{detectedRank?.name || 'Aucun grade détecté'}
										</div>
										{detectedRank && (
											<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
												{detectedRank.abbreviation}
											</div>
										)}
									</div>
								</div>
								<p
									style={{
										fontSize: '0.7rem',
										color: 'var(--muted)',
										marginTop: '0.35rem',
									}}
								>
									Le grade est déterminé automatiquement par vos rôles Discord.
								</p>
							</>
						)}

						{isAdmin && form.isNpc && (
							<div
								style={{
									padding: '0.75rem',
									background: 'rgba(139, 69, 19, 0.1)',
									border: '1px solid var(--primary)',
									marginBottom: '0.5rem',
								}}
							>
								<span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
									Mode PNJ — Pas de compte Discord lié
								</span>
							</div>
						)}

						<div style={{ marginTop: '1rem' }}>
							<label
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									cursor: 'pointer',
								}}
							>
								<input
									type="checkbox"
									name="isMainCharacter"
									checked={form.isMainCharacter}
									onChange={handleChange}
								/>
								<span style={{ fontSize: '0.85rem' }}>Personnage principal</span>
							</label>
						</div>
					</div>
				</div>

				{/* --- Identité --- */}
				<div style={{ border: 'none', padding: 0, background: 'transparent' }}>
					<h2 style={{ color: 'var(--primary)' }}>Identité</h2>

					<div style={gridTwo}>
						<div>
							<label style={labelStyle}>Prénom *</label>
							<input
								type="text"
								name="firstName"
								value={form.firstName}
								onChange={handleChange}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Nom *</label>
							<input
								type="text"
								name="lastName"
								value={form.lastName}
								onChange={handleChange}
								required
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
					</div>

					<div style={gridTwo}>
						<div>
							<label style={labelStyle}>Date de naissance</label>
							<input
								type="date"
								name="dateOfBirth"
								value={form.dateOfBirth}
								onChange={handleChange}
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Lieu d&apos;origine</label>
							<input
								type="text"
								name="placeOfOrigin"
								value={form.placeOfOrigin}
								onChange={handleChange}
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
					</div>

					<div style={gridTwo}>
						<div>
							<label style={labelStyle}>Taille (cm)</label>
							<input
								type="number"
								name="height"
								value={form.height}
								onChange={handleChange}
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label style={labelStyle}>Poids (kg)</label>
							<input
								type="number"
								name="weight"
								value={form.weight}
								onChange={handleChange}
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
					</div>

					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Description physique</label>
						<textarea
							name="physicalDescription"
							value={form.physicalDescription}
							onChange={handleChange}
							className="filter-input"
							style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
						/>
					</div>

					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Devise</label>
						<input
							type="text"
							name="motto"
							value={form.motto}
							onChange={handleChange}
							className="filter-input"
							style={{ width: '100%' }}
						/>
					</div>
				</div>

				{/* --- Parcours --- */}
				<div
					style={{
						border: 'none',
						padding: 0,
						background: 'transparent',
						marginTop: '1.5rem',
					}}
				>
					<h2 style={{ color: 'var(--primary)' }}>Parcours</h2>

					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Parcours civil</label>
						<textarea
							name="civilianBackground"
							value={form.civilianBackground}
							onChange={handleChange}
							className="filter-input"
							style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
							placeholder="Décrivez le parcours civil du personnage..."
						/>
					</div>

					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Parcours militaire</label>
						<textarea
							name="militaryBackground"
							value={form.militaryBackground}
							onChange={handleChange}
							className="filter-input"
							style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
							placeholder="Décrivez le parcours militaire du personnage..."
						/>
					</div>

					<div style={{ marginBottom: '1rem' }}>
						<label style={labelStyle}>Parcours judiciaire</label>
						<textarea
							name="legalBackground"
							value={form.legalBackground}
							onChange={handleChange}
							className="filter-input"
							style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
							placeholder="Casier judiciaire, infractions, etc."
						/>
					</div>
				</div>

				{/* --- Spécialisations --- */}
				<div
					style={{
						border: 'none',
						padding: 0,
						background: 'transparent',
						marginTop: '1.5rem',
					}}
				>
					<h2 style={{ color: 'var(--primary)' }}>Spécialisations</h2>
					{specialisations.map((spec, i) => (
						<div
							key={i}
							style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}
						>
							<input
								type="text"
								value={spec}
								onChange={e => updateSpecialisation(i, e.target.value)}
								className="filter-input"
								style={{ flex: 1 }}
								placeholder="Ex: Tireur d'élite, Médecin de combat..."
							/>
							<button
								type="button"
								onClick={() => removeSpecialisation(i)}
								style={{
									background: 'none',
									border: '1px solid var(--danger)',
									color: 'var(--danger)',
									padding: '0 0.5rem',
									cursor: 'pointer',
								}}
							>
								×
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={addSpecialisation}
						style={{
							background: 'none',
							border: '1px dashed var(--border)',
							color: 'var(--muted)',
							padding: '0.4rem 1rem',
							cursor: 'pointer',
							fontSize: '0.8rem',
						}}
					>
						+ Ajouter une spécialisation
					</button>
				</div>

				{/* --- Affectation --- */}
				<div
					style={{
						border: 'none',
						padding: 0,
						background: 'transparent',
						marginTop: '1.5rem',
					}}
				>
					<h2 style={{ color: 'var(--primary)' }}>Affectation</h2>

					<div style={gridTwo}>
						<div>
							<label style={labelStyle}>Unité</label>
							<select
								name="unit"
								value={form.unit}
								onChange={handleChange}
								className="filter-select"
								style={{ width: '100%' }}
							>
								<option value="">— Aucune —</option>
								{units.map(u => (
									<option key={u.id} value={u.id}>
										{u.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label style={labelStyle}>Unité précédente</label>
							<input
								type="text"
								name="previousUnit"
								value={form.previousUnit}
								onChange={handleChange}
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
					</div>
				</div>

				{/* --- Admin-only section --- */}
				{isAdmin && (
					<div
						style={{
							border: '1px solid var(--primary)',
							padding: '1.5rem',
							marginTop: '1.5rem',
							background: 'rgba(139, 69, 19, 0.05)',
						}}
					>
						<h2 style={{ color: 'var(--primary)', marginTop: 0 }}>Administration</h2>

						{/* Linked Discord account — only on edit */}
						{editData && allUsers && allUsers.length > 0 && (
							<div
								style={{
									marginBottom: '1rem',
									paddingBottom: '1rem',
									borderBottom: '1px solid var(--border)',
								}}
							>
								<label style={labelStyle}>Compte Discord lié</label>
								<select
									value={linkedDiscordId}
									onChange={(e) => setLinkedDiscordId(e.target.value)}
									className="filter-select"
									style={{ width: '100%' }}
								>
									<option value="">— Aucun (PNJ) —</option>
									{allUsers.map(u => (
										<option key={u.discordId} value={u.discordId}>
											{u.discordUsername} ({u.discordId})
										</option>
									))}
								</select>
								{linkedDiscordId !== (editData.discordId || '') && (
									<p style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
										⚠ Le compte Discord lié sera modifié à la sauvegarde.
									</p>
								)}
							</div>
						)}

						{/* NPC toggle - only on create */}
						{!editData && (
							<div
								style={{
									marginBottom: '1rem',
									paddingBottom: '1rem',
									borderBottom: '1px solid var(--border)',
								}}
							>
								<label
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										cursor: 'pointer',
									}}
								>
									<input
										type="checkbox"
										name="isNpc"
										checked={form.isNpc}
										onChange={handleChange}
									/>
									<span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
										Fiche PNJ (non lié à un compte Discord)
									</span>
								</label>
								<p
									style={{
										fontSize: '0.7rem',
										color: 'var(--muted)',
										marginTop: '0.25rem',
										marginLeft: '1.5rem',
									}}
								>
									Le personnage ne sera pas lié à un compte Discord et le grade ne
									sera pas requis.
								</p>
							</div>
						)}

						<div style={gridTwo}>
							<div>
								<label style={labelStyle}>
									{form.isNpc ? 'Grade' : 'Grade (override admin)'}
								</label>
								<select
									name="rank"
									value={form.rank}
									onChange={handleChange}
									className="filter-select"
									style={{ width: '100%' }}
								>
									<option value="">
										{form.isNpc ? '— Aucun grade —' : '— Auto (Discord) —'}
									</option>
									{ranks.map(r => (
										<option key={r.id} value={r.id}>
											{r.name}
										</option>
									))}
								</select>
							</div>
							<div>
								<label style={labelStyle}>Statut</label>
								<select
									name="status"
									value={form.status}
									onChange={handleChange}
									className="filter-select"
									style={{ width: '100%' }}
								>
									<option value="in-service">En service</option>
									<option value="kia">KIA (Mort au combat)</option>
									<option value="mia">MIA (Disparu)</option>
									<option value="retired">Retraité</option>
									<option value="honourable-discharge">Réformé avec honneur</option>
									<option value="dishonourable-discharge">
										Réformé sans honneur
									</option>
									<option value="executed">Exécuté</option>
								</select>
							</div>
						</div>

						<div style={gridTwo}>
							<div>
								<label style={labelStyle}>Classification</label>
								<select
									name="classification"
									value={form.classification}
									onChange={handleChange}
									className="filter-select"
									style={{ width: '100%' }}
								>
									<option value="public">Public</option>
									<option value="restricted">Restreint</option>
									<option value="classified">Classifié</option>
								</select>
							</div>
							<div>
								<label style={labelStyle}>Officier supérieur</label>
								<select
									name="superiorOfficer"
									value={form.superiorOfficer}
									onChange={handleChange}
									className="filter-select"
									style={{ width: '100%' }}
								>
									<option value="">— Aucun —</option>
									{(allCharacters || []).map(c => (
										<option key={c.id} value={c.id}>
											{c.fullName}
										</option>
									))}
								</select>
							</div>
						</div>

						<div style={gridTwo}>
							<div>
								<label style={labelStyle}>Faction</label>
								<select
									name="faction"
									value={form.faction}
									onChange={handleChange}
									className="filter-select"
									style={{ width: '100%' }}
								>
									<option value="">— Aucune —</option>
									{(factions || []).map(f => (
										<option key={f.id} value={f.name}>
											{f.name}{f.type ? ` (${f.type})` : ''}
										</option>
									))}
								</select>
							</div>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '0.5rem',
									justifyContent: 'flex-end',
								}}
							>
								<label
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										cursor: 'pointer',
									}}
								>
									<input
										type="checkbox"
										name="rankOverride"
										checked={form.rankOverride}
										onChange={handleChange}
									/>
									<span style={{ fontSize: '0.85rem' }}>
										Grade forcé (désactive sync Discord)
									</span>
								</label>
								<label
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										cursor: 'pointer',
									}}
								>
									<input
										type="checkbox"
										name="isTarget"
										checked={form.isTarget}
										onChange={handleChange}
									/>
									<span style={{ fontSize: '0.85rem' }}>Cible / Ennemi</span>
								</label>
							</div>
						</div>

						{form.isTarget && (
							<div style={{ marginTop: '0.5rem' }}>
								<div style={gridTwo}>
									<div>
										<label style={labelStyle}>Faction de la cible</label>
										<select
											name="targetFaction"
											value={form.targetFaction}
											onChange={handleChange}
											className="filter-select"
											style={{ width: '100%' }}
										>
											<option value="">— Aucune —</option>
											{(factions || []).map(f => (
												<option key={f.id} value={f.name}>
													{f.name}{f.type ? ` (${f.type})` : ''}
												</option>
											))}
										</select>
									</div>
									<div>
										<label style={labelStyle}>Niveau de menace</label>
										<select
											name="threatLevel"
											value={form.threatLevel}
											onChange={handleChange}
											className="filter-select"
											style={{ width: '100%' }}
										>
											<option value="">— Non défini —</option>
											<option value="low">Faible</option>
											<option value="moderate">Modéré</option>
											<option value="high">Élevé</option>
											<option value="critical">Critique</option>
										</select>
									</div>
								</div>
							</div>
						)}

						<div style={{ marginTop: '1rem' }}>
							<label style={labelStyle}>Informations complémentaires (Divers)</label>
							<textarea
								name="miscellaneous"
								value={form.miscellaneous}
								onChange={handleChange}
								className="filter-input"
								style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
								placeholder="Informations complémentaires visibles par tous..."
							/>
						</div>

						<div style={{ marginTop: '1rem' }}>
							<label style={labelStyle}>Notes État-Major (admin uniquement)</label>
							<textarea
								name="etatMajorNotes"
								value={form.etatMajorNotes}
								onChange={handleChange}
								className="filter-input"
								style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
								placeholder="Visibles uniquement par les administrateurs..."
							/>
						</div>

						{/* Archive section */}
						<div
							style={{
								marginTop: '1rem',
								paddingTop: '1rem',
								borderTop: '1px solid var(--border)',
							}}
						>
							<label
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									cursor: 'pointer',
									marginBottom: '0.5rem',
								}}
							>
								<input
									type="checkbox"
									name="isArchived"
									checked={form.isArchived}
									onChange={handleChange}
								/>
								<span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>
									Archiver ce dossier
								</span>
							</label>
							{form.isArchived && (
								<div style={{ marginLeft: '1.5rem' }}>
									<label style={labelStyle}>Raison de l&apos;archivage</label>
									<input
										type="text"
										name="archiveReason"
										value={form.archiveReason}
										onChange={handleChange}
										className="filter-input"
										style={{ width: '100%' }}
										placeholder="Raison de l'archivage..."
									/>
								</div>
							)}
						</div>
					</div>
				)}

				{/* --- Submit --- */}
				<div
					style={{
						marginTop: '2rem',
						display: 'flex',
						gap: '1rem',
						justifyContent: 'flex-end',
					}}
				>
					<Link
						href="/roleplay"
						className="session-btn"
						style={{ padding: '0.75rem 1.5rem' }}
					>
						Annuler
					</Link>
					<button
						type="submit"
						disabled={submitting}
						className="discord-login-btn"
						style={{
							background: 'var(--primary)',
							padding: '0.75rem 1.5rem',
							opacity: submitting ? 0.6 : 1,
						}}
					>
						{submitting
							? 'Enregistrement...'
							: editData
								? 'Mettre à jour'
								: 'Créer le dossier'}
					</button>
				</div>
			</div>
		</form>
	);
}
