'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import './moderation.css';

interface SessionUser {
	userId: number;
	discordId: string;
	discordUsername: string;
	discordAvatar: string;
	roles: string[];
}

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

interface Transcript {
	messageId: string;
	ticketOwner: string;
	ticketOwnerAvatar: string;
	ticketName: string;
	panelName: string;
	participants: { count: number; name: string }[];
	transcriptUrl: string;
	downloadUrl: string;
	filename: string;
	size: number;
	timestamp: string;
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
	const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
	const [users, setUsers] = useState<ModerationUser[]>([]);
	const [usersLoading, setUsersLoading] = useState(true);
	const [usersSource, setUsersSource] = useState<'known' | 'search'>('known');
	const [search, setSearch] = useState('');
	const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
	const [filterWarn, setFilterWarn] = useState(false);
	const [filterCase, setFilterCase] = useState(false);
	const [error, setError] = useState('');

	// Create case modal
	const [createModal, setCreateModal] = useState<ModerationUser | null>(null);
	const [createReason, setCreateReason] = useState('surveillance');
	const [createDetail, setCreateDetail] = useState('');
	const [creating, setCreating] = useState(false);

	// Tab state
	const [tab, setTab] = useState<'users' | 'cases' | 'transcripts'>('users');

	// Cases tab data
	const [cases, setCases] = useState<any[]>([]);
	const [casesLoading, setCasesLoading] = useState(false);
	const [caseStatusFilter, setCaseStatusFilter] = useState('');

	// Transcripts tab data
	const [transcripts, setTranscripts] = useState<Transcript[]>([]);
	const [transcriptsLoading, setTranscriptsLoading] = useState(false);
	const [transcriptsLoaded, setTranscriptsLoaded] = useState(false);
	const [transcriptSearch, setTranscriptSearch] = useState('');
	const [transcriptOwner, setTranscriptOwner] = useState('');
	const [transcriptPanel, setTranscriptPanel] = useState('');
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [previewTitle, setPreviewTitle] = useState('');
	const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

	useEffect(() => {
		checkAuth();
	}, []);

	async function checkAuth() {
		try {
			// Fetch session and admin check in parallel
			const [authRes, meRes] = await Promise.all([
				fetch('/api/auth/admin-check'),
				fetch('/api/auth/me'),
			]);
			const authData = await authRes.json();
			const meData = meRes.ok ? await meRes.json() : null;

			if (meData?.authenticated) {
				setSessionUser(meData.user);
			}

			if (authData.isAdmin) {
				setAuthorized(true);
				setAdminLevel(authData.level);
				setLoading(false);
				await loadUsers();
			} else {
				setAuthorized(false);
				setLoading(false);
			}
		} catch {
			setAuthorized(false);
			setLoading(false);
		}
	}

	async function loadUsers(searchQuery = '') {
		setUsersLoading(true);
		try {
			const params = new URLSearchParams();
			if (searchQuery) params.set('search', searchQuery);
			const res = await fetch(`/api/moderation/users?${params}`);
			if (!res.ok) {
				const d = await res.json().catch(() => ({}));
				throw new Error(d.error || `Erreur ${res.status}`);
			}
			const data = await res.json();
			setUsers(data.users || []);
			setUsersSource(data.source || 'known');
		} catch (err: any) {
			setError(err.message);
		}
		setUsersLoading(false);
	}

	function handleSearchChange(value: string) {
		setSearch(value);
		if (searchTimer) clearTimeout(searchTimer);
		if (value.length >= 2) {
			const timer = setTimeout(() => loadUsers(value), 400);
			setSearchTimer(timer);
		} else if (value.length === 0) {
			loadUsers();
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
		if (tab === 'transcripts' && authorized && !transcriptsLoaded) loadTranscripts();
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

	async function loadTranscripts() {
		setTranscriptsLoading(true);
		try {
			const res = await fetch('/api/roleplay/transcripts');
			if (!res.ok) throw new Error('Erreur chargement transcripts');
			const data = await res.json();
			setTranscripts(data.transcripts || []);
			setTranscriptsLoaded(true);
		} catch (err: any) {
			setError(err.message);
		}
		setTranscriptsLoading(false);
	}

	const transcriptOwners = useMemo(() => {
		const set = new Set<string>();
		for (const t of transcripts) if (t.ticketOwner) set.add(t.ticketOwner);
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [transcripts]);

	const transcriptPanels = useMemo(() => {
		const set = new Set<string>();
		for (const t of transcripts) if (t.panelName) set.add(t.panelName);
		return Array.from(set).sort((a, b) => a.localeCompare(b));
	}, [transcripts]);

	const filteredTranscripts = useMemo(() => {
		let list = transcripts;
		if (transcriptOwner) list = list.filter(t => t.ticketOwner === transcriptOwner);
		if (transcriptPanel) list = list.filter(t => t.panelName === transcriptPanel);
		if (transcriptSearch.trim()) {
			const q = transcriptSearch.toLowerCase();
			list = list.filter(t =>
				t.ticketName.toLowerCase().includes(q) ||
				t.ticketOwner.toLowerCase().includes(q) ||
				t.panelName.toLowerCase().includes(q) ||
				t.participants.some(p => p.name.toLowerCase().includes(q)),
			);
		}
		return list;
	}, [transcripts, transcriptSearch, transcriptOwner, transcriptPanel]);

	const groupedTranscripts = useMemo(() => {
		const map = new Map<string, Transcript[]>();
		for (const t of filteredTranscripts) {
			const key = t.ticketOwner || 'Inconnu';
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(t);
		}
		return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	}, [filteredTranscripts]);

	const toggleTranscriptOwner = (owner: string) => {
		setExpandedOwners(prev => {
			const next = new Set(prev);
			if (next.has(owner)) next.delete(owner);
			else next.add(owner);
			return next;
		});
	};

	const filtered = users.filter((u) => {
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
						{!sessionUser ? (
							<a href="/api/auth/discord" className="mod-btn primary">
								Connexion Discord
							</a>
						) : (
							<a href="/roleplay" className="mod-btn primary">
								Retour au Roleplay
							</a>
						)}
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
						{sessionUser && (
							<div className="mod-session">
								<img
									className="mod-session-avatar"
									src={sessionUser.discordAvatar}
									alt=""
								/>
								<span className="mod-session-name">{sessionUser.discordUsername}</span>
								<a href="/api/auth/logout" className="mod-header-btn mod-header-btn-danger">
									Déconnexion
								</a>
							</div>
						)}
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
							Utilisateurs
						</button>
						<button
							className={`mod-tab${tab === 'cases' ? ' active' : ''}`}
							onClick={() => setTab('cases')}
						>
							Dossiers ({activeCases} actifs)
						</button>
						<button
							className={`mod-tab${tab === 'transcripts' ? ' active' : ''}`}
							onClick={() => setTab('transcripts')}
						>
							Transcripts
						</button>
					</div>

					{error && <div className="mod-error">{error}</div>}

					{/* Users tab */}
					{tab === 'users' && (
						<>
							{/* Stats */}
							<div className="mod-stats">
								<span>
									<span className="mod-stat-value">{users.length}</span> {usersSource === 'search' ? 'résultats' : 'membres connus'}
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
									placeholder="Rechercher un membre Discord (min. 2 caractères)..."
									value={search}
									onChange={(e) => handleSearchChange(e.target.value)}
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
							{usersLoading ? (
								<div className="mod-loading">
									Chargement des utilisateurs
								</div>
							) : users.length === 0 && !error ? (
								<div className="mod-empty">Aucun utilisateur trouvé</div>
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

					{/* Transcripts tab */}
					{tab === 'transcripts' && (
						<>
							{transcriptsLoading ? (
								<div className="mod-loading">Chargement des transcripts</div>
							) : (
								<>
									<div className="mod-filters">
										<input
											className="mod-search"
											type="text"
											placeholder="Rechercher par nom, ticket, participant..."
											value={transcriptSearch}
											onChange={(e) => setTranscriptSearch(e.target.value)}
										/>
										<select
											className="mod-filter-select"
											value={transcriptOwner}
											onChange={(e) => setTranscriptOwner(e.target.value)}
										>
											<option value="">Tous les propriétaires</option>
											{transcriptOwners.map((o) => (
												<option key={o} value={o}>{o}</option>
											))}
										</select>
										<select
											className="mod-filter-select"
											value={transcriptPanel}
											onChange={(e) => setTranscriptPanel(e.target.value)}
										>
											<option value="">Tous les panels</option>
											{transcriptPanels.map((p) => (
												<option key={p} value={p}>{p}</option>
											))}
										</select>
									</div>

									<div className="mod-stats">
										<span>
											<span className="mod-stat-value">{filteredTranscripts.length}</span> transcript{filteredTranscripts.length > 1 ? 's' : ''}
										</span>
										<span>
											<span className="mod-stat-value">{groupedTranscripts.length}</span> propriétaire{groupedTranscripts.length > 1 ? 's' : ''}
										</span>
									</div>

									{groupedTranscripts.length === 0 ? (
										<div className="mod-empty">Aucun transcript trouvé</div>
									) : (
										<ul className="mod-transcript-list">
											{groupedTranscripts.map(([owner, items]) => (
												<li key={owner} className="mod-transcript-group">
													<button
														className="mod-transcript-owner"
														onClick={() => toggleTranscriptOwner(owner)}
													>
														<span className="mod-transcript-arrow">
															{expandedOwners.has(owner) ? '▼' : '▶'}
														</span>
														{items[0]?.ticketOwnerAvatar && (
															<img
																className="mod-user-avatar"
																src={items[0].ticketOwnerAvatar}
																alt=""
															/>
														)}
														<span className="mod-transcript-owner-name">{owner}</span>
														<span className="mod-badge characters">{items.length}</span>
													</button>
													{expandedOwners.has(owner) && (
														<ul className="mod-transcript-tickets">
															{items.map((t) => (
																<li key={t.messageId} className="mod-transcript-ticket">
																	<div className="mod-transcript-ticket-info">
																		<div className="mod-transcript-ticket-name">{t.ticketName}</div>
																		<div className="mod-transcript-ticket-meta">
																			{t.panelName} · {new Date(t.timestamp).toLocaleDateString('fr-FR')} · {t.participants.length} participant{t.participants.length > 1 ? 's' : ''}
																		</div>
																	</div>
																	<div className="mod-user-actions">
																		<button
																			className="mod-btn primary"
																			onClick={() => {
																				setPreviewUrl(t.transcriptUrl);
																				setPreviewTitle(t.ticketName);
																			}}
																		>
																			Voir
																		</button>
																		<a
																			className="mod-btn"
																			href={t.downloadUrl}
																			target="_blank"
																			rel="noopener noreferrer"
																		>
																			Télécharger
																		</a>
																	</div>
																</li>
															))}
														</ul>
													)}
												</li>
											))}
										</ul>
									)}
								</>
							)}
						</>
					)}
				</div>
			</div>

			{/* Transcript preview modal */}
			{previewUrl && (
				<div
					className="mod-modal-overlay"
					onClick={(e) => {
						if (e.target === e.currentTarget) {
							setPreviewUrl(null);
							setPreviewTitle('');
						}
					}}
				>
					<div className="mod-modal mod-modal-transcript">
						<div className="mod-modal-header">
							<span>{previewTitle}</span>
							<button
								className="mod-modal-close"
								onClick={() => {
									setPreviewUrl(null);
									setPreviewTitle('');
								}}
							>
								✕
							</button>
						</div>
						<div className="mod-modal-body mod-transcript-preview-body">
							<iframe
								className="mod-transcript-iframe"
								src={previewUrl}
								title={previewTitle}
							/>
						</div>
					</div>
				</div>
			)}

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
