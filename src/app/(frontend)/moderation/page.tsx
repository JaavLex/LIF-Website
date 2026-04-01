'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './moderation.css';

interface ModerationUser {
	discordId: string;
	discordUsername: string;
	globalName: string;
	serverNick: string | null;
	avatar: string;
	joinedAt: string;
	roles: string[];
	warnCount: number;
	cases: { id: number; status: string; caseNumber: number }[];
	characters: { id: number; fullName: string; status: string; isMainCharacter: boolean }[];
}

const REASON_LABELS: Record<string, string> = {
	'joueur-problematique': 'Joueur problématique',
	surveillance: 'Surveillance',
	'comportement-a-verifier': 'Comportement à vérifier',
	'potentiel-staff': 'Potentiel helper/modérateur',
	autre: 'Autre',
};

export default function ModerationPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [authorized, setAuthorized] = useState(false);
	const [adminLevel, setAdminLevel] = useState<string>('none');
	const [users, setUsers] = useState<ModerationUser[]>([]);
	const [search, setSearch] = useState('');
	const [filterWarn, setFilterWarn] = useState(false);
	const [filterCase, setFilterCase] = useState(false);
	const [error, setError] = useState('');

	// Create case modal
	const [createModal, setCreateModal] = useState<ModerationUser | null>(null);
	const [createReason, setCreateReason] = useState('surveillance');
	const [createDetail, setCreateDetail] = useState('');
	const [creating, setCreating] = useState(false);

	// Tab state
	const [tab, setTab] = useState<'users' | 'cases'>('users');

	// Cases tab data
	const [cases, setCases] = useState<any[]>([]);
	const [casesLoading, setCasesLoading] = useState(false);
	const [caseStatusFilter, setCaseStatusFilter] = useState('');

	useEffect(() => {
		checkAuth();
	}, []);

	async function checkAuth() {
		try {
			const res = await fetch('/api/auth/admin-check');
			const data = await res.json();
			if (data.isAdmin) {
				setAuthorized(true);
				setAdminLevel(data.level);
				loadUsers();
			} else {
				setAuthorized(false);
			}
		} catch {
			setAuthorized(false);
		}
		setLoading(false);
	}

	async function loadUsers() {
		try {
			const res = await fetch('/api/moderation/users');
			if (!res.ok) throw new Error('Erreur chargement');
			const data = await res.json();
			setUsers(data.users);
		} catch (err: any) {
			setError(err.message);
		}
	}

	async function loadCases() {
		setCasesLoading(true);
		try {
			const params = new URLSearchParams();
			if (caseStatusFilter) params.set('status', caseStatusFilter);
			const res = await fetch(`/api/moderation/cases?${params}`);
			if (!res.ok) throw new Error('Erreur chargement');
			const data = await res.json();
			setCases(data.cases);
		} catch (err: any) {
			setError(err.message);
		}
		setCasesLoading(false);
	}

	useEffect(() => {
		if (tab === 'cases' && authorized) loadCases();
	}, [tab, caseStatusFilter, authorized]);

	async function handleCreateCase(user: ModerationUser) {
		// Check for active or archived case first
		const activeCase = user.cases.find(
			(c) => c.status === 'open' || c.status === 'pending',
		);
		if (activeCase) {
			router.push(`/moderation/dossier/${activeCase.id}`);
			return;
		}
		setCreateModal(user);
	}

	async function submitCreateCase() {
		if (!createModal) return;
		setCreating(true);
		setError('');

		try {
			const res = await fetch('/api/moderation/cases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetDiscordId: createModal.discordId,
					targetDiscordUsername: createModal.globalName || createModal.discordUsername,
					targetServerUsername: createModal.serverNick || createModal.globalName,
					targetDiscordAvatar: createModal.avatar,
					reason: createReason,
					reasonDetail: createDetail,
				}),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error);

			const caseData = data.case;
			setCreateModal(null);
			setCreateReason('surveillance');
			setCreateDetail('');
			router.push(`/moderation/dossier/${caseData.id}`);
		} catch (err: any) {
			setError(err.message);
		}
		setCreating(false);
	}

	const filtered = users.filter((u) => {
		const q = search.toLowerCase();
		const nameMatch =
			!q ||
			u.discordUsername.toLowerCase().includes(q) ||
			u.globalName.toLowerCase().includes(q) ||
			(u.serverNick && u.serverNick.toLowerCase().includes(q)) ||
			u.discordId.includes(q) ||
			u.characters.some((c) => c.fullName.toLowerCase().includes(q));

		if (!nameMatch) return false;
		if (filterWarn && u.warnCount === 0) return false;
		if (filterCase && u.cases.length === 0) return false;
		return true;
	});

	if (loading) {
		return (
			<div className="mod-page">
				<div className="mod-container">
					<div className="mod-loading">Vérification des permissions</div>
				</div>
			</div>
		);
	}

	if (!authorized) {
		return (
			<div className="mod-page">
				<div className="mod-container">
					<div className="mod-denied">
						<h1>Accès refusé</h1>
						<p>Vous n&apos;êtes pas autorisé à accéder à cette page.</p>
						<a href="/roleplay" className="mod-btn primary">
							Retour au Roleplay
						</a>
					</div>
				</div>
			</div>
		);
	}

	const totalWarns = users.reduce((acc, u) => acc + u.warnCount, 0);
	const activeCases = users.reduce(
		(acc, u) => acc + u.cases.filter((c) => c.status === 'open' || c.status === 'pending').length,
		0,
	);

	return (
		<div className="mod-page">
			<div className="mod-container">
				{/* Header */}
				<div className="mod-header">
					<div className="mod-header-left">
						<span className="mod-header-title">⚖️ Panneau de Modération</span>
					</div>
					<div className="mod-header-right">
						<a href="/roleplay" className="mod-header-btn">
							← Roleplay
						</a>
					</div>
				</div>

				{/* Main panel */}
				<div className="mod-panel">
					{/* Tabs */}
					<div className="mod-tabs">
						<button
							className={`mod-tab${tab === 'users' ? ' active' : ''}`}
							onClick={() => setTab('users')}
						>
							Liste des utilisateurs
						</button>
						<button
							className={`mod-tab${tab === 'cases' ? ' active' : ''}`}
							onClick={() => setTab('cases')}
						>
							Dossiers ({activeCases} actifs)
						</button>
					</div>

					{error && <div className="mod-error">{error}</div>}

					{/* Users tab */}
					{tab === 'users' && (
						<>
							{/* Stats */}
							<div className="mod-stats">
								<span>
									<span className="mod-stat-value">{users.length}</span> membres
								</span>
								<span>
									<span className="mod-stat-value">{activeCases}</span> dossiers actifs
								</span>
								<span>
									<span className="mod-stat-value">{totalWarns}</span> avertissements
								</span>
							</div>

							{/* Filters */}
							<div className="mod-filters">
								<input
									className="mod-search"
									type="text"
									placeholder="Rechercher par nom, Discord ID, personnage..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
								<label className="mod-comment-checkbox">
									<input
										type="checkbox"
										checked={filterWarn}
										onChange={(e) => setFilterWarn(e.target.checked)}
									/>
									Avec warns
								</label>
								<label className="mod-comment-checkbox">
									<input
										type="checkbox"
										checked={filterCase}
										onChange={(e) => setFilterCase(e.target.checked)}
									/>
									Avec dossier
								</label>
							</div>

							{/* User list */}
							{users.length === 0 ? (
								<div className="mod-loading">
									Chargement des utilisateurs
								</div>
							) : filtered.length === 0 ? (
								<div className="mod-empty">Aucun utilisateur trouvé</div>
							) : (
								<ul className="mod-user-list">
									{filtered.map((user) => {
										const activeCase = user.cases.find(
											(c) => c.status === 'open' || c.status === 'pending',
										);
										return (
											<li key={user.discordId} className="mod-user-item">
												<img
													className="mod-user-avatar"
													src={user.avatar}
													alt=""
													loading="lazy"
												/>
												<div className="mod-user-info">
													<div className="mod-user-name">
														{user.serverNick || user.globalName}
													</div>
													<div className="mod-user-discord">
														@{user.discordUsername}
														{user.serverNick &&
															user.serverNick !== user.globalName &&
															` · ${user.globalName}`}
													</div>
												</div>

												<div className="mod-user-badges">
													{user.warnCount > 0 && (
														<span className="mod-badge warn">
															{user.warnCount} warn{user.warnCount > 1 ? 's' : ''}
														</span>
													)}
													{activeCase && (
														<span className="mod-badge case-open">
															Dossier #{activeCase.caseNumber}
														</span>
													)}
													{user.characters.length > 0 && (
														<span className="mod-badge characters">
															{user.characters.length} perso
															{user.characters.length > 1 ? 's' : ''}
														</span>
													)}
												</div>

												<div className="mod-user-actions">
													{activeCase ? (
														<button
															className="mod-btn primary"
															onClick={() =>
																router.push(
																	`/moderation/dossier/${activeCase.id}`,
																)
															}
														>
															Ouvrir le dossier
														</button>
													) : (
														<button
															className="mod-btn"
															onClick={() => handleCreateCase(user)}
														>
															Créer un dossier
														</button>
													)}
												</div>
											</li>
										);
									})}
								</ul>
							)}
						</>
					)}

					{/* Cases tab */}
					{tab === 'cases' && (
						<>
							<div className="mod-filters">
								<select
									className="mod-filter-select"
									value={caseStatusFilter}
									onChange={(e) => setCaseStatusFilter(e.target.value)}
								>
									<option value="">Tous les statuts</option>
									<option value="open">Ouvert</option>
									<option value="pending">En attente</option>
									<option value="resolved">Résolu</option>
									<option value="archived">Archivé</option>
								</select>
							</div>

							{casesLoading ? (
								<div className="mod-loading">Chargement des dossiers</div>
							) : cases.length === 0 ? (
								<div className="mod-empty">Aucun dossier trouvé</div>
							) : (
								<ul className="mod-case-list">
									{cases.map((c: any) => (
										<li
											key={c.id}
											className="mod-case-list-item"
											onClick={() =>
												router.push(`/moderation/dossier/${c.id}`)
											}
										>
											<span className="mod-case-list-number">
												#{c.caseNumber}
											</span>
											<div className="mod-case-list-target">
												<div>{c.targetDiscordUsername}</div>
												<div className="mod-case-list-reason">
													{REASON_LABELS[c.reason] || c.reason}
												</div>
											</div>
											<span
												className={`mod-case-status ${c.status}`}
											>
												{c.status === 'open'
													? 'Ouvert'
													: c.status === 'pending'
														? 'En attente'
														: c.status === 'resolved'
															? 'Résolu'
															: 'Archivé'}
											</span>
											<span className="mod-case-list-date">
												{new Date(c.createdAt).toLocaleDateString('fr-FR')}
											</span>
										</li>
									))}
								</ul>
							)}
						</>
					)}
				</div>
			</div>

			{/* Create case modal */}
			{createModal && (
				<div
					className="mod-modal-overlay"
					onClick={(e) => {
						if (e.target === e.currentTarget) setCreateModal(null);
					}}
				>
					<div className="mod-modal">
						<div className="mod-modal-header">
							<span>Créer un dossier</span>
							<button
								className="mod-modal-close"
								onClick={() => setCreateModal(null)}
							>
								✕
							</button>
						</div>
						<div className="mod-modal-body">
							<div className="mod-modal-info">
								Cible : <strong>{createModal.serverNick || createModal.globalName}</strong>{' '}
								(@{createModal.discordUsername})
							</div>

							<div className="mod-modal-field">
								<label className="mod-modal-label">Motif</label>
								<select
									className="mod-reason-select"
									value={createReason}
									onChange={(e) => setCreateReason(e.target.value)}
								>
									{Object.entries(REASON_LABELS).map(([v, l]) => (
										<option key={v} value={v}>
											{l}
										</option>
									))}
								</select>
							</div>

							<div className="mod-modal-field">
								<label className="mod-modal-label">Détail (optionnel)</label>
								<textarea
									className="mod-modal-textarea"
									value={createDetail}
									onChange={(e) => setCreateDetail(e.target.value)}
									placeholder="Détail supplémentaire..."
								/>
							</div>
						</div>
						<div className="mod-modal-footer">
							<button
								className="mod-btn"
								onClick={() => setCreateModal(null)}
							>
								Annuler
							</button>
							<button
								className="mod-btn primary"
								onClick={submitCreateCase}
								disabled={creating}
							>
								{creating ? 'Création...' : 'Créer le dossier'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
