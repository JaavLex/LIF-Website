'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
}

interface Unit {
	id: number;
	name: string;
}

export function CharacterForm({
	ranks,
	units,
	editData,
}: {
	ranks: Rank[];
	units: Unit[];
	editData?: any;
}) {
	const router = useRouter();
	const [user, setUser] = useState<SessionUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

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
		rank: editData?.rank?.id || editData?.rank || '',
		unit: editData?.unit?.id || editData?.unit || '',
		status: editData?.status || 'in-service',
	});

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
		setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;
		setSubmitting(true);
		setError('');

		try {
			const body: any = {
				firstName: form.firstName,
				lastName: form.lastName,
				placeOfOrigin: form.placeOfOrigin || undefined,
				physicalDescription: form.physicalDescription || undefined,
				motto: form.motto || undefined,
				previousUnit: form.previousUnit || undefined,
				faction: form.faction || undefined,
				status: form.status,
				discordId: user.discordId,
				discordUsername: user.discordUsername,
			};

			if (form.dateOfBirth) body.dateOfBirth = form.dateOfBirth;
			if (form.height) body.height = parseInt(form.height);
			if (form.weight) body.weight = parseInt(form.weight);
			if (form.rank) body.rank = parseInt(form.rank);
			if (form.unit) body.unit = parseInt(form.unit);

			const url = editData ? `/api/characters/${editData.id}` : '/api/characters';

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

	if (!user) {
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

				<div
					className="character-section"
					style={{ border: 'none', padding: 0, background: 'transparent' }}
				>
					<h2 style={{ color: 'var(--primary)' }}>Identité</h2>

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '1rem',
							marginBottom: '1rem',
						}}
					>
						<div>
							<label
								style={{
									display: 'block',
									fontSize: '0.8rem',
									color: 'var(--muted)',
									marginBottom: '0.35rem',
								}}
							>
								Prénom *
							</label>
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
							<label
								style={{
									display: 'block',
									fontSize: '0.8rem',
									color: 'var(--muted)',
									marginBottom: '0.35rem',
								}}
							>
								Nom *
							</label>
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

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '1rem',
							marginBottom: '1rem',
						}}
					>
						<div>
							<label
								style={{
									display: 'block',
									fontSize: '0.8rem',
									color: 'var(--muted)',
									marginBottom: '0.35rem',
								}}
							>
								Date de naissance
							</label>
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
							<label
								style={{
									display: 'block',
									fontSize: '0.8rem',
									color: 'var(--muted)',
									marginBottom: '0.35rem',
								}}
							>
								Lieu d&apos;origine
							</label>
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

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '1rem',
							marginBottom: '1rem',
						}}
					>
						<div>
							<label
								style={{
									display: 'block',
									fontSize: '0.8rem',
									color: 'var(--muted)',
									marginBottom: '0.35rem',
								}}
							>
								Taille (cm)
							</label>
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
							<label
								style={{
									display: 'block',
									fontSize: '0.8rem',
									color: 'var(--muted)',
									marginBottom: '0.35rem',
								}}
							>
								Poids (kg)
							</label>
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
						<label
							style={{
								display: 'block',
								fontSize: '0.8rem',
								color: 'var(--muted)',
								marginBottom: '0.35rem',
							}}
						>
							Description physique
						</label>
						<textarea
							name="physicalDescription"
							value={form.physicalDescription}
							onChange={handleChange}
							className="filter-input"
							style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
						/>
					</div>

					<div style={{ marginBottom: '1rem' }}>
						<label
							style={{
								display: 'block',
								fontSize: '0.8rem',
								color: 'var(--muted)',
								marginBottom: '0.35rem',
							}}
						>
							Devise
						</label>
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

				<div
					className="character-section"
					style={{
						border: 'none',
						padding: 0,
						background: 'transparent',
						marginTop: '1.5rem',
					}}
				>
					<h2 style={{ color: 'var(--primary)' }}>Affectation</h2>

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '1rem',
							marginBottom: '1rem',
						}}
					>
						<div>
							<label
								style={{
									display: 'block',
									fontSize: '0.8rem',
									color: 'var(--muted)',
									marginBottom: '0.35rem',
								}}
							>
								Grade
							</label>
							<select
								name="rank"
								value={form.rank}
								onChange={handleChange}
								className="filter-select"
								style={{ width: '100%' }}
							>
								<option value="">— Aucun —</option>
								{ranks.map(r => (
									<option key={r.id} value={r.id}>
										{r.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								style={{
									display: 'block',
									fontSize: '0.8rem',
									color: 'var(--muted)',
									marginBottom: '0.35rem',
								}}
							>
								Unité
							</label>
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
					</div>

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '1rem',
							marginBottom: '1rem',
						}}
					>
						<div>
							<label
								style={{
									display: 'block',
									fontSize: '0.8rem',
									color: 'var(--muted)',
									marginBottom: '0.35rem',
								}}
							>
								Unité précédente
							</label>
							<input
								type="text"
								name="previousUnit"
								value={form.previousUnit}
								onChange={handleChange}
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
						<div>
							<label
								style={{
									display: 'block',
									fontSize: '0.8rem',
									color: 'var(--muted)',
									marginBottom: '0.35rem',
								}}
							>
								Faction
							</label>
							<input
								type="text"
								name="faction"
								value={form.faction}
								onChange={handleChange}
								className="filter-input"
								style={{ width: '100%' }}
							/>
						</div>
					</div>

					<div>
						<label
							style={{
								display: 'block',
								fontSize: '0.8rem',
								color: 'var(--muted)',
								marginBottom: '0.35rem',
							}}
						>
							Statut
						</label>
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
							<option value="dishonourable-discharge">Réformé sans honneur</option>
							<option value="executed">Exécuté</option>
						</select>
					</div>
				</div>

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
