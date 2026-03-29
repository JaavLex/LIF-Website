'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Character {
	id: number;
	fullName: string;
	firstName: string;
	lastName: string;
	militaryId: string;
	status: string;
	classification: string;
	faction: string;
	isMainCharacter: boolean;
	isTarget: boolean;
	targetFaction?: string;
	threatLevel?: string;
	discordUsername?: string;
	avatar?: { url: string } | null;
	rank?: { id: number; name: string; abbreviation: string; order: number; icon?: { url: string } | null } | null;
	unit?: { name: string; slug: string; insignia?: { url: string } | null } | null;
}

interface Rank {
	id: number;
	name: string;
	abbreviation: string;
	order: number;
	icon?: { url: string } | null;
}

interface Unit {
	id: number;
	name: string;
	slug: string;
}

const STATUS_LABELS: Record<string, string> = {
	'in-service': 'En service',
	kia: 'KIA',
	mia: 'MIA',
	retired: 'Retraité',
	'honourable-discharge': 'Réformé (H)',
	'dishonourable-discharge': 'Réformé (DH)',
	executed: 'Exécuté',
};

const STATUS_ORDER: Record<string, number> = {
	'in-service': 0,
	mia: 1,
	retired: 2,
	'honourable-discharge': 3,
	'dishonourable-discharge': 4,
	kia: 5,
	executed: 6,
};

const THREAT_LABELS: Record<string, string> = {
	low: 'Faible',
	moderate: 'Modéré',
	high: 'Élevé',
	critical: 'Critique',
};

type TabType = 'personnel' | 'targets' | 'my-characters' | 'archives';

export function PersonnelFilters({
	characters,
	ranks,
	units,
	sessionDiscordId,
	isAdmin,
}: {
	characters: Character[];
	ranks: Rank[];
	units: Unit[];
	sessionDiscordId?: string;
	isAdmin?: boolean;
}) {
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [rankFilter, setRankFilter] = useState('all');
	const [unitFilter, setUnitFilter] = useState('all');
	const [activeTab, setActiveTab] = useState<TabType>('personnel');

	// Split and filter
	const { personnel, targets, myCharacters, archives } = useMemo(() => {
		const personnel: Character[] = [];
		const targets: Character[] = [];
		const myCharacters: Character[] = [];
		const archives: Character[] = [];

		for (const c of characters) {
			if ((c as any).isArchived) {
				archives.push(c);
				continue;
			}
			if (c.isTarget) {
				targets.push(c);
			} else {
				personnel.push(c);
			}
			if (sessionDiscordId && (c as any).discordId === sessionDiscordId) {
				myCharacters.push(c);
			}
		}

		return { personnel, targets, myCharacters, archives };
	}, [characters, sessionDiscordId]);

	const getActiveList = () => {
		switch (activeTab) {
			case 'personnel': return personnel;
			case 'targets': return targets;
			case 'my-characters': return myCharacters;
			case 'archives': return archives;
			default: return personnel;
		}
	};

	const filtered = useMemo(() => {
		const list = getActiveList();

		const result = list.filter(c => {
			if (search) {
				const q = search.toLowerCase();
				const matches =
					c.fullName?.toLowerCase().includes(q) ||
					c.militaryId?.toLowerCase().includes(q) ||
					c.firstName?.toLowerCase().includes(q) ||
					c.lastName?.toLowerCase().includes(q);
				if (!matches) return false;
			}
			if (statusFilter !== 'all' && c.status !== statusFilter) return false;
			if (rankFilter !== 'all') {
				const rankId =
					typeof c.rank === 'object' && c.rank ? (c.rank as any).id : c.rank;
				if (String(rankId) !== rankFilter) return false;
			}
			if (unitFilter !== 'all') {
				const unitId =
					typeof c.unit === 'object' && c.unit ? (c.unit as any).id : c.unit;
				if (String(unitId) !== unitFilter) return false;
			}
			return true;
		});

		// Sort: status first, then rank (descending order)
		result.sort((a, b) => {
			const statusA = STATUS_ORDER[a.status] ?? 99;
			const statusB = STATUS_ORDER[b.status] ?? 99;
			if (statusA !== statusB) return statusA - statusB;

			const rankA = typeof a.rank === 'object' && a.rank ? a.rank.order : 0;
			const rankB = typeof b.rank === 'object' && b.rank ? b.rank.order : 0;
			return rankB - rankA; // Higher rank first
		});

		return result;
	}, [activeTab, personnel, targets, myCharacters, archives, search, statusFilter, rankFilter, unitFilter]);

	// Group by status for separators
	const groupedByStatus = useMemo(() => {
		const groups: { status: string; characters: Character[] }[] = [];
		let currentStatus = '';

		for (const c of filtered) {
			if (c.status !== currentStatus) {
				currentStatus = c.status;
				groups.push({ status: currentStatus, characters: [c] });
			} else {
				groups[groups.length - 1].characters.push(c);
			}
		}
		return groups;
	}, [filtered]);

	const tabs: { key: TabType; label: string; count: number }[] = [
		{ key: 'personnel', label: 'Personnel', count: personnel.length },
		{ key: 'targets', label: 'Cibles', count: targets.length },
	];
	if (sessionDiscordId) {
		tabs.push({ key: 'my-characters', label: 'Mes personnages', count: myCharacters.length });
	}
	if (isAdmin) {
		tabs.push({ key: 'archives', label: 'Archives', count: archives.length });
	}

	return (
		<>
			{/* Tabs */}
			<div className="personnel-tabs">
				{tabs.map(tab => (
					<button
						key={tab.key}
						className={`personnel-tab ${activeTab === tab.key ? 'active' : ''}`}
						onClick={() => setActiveTab(tab.key)}
					>
						{tab.label}
						<span className="tab-count">{tab.count}</span>
					</button>
				))}
			</div>

			{/* Filters */}
			<div className="filters-bar">
				<input
					type="text"
					className="filter-input"
					placeholder="Rechercher par nom ou matricule..."
					value={search}
					onChange={e => setSearch(e.target.value)}
				/>
				<select
					className="filter-select"
					value={statusFilter}
					onChange={e => setStatusFilter(e.target.value)}
				>
					<option value="all">Tous les statuts</option>
					{Object.entries(STATUS_LABELS).map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
				<select
					className="filter-select"
					value={rankFilter}
					onChange={e => setRankFilter(e.target.value)}
				>
					<option value="all">Tous les grades</option>
					{ranks.map(r => (
						<option key={r.id} value={r.id}>
							{r.name}
						</option>
					))}
				</select>
				<select
					className="filter-select"
					value={unitFilter}
					onChange={e => setUnitFilter(e.target.value)}
				>
					<option value="all">Toutes les unités</option>
					{units.map(u => (
						<option key={u.id} value={u.id}>
							{u.name}
						</option>
					))}
				</select>
			</div>

			<div
				style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}
			>
				{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
			</div>

			{/* Render grouped by status with separators */}
			{groupedByStatus.map(group => (
				<div key={group.status}>
					<div className="status-separator">
						<span className={`status-badge ${group.status}`}>
							{STATUS_LABELS[group.status] || group.status}
						</span>
						<span className="separator-line" />
						<span className="separator-count">{group.characters.length}</span>
					</div>
					<div className="personnel-grid">
						{group.characters.map(character => (
							<Link
								key={character.id}
								href={`/roleplay/personnage/${character.id}`}
								className={`personnel-card ${activeTab === 'targets' ? 'target-card' : ''}`}
							>
								<div className="personnel-card-header">
									{character.avatar?.url ? (
										<Image
											src={character.avatar.url}
											alt={character.fullName}
											width={64}
											height={64}
											className="personnel-avatar"
											unoptimized
										/>
									) : (
										<div className="personnel-avatar-placeholder">
											{character.firstName?.[0]}
											{character.lastName?.[0]}
										</div>
									)}
									<div className="personnel-info">
										<div className="personnel-name">
											{character.isMainCharacter && <span className="main-character-badge" title="Personnage principal">★</span>}
											{character.fullName}
										</div>
										{character.rank && typeof character.rank === 'object' && (
											<div className="personnel-rank" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
												{character.rank.icon?.url && (
													<Image src={character.rank.icon.url} alt={character.rank.name} width={18} height={18} unoptimized />
												)}
												<span>{character.rank.abbreviation || character.rank.name}</span>
											</div>
										)}
										{!character.rank && (
											<div className="personnel-rank" style={{ color: 'var(--muted)' }}>
												Aucun grade
											</div>
										)}
										{character.unit && typeof character.unit === 'object' && (
											<div className="personnel-unit-info">
												{character.unit.insignia?.url && (
													<Image
														src={character.unit.insignia.url}
														alt={character.unit.name}
														width={16}
														height={16}
														className="unit-insignia-small"
														unoptimized
													/>
												)}
												<span>{character.unit.name}</span>
											</div>
										)}
										{/* Target-specific: faction and threat */}
										{character.isTarget && character.targetFaction && (
											<div className="target-faction-info">
												{character.targetFaction}
											</div>
										)}
										{character.isTarget && character.threatLevel && (
											<span className={`threat-badge ${character.threatLevel}`}>
												{THREAT_LABELS[character.threatLevel] || character.threatLevel}
											</span>
										)}
										{character.discordUsername && (
											<div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
												@{character.discordUsername}
											</div>
										)}
									</div>
								</div>
								<div className="personnel-card-meta">
									<span className="personnel-id">{character.militaryId || '—'}</span>
									<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
										<span className={`status-badge ${character.status}`}>
											{STATUS_LABELS[character.status] || character.status}
										</span>
										<span className={`classification-badge ${character.classification}`}>
											{character.classification}
										</span>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>
			))}

			{/* Empty states */}
			{filtered.length === 0 && (
				<div className="empty-state">
					{activeTab === 'personnel' && 'Aucun dossier personnel trouvé.'}
					{activeTab === 'targets' && 'Aucune cible enregistrée.'}
					{activeTab === 'my-characters' && 'Vous n\'avez aucun personnage.'}
					{activeTab === 'archives' && 'Aucun dossier archivé.'}
				</div>
			)}
		</>
	);
}
