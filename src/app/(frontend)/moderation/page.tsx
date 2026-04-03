'use client';

import { useState, useEffect, useCallback } from 'react';
import './moderation.css';
import UsersTab from '@/components/moderation/UsersTab';
import CasesTab from '@/components/moderation/CasesTab';
import TranscriptsTab from '@/components/moderation/TranscriptsTab';
import type { SessionUser, ModerationUser } from '@/components/moderation/types';

export default function ModerationPage() {
	const [loading, setLoading] = useState(true);
	const [authorized, setAuthorized] = useState(false);
	const [adminLevel, setAdminLevel] = useState<string>('none');
	const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
	const [users, setUsers] = useState<ModerationUser[]>([]);
	const [usersLoading, setUsersLoading] = useState(true);
	const [usersSource, setUsersSource] = useState<'known' | 'search'>('known');
	const [guildRoles, setGuildRoles] = useState<
		{ id: string; name: string; color: string }[]
	>([]);
	const [adminRoleIds, setAdminRoleIds] = useState<string[]>([]);
	const [search, setSearch] = useState('');
	const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
	const [filterWarn, setFilterWarn] = useState(false);
	const [filterCase, setFilterCase] = useState(false);
	const [error, setError] = useState('');

	// Tab state
	const [tab, setTab] = useState<'users' | 'cases' | 'transcripts'>('users');

	useEffect(() => {
		checkAuth();
	}, []);

	async function checkAuth() {
		try {
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
			if (data.guildRoles) setGuildRoles(data.guildRoles);
			if (data.adminRoleIds) setAdminRoleIds(data.adminRoleIds);
		} catch (err: any) {
			setError(err.message);
		}
		setUsersLoading(false);
	}

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearch(value);
			if (searchTimer) clearTimeout(searchTimer);
			if (value.length >= 2) {
				const timer = setTimeout(() => loadUsers(value), 400);
				setSearchTimer(timer);
			} else if (value.length === 0) {
				loadUsers();
			}
		},
		[searchTimer],
	);

	const totalWarns = users.reduce((acc, u) => acc + u.warnCount, 0);
	const activeCases = users.reduce(
		(acc, u) =>
			acc +
			u.cases.filter(c => c.status === 'open' || c.status === 'pending').length,
		0,
	);

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
							<a
								href="/api/auth/discord?redirect=/moderation"
								className="mod-btn primary"
							>
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
								<span className="mod-session-name">
									{sessionUser.discordUsername}
								</span>
								<a
									href="/api/auth/logout?redirect=/moderation"
									className="mod-header-btn mod-header-btn-danger"
								>
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

					{tab === 'users' && (
						<UsersTab
							users={users}
							usersLoading={usersLoading}
							usersSource={usersSource}
							guildRoles={guildRoles}
							adminRoleIds={adminRoleIds}
							search={search}
							onSearchChange={handleSearchChange}
							filterWarn={filterWarn}
							onFilterWarnChange={setFilterWarn}
							filterCase={filterCase}
							onFilterCaseChange={setFilterCase}
							activeCases={activeCases}
							totalWarns={totalWarns}
							error={error}
							onError={setError}
						/>
					)}

					{tab === 'cases' && (
						<CasesTab authorized={authorized} onError={setError} />
					)}

					{tab === 'transcripts' && (
						<TranscriptsTab authorized={authorized} onError={setError} />
					)}
				</div>
			</div>
		</div>
	);
}
