'use client';

import { useState } from 'react';
import { UnitItem, RankItem, labelStyle } from './types';

/**
 * NPC / Target character creation form, mounted inside the AdminPanel on
 * /roleplay. The public "nouveau personnage" page enforces a one-active-
 * character per Discord account rule, so admins who already have their own
 * operator cannot use it to create non-player characters. This form posts
 * to the same /api/roleplay/characters endpoint with `isNpc: true`, which
 * the route honours by skipping the discordId binding and the one-character
 * limit (and by NOT auto-deriving the rank from the admin's own Discord
 * roles — see src/app/api/roleplay/characters/route.ts).
 */
export function CharacterManagement({
	units,
	ranks,
	showCreateForm,
	setError,
	setSuccess,
	submitting,
	setSubmitting,
}: {
	units: UnitItem[];
	ranks: RankItem[];
	showCreateForm: boolean;
	setError: (v: string) => void;
	setSuccess: (v: string) => void;
	submitting: boolean;
	setSubmitting: (v: boolean) => void;
}) {
	const [form, setForm] = useState({
		firstName: '',
		lastName: '',
		callsign: '',
		isTarget: false,
		targetFaction: '',
		threatLevel: '',
		unit: '',
		rank: '',
		faction: '',
		status: 'in-service',
		classification: 'public',
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		setError('');
		setSuccess('');
		try {
			const body: Record<string, unknown> = {
				isNpc: true,
				firstName: form.firstName.trim(),
				lastName: form.lastName.trim(),
				callsign: form.callsign.trim(),
				status: form.status,
				classification: form.classification,
				isMainCharacter: false,
				rankOverride: true,
			};
			if (form.isTarget) {
				body.isTarget = true;
				if (form.targetFaction.trim()) body.targetFaction = form.targetFaction.trim();
				if (form.threatLevel) body.threatLevel = form.threatLevel;
			}
			if (form.unit) body.unit = parseInt(form.unit, 10);
			if (form.rank) body.rank = parseInt(form.rank, 10);
			if (form.faction.trim()) body.faction = form.faction.trim();

			const res = await fetch('/api/roleplay/characters', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur de création');
			}
			const created = await res.json().catch(() => ({}));
			setSuccess(
				`PNJ « ${form.firstName} ${form.lastName} » créé. Redirection vers la fiche…`,
			);
			setForm({
				firstName: '',
				lastName: '',
				callsign: '',
				isTarget: false,
				targetFaction: '',
				threatLevel: '',
				unit: '',
				rank: '',
				faction: '',
				status: 'in-service',
				classification: 'public',
			});
			// Navigate to the new character page so the admin can fill in
			// background, photo, motto, etc. directly.
			const newId = created?.id || created?.doc?.id;
			setTimeout(() => {
				if (newId) {
					window.location.href = `/roleplay/personnage/${newId}`;
				} else {
					window.location.reload();
				}
			}, 800);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Erreur inconnue');
		} finally {
			setSubmitting(false);
		}
	};

	if (!showCreateForm) return null;

	return (
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
				Nouveau PNJ / Cible
			</h3>
			<p
				style={{
					fontSize: '0.78rem',
					color: 'var(--muted)',
					margin: '0 0 1rem 0',
				}}
			>
				Personnage non-joueur, non lié à un compte Discord. Une fois créé,
				vous serez redirigé vers sa fiche pour compléter le background, la
				photo, etc.
			</p>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr 1fr',
					gap: '1rem',
					marginBottom: '1rem',
				}}
			>
				<div>
					<label style={labelStyle}>Prénom *</label>
					<input
						type="text"
						value={form.firstName}
						onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
						required
						className="filter-input"
						style={{ width: '100%' }}
					/>
				</div>
				<div>
					<label style={labelStyle}>Nom *</label>
					<input
						type="text"
						value={form.lastName}
						onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
						required
						className="filter-input"
						style={{ width: '100%' }}
					/>
				</div>
				<div>
					<label style={labelStyle}>Callsign *</label>
					<input
						type="text"
						value={form.callsign}
						onChange={e => setForm(f => ({ ...f, callsign: e.target.value }))}
						required
						className="filter-input"
						style={{ width: '100%' }}
						placeholder="Ex: Viper"
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
					<label style={labelStyle}>Unité (optionnel)</label>
					<select
						value={form.unit}
						onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
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
					<label style={labelStyle}>Grade (optionnel)</label>
					<select
						value={form.rank}
						onChange={e => setForm(f => ({ ...f, rank: e.target.value }))}
						className="filter-select"
						style={{ width: '100%' }}
					>
						<option value="">— Aucun —</option>
						{ranks.map(r => (
							<option key={r.id} value={r.id}>
								{r.abbreviation ? `${r.abbreviation} — ${r.name}` : r.name}
							</option>
						))}
					</select>
				</div>
			</div>

			<div style={{ marginBottom: '1rem' }}>
				<label style={labelStyle}>Faction (texte libre, optionnel)</label>
				<input
					type="text"
					value={form.faction}
					onChange={e => setForm(f => ({ ...f, faction: e.target.value }))}
					className="filter-input"
					style={{ width: '100%' }}
					placeholder="Ex: LIF, Civil, Inconnu…"
				/>
			</div>

			<div
				style={{
					padding: '0.75rem',
					border: '1px dashed var(--border)',
					marginBottom: '1rem',
					background: 'rgba(139,38,53,0.04)',
				}}
			>
				<label
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.5rem',
						cursor: 'pointer',
						fontSize: '0.85rem',
						color: 'var(--text)',
					}}
				>
					<input
						type="checkbox"
						checked={form.isTarget}
						onChange={e =>
							setForm(f => ({ ...f, isTarget: e.target.checked }))
						}
					/>
					<strong style={{ color: 'var(--danger)' }}>Cible / Ennemi</strong>
				</label>

				{form.isTarget && (
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '1rem',
							marginTop: '0.75rem',
						}}
					>
						<div>
							<label style={labelStyle}>Faction cible</label>
							<input
								type="text"
								value={form.targetFaction}
								onChange={e =>
									setForm(f => ({ ...f, targetFaction: e.target.value }))
								}
								className="filter-input"
								style={{ width: '100%' }}
								placeholder="Ex: Cartel, Insurgés…"
							/>
						</div>
						<div>
							<label style={labelStyle}>Niveau de menace</label>
							<select
								value={form.threatLevel}
								onChange={e =>
									setForm(f => ({ ...f, threatLevel: e.target.value }))
								}
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
				)}
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
					<label style={labelStyle}>Statut</label>
					<select
						value={form.status}
						onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
						className="filter-select"
						style={{ width: '100%' }}
					>
						<option value="in-service">En service</option>
						<option value="kia">KIA (Mort au combat)</option>
						<option value="mia">MIA (Disparu)</option>
						<option value="retired">Retraité</option>
						<option value="executed">Exécuté</option>
					</select>
				</div>
				<div>
					<label style={labelStyle}>Classification</label>
					<select
						value={form.classification}
						onChange={e =>
							setForm(f => ({ ...f, classification: e.target.value }))
						}
						className="filter-select"
						style={{ width: '100%' }}
					>
						<option value="public">Public</option>
						<option value="restricted">Restreint</option>
						<option value="classified">Classifié</option>
					</select>
				</div>
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
				{submitting ? 'Création...' : 'Créer le PNJ'}
			</button>
		</form>
	);
}
