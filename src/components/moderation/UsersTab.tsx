'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MODERATION_REASON_LABELS, MODERATION_STATUS_LABELS } from '@/lib/constants';
import type { ModerationUser } from './types';

interface UsersTabProps {
	users: ModerationUser[];
	usersLoading: boolean;
	usersSource: 'known' | 'search';
	guildRoles: { id: string; name: string; color: string }[];
	adminRoleIds: string[];
	search: string;
	onSearchChange: (value: string) => void;
	filterWarn: boolean;
	onFilterWarnChange: (value: boolean) => void;
	filterCase: boolean;
	onFilterCaseChange: (value: boolean) => void;
	activeCases: number;
	totalWarns: number;
	error: string;
	onError: (error: string) => void;
}

export default function UsersTab({
	users,
	usersLoading,
	usersSource,
	guildRoles,
	adminRoleIds,
	search,
	onSearchChange,
	filterWarn,
	onFilterWarnChange,
	filterCase,
	onFilterCaseChange,
	activeCases,
	totalWarns,
	error,
	onError,
}: UsersTabProps) {
	const router = useRouter();

	// Create case modal
	const [createModal, setCreateModal] = useState<ModerationUser | null>(null);
	const [createReason, setCreateReason] = useState('surveillance');
	const [createDetail, setCreateDetail] = useState('');
	const [creating, setCreating] = useState(false);

	// User profile modal
	const [profileUser, setProfileUser] = useState<ModerationUser | null>(null);

	// Reopen case modal
	const [reopenCase, setReopenCase] = useState<{
		userId: string;
		caseId: number;
		caseName: string;
	} | null>(null);
	const [reopenReason, setReopenReason] = useState('');
	const [reopening, setReopening] = useState(false);

	const isUserAdmin = (user: ModerationUser) =>
		adminRoleIds.length > 0 && user.roles.some(r => adminRoleIds.includes(r));

	const getUserRoles = (user: ModerationUser) =>
		guildRoles.filter(r => user.roles.includes(r.id));

	const filtered = users.filter(u => {
		if (filterWarn && u.warnCount === 0) return false;
		if (filterCase && u.cases.length === 0) return false;
		return true;
	});

	async function handleCreateCase(user: ModerationUser) {
		const activeCase = user.cases.find(
			c => c.status === 'open' || c.status === 'pending',
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
		onError('');

		try {
			const res = await fetch('/api/moderation/cases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetDiscordId: createModal.discordId,
					targetDiscordUsername:
						createModal.globalName || createModal.discordUsername,
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
			onError(err.message);
		}
		setCreating(false);
	}

	async function submitReopenCase() {
		if (!reopenCase) return;
		setReopening(true);
		onError('');
		try {
			const res = await fetch(`/api/moderation/cases/${reopenCase.caseId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'open' }),
			});
			if (!res.ok) {
				const d = await res.json();
				throw new Error(d.error);
			}
			if (reopenReason.trim()) {
				await fetch(`/api/moderation/cases/${reopenCase.caseId}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						action: 'comment',
						content: `Réouverture du dossier : ${reopenReason}`,
						eventType: 'case-reopened',
					}),
				});
			}
			setReopenCase(null);
			setReopenReason('');
			router.push(`/moderation/dossier/${reopenCase.caseId}`);
		} catch (err: any) {
			onError(err.message);
		}
		setReopening(false);
	}

	return (
		<>
			{/* Stats */}
			<div className="mod-stats">
				<span>
					<span className="mod-stat-value">{users.length}</span>{' '}
					{usersSource === 'search' ? 'résultats' : 'membres connus'}
				</span>
				<span>
					<span className="mod-stat-value">{activeCases}</span> dossiers
					actifs
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
					onChange={e => onSearchChange(e.target.value)}
				/>
				<label className="mod-comment-checkbox">
					<input
						type="checkbox"
						checked={filterWarn}
						onChange={e => onFilterWarnChange(e.target.checked)}
					/>
					Avec warns
				</label>
				<label className="mod-comment-checkbox">
					<input
						type="checkbox"
						checked={filterCase}
						onChange={e => onFilterCaseChange(e.target.checked)}
					/>
					Avec dossier
				</label>
			</div>

			{/* User list */}
			{usersLoading ? (
				<div className="mod-loading">Chargement des utilisateurs</div>
			) : users.length === 0 && !error ? (
				<div className="mod-empty">Aucun utilisateur trouvé</div>
			) : filtered.length === 0 ? (
				<div className="mod-empty">Aucun utilisateur trouvé</div>
			) : (
				<ul className="mod-user-list">
					{filtered.map(user => {
						const activeCase = user.cases.find(
							c => c.status === 'open' || c.status === 'pending',
						);
						const archivedCase = !activeCase
							? user.cases.find(c => c.status === 'archived')
							: null;
						return (
							<li key={user.discordId} className="mod-user-item">
								<div
									className="mod-user-identity"
									onClick={() => setProfileUser(user)}
									style={{
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
										gap: '0.75rem',
										flex: 1,
									}}
								>
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
								</div>

								<div className="mod-user-badges">
									{isUserAdmin(user) && (
										<span className="mod-badge admin">Admin</span>
									)}
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
												router.push(`/moderation/dossier/${activeCase.id}`)
											}
										>
											Ouvrir le dossier
										</button>
									) : archivedCase ? (
										<button
											className="mod-btn warn-btn"
											onClick={() =>
												setReopenCase({
													userId: user.discordId,
													caseId: archivedCase.id,
													caseName: user.serverNick || user.globalName,
												})
											}
										>
											Réouvrir le dossier
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

			{/* User profile modal */}
			{profileUser && (
				<div
					className="mod-modal-overlay"
					onClick={e => {
						if (e.target === e.currentTarget) setProfileUser(null);
					}}
				>
					<div className="mod-modal mod-modal-profile">
						<div className="mod-modal-header">
							<span>Profil utilisateur</span>
							<button
								className="mod-modal-close"
								onClick={() => setProfileUser(null)}
							>
								✕
							</button>
						</div>
						<div className="mod-modal-body">
							<div className="mod-profile-header">
								<img
									className="mod-profile-avatar"
									src={profileUser.avatar}
									alt=""
								/>
								<div className="mod-profile-identity">
									<div className="mod-profile-name">
										{profileUser.serverNick || profileUser.globalName}
									</div>
									<div className="mod-profile-discord">
										@{profileUser.discordUsername}
										{profileUser.serverNick &&
											profileUser.serverNick !== profileUser.globalName &&
											` · ${profileUser.globalName}`}
									</div>
									<div className="mod-profile-id">ID: {profileUser.discordId}</div>
									{profileUser.joinedAt && (
										<div className="mod-profile-joined">
											Rejoint le{' '}
											{new Date(profileUser.joinedAt).toLocaleDateString('fr-FR')}
										</div>
									)}
								</div>
							</div>

							{/* Roles */}
							{getUserRoles(profileUser).length > 0 && (
								<div className="mod-profile-section">
									<div className="mod-profile-section-title">🏷️ Rôles Discord</div>
									<div className="mod-profile-roles">
										{getUserRoles(profileUser).map(role => (
											<span
												key={role.id}
												className="mod-role-badge"
												style={{
													borderColor: role.color,
													color: role.color,
													background: `${role.color}1a`,
												}}
											>
												{role.name}
											</span>
										))}
									</div>
								</div>
							)}

							{/* Warns */}
							<div className="mod-profile-section">
								<div className="mod-profile-section-title">
									⚠️ Avertissements
									{profileUser.warnCount > 0 && (
										<span className="mod-badge warn">{profileUser.warnCount}</span>
									)}
								</div>
								{profileUser.warnCount === 0 ? (
									<div className="mod-profile-empty">Aucun avertissement</div>
								) : (
									<div className="mod-profile-warn-count">
										{profileUser.warnCount} avertissement
										{profileUser.warnCount > 1 ? 's' : ''} actif
										{profileUser.warnCount > 1 ? 's' : ''}
									</div>
								)}
							</div>

							{/* Cases */}
							<div className="mod-profile-section">
								<div className="mod-profile-section-title">
									📁 Dossiers
									{profileUser.cases.length > 0 && (
										<span className="mod-badge characters">
											{profileUser.cases.length}
										</span>
									)}
								</div>
								{profileUser.cases.length === 0 ? (
									<div className="mod-profile-empty">Aucun dossier</div>
								) : (
									<ul className="mod-profile-list">
										{profileUser.cases.map(c => (
											<li
												key={c.id}
												className="mod-profile-list-item mod-profile-case"
												onClick={() => {
													setProfileUser(null);
													router.push(`/moderation/dossier/${c.id}`);
												}}
											>
												<span className="mod-case-list-number">#{c.caseNumber}</span>
												<span className={`mod-case-status ${c.status}`}>
													{MODERATION_STATUS_LABELS[c.status] || c.status}
												</span>
											</li>
										))}
									</ul>
								)}
							</div>

							{/* Characters */}
							<div className="mod-profile-section">
								<div className="mod-profile-section-title">
									🎭 Personnages
									{profileUser.characters.length > 0 && (
										<span className="mod-badge characters">
											{profileUser.characters.length}
										</span>
									)}
								</div>
								{profileUser.characters.length === 0 ? (
									<div className="mod-profile-empty">Aucun personnage</div>
								) : (
									<ul className="mod-profile-list">
										{profileUser.characters.map(ch => (
											<li
												key={ch.id}
												className="mod-profile-list-item"
												onClick={() => {
													setProfileUser(null);
													router.push(`/roleplay/personnage/${ch.id}`);
												}}
											>
												<span className="mod-profile-char-name">{ch.fullName}</span>
												<div className="mod-profile-char-meta">
													{ch.isMainCharacter && (
														<span className="mod-badge case-open">Principal</span>
													)}
													<span
														className={`mod-badge ${ch.status === 'alive' ? 'characters' : ch.status === 'dead' ? 'warn' : 'case-open'}`}
													>
														{ch.status === 'alive'
															? 'Vivant'
															: ch.status === 'dead'
																? 'Mort'
																: ch.status}
													</span>
												</div>
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
						<div className="mod-modal-footer">
							<button className="mod-btn" onClick={() => setProfileUser(null)}>
								Fermer
							</button>
							<button
								className="mod-btn primary"
								onClick={() => {
									handleCreateCase(profileUser);
									setProfileUser(null);
								}}
							>
								Créer un dossier
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Reopen case modal */}
			{reopenCase && (
				<div
					className="mod-modal-overlay"
					onClick={e => {
						if (e.target === e.currentTarget) setReopenCase(null);
					}}
				>
					<div className="mod-modal">
						<div className="mod-modal-header">
							<span>Réouvrir un dossier</span>
							<button
								className="mod-modal-close"
								onClick={() => setReopenCase(null)}
							>
								✕
							</button>
						</div>
						<div className="mod-modal-body">
							<div className="mod-modal-info">
								Cible : <strong>{reopenCase.caseName}</strong>
							</div>
							<div className="mod-modal-field">
								<label className="mod-modal-label">Raison de la réouverture</label>
								<textarea
									className="mod-modal-textarea"
									value={reopenReason}
									onChange={e => setReopenReason(e.target.value)}
									placeholder="Raison de la réouverture du dossier..."
								/>
							</div>
						</div>
						<div className="mod-modal-footer">
							<button className="mod-btn" onClick={() => setReopenCase(null)}>
								Annuler
							</button>
							<button
								className="mod-btn warn-btn"
								onClick={submitReopenCase}
								disabled={reopening || !reopenReason.trim()}
							>
								{reopening ? 'Réouverture...' : 'Réouvrir le dossier'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Create case modal */}
			{createModal && (
				<div
					className="mod-modal-overlay"
					onClick={e => {
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
								Cible :{' '}
								<strong>{createModal.serverNick || createModal.globalName}</strong>{' '}
								(@{createModal.discordUsername})
							</div>

							<div className="mod-modal-field">
								<label className="mod-modal-label">Motif</label>
								<select
									className="mod-reason-select"
									value={createReason}
									onChange={e => setCreateReason(e.target.value)}
								>
									{Object.entries(MODERATION_REASON_LABELS).map(([v, l]) => (
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
									onChange={e => setCreateDetail(e.target.value)}
									placeholder="Détail supplémentaire..."
								/>
							</div>
						</div>
						<div className="mod-modal-footer">
							<button className="mod-btn" onClick={() => setCreateModal(null)}>
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
		</>
	);
}
