'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
	Search,
	ChevronDown,
	Shield,
	Flag,
	Activity,
	LayoutGrid,
	Skull,
	HelpCircle,
	Armchair,
	Award,
	ShieldOff,
	Crosshair,
	FileWarning,
} from 'lucide-react';

interface Character {
	id: number;
	fullName: string;
	firstName: string;
	lastName: string;
	callsign?: string | null;
	militaryId: string;
	status: string;
	classification: string;
	faction: string;
	isMainCharacter: boolean;
	isTarget: boolean;
	isArchived?: boolean;
	discordId?: string;
	targetFaction?: string;
	threatLevel?: string;
	requiresImprovements?: boolean;
	discordUsername?: string;
	avatar?: { url: string } | null;
	rank?: {
		id: number;
		name: string;
		abbreviation: string;
		order: number;
		icon?: { url: string } | null;
	} | null;
	unit?: {
		id: number;
		name: string;
		slug: string;
		insignia?: { url: string } | null;
	} | null;
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

interface FactionItem {
	id: number;
	name: string;
	slug: string;
	type?: string;
	color?: string;
	logo?: { url?: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
	'in-service': 'En service',
	kia: 'KIA',
	mia: 'MIA',
	retired: 'Retraité',
	'honourable-discharge': 'Réformé (H)',
	'dishonourable-discharge': 'Réformé (DH)',
	'sheet-incomplete': 'Fiche incomplète',
	executed: 'Exécuté',
};

const STATUS_ORDER: Record<string, number> = {
	'in-service': 0,
	'sheet-incomplete': 1,
	mia: 2,
	retired: 3,
	'honourable-discharge': 4,
	'dishonourable-discharge': 5,
	kia: 6,
	executed: 7,
};

const STATUS_ICONS: Record<string, typeof Activity> = {
	'in-service': Activity,
	kia: Skull,
	mia: HelpCircle,
	retired: Armchair,
	'honourable-discharge': Award,
	'dishonourable-discharge': ShieldOff,
	'sheet-incomplete': FileWarning,
	executed: Crosshair,
};

const THREAT_LABELS: Record<string, string> = {
	low: 'Faible',
	moderate: 'Modéré',
	high: 'Élevé',
	critical: 'Critique',
};

type TabType = 'personnel' | 'targets' | 'npcs' | 'my-characters' | 'archives';
type GroupByType = 'status' | 'unit' | 'faction';

export function PersonnelFilters({
	characters,
	ranks,
	units,
	factions,
	sessionDiscordId,
	isAdmin,
}: {
	characters: Character[];
	ranks: Rank[];
	units: Unit[];
	factions?: FactionItem[];
	sessionDiscordId?: string;
	isAdmin?: boolean;
}) {
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [rankFilter, setRankFilter] = useState('all');
	const [unitFilter, setUnitFilter] = useState('all');
	const [activeTab, setActiveTab] = useState<TabType>('personnel');
	const [groupBy, setGroupBy] = useState<GroupByType>('status');
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

	const factionMap = useMemo(() => {
		const map = new Map<string, FactionItem>();
		(factions || []).forEach(f => {
			if (f?.name) map.set(f.name, f);
		});
		return map;
	}, [factions]);

	// Split into tab buckets
	const { personnel, targets, npcs, myCharacters, archives } = useMemo(() => {
		const personnel: Character[] = [];
		const targets: Character[] = [];
		const npcs: Character[] = [];
		const myCharacters: Character[] = [];
		const archives: Character[] = [];

		for (const c of characters) {
			if (c.isArchived) {
				archives.push(c);
				continue;
			}
			if (c.isTarget) {
				targets.push(c);
			} else if (!c.discordId) {
				npcs.push(c);
			} else {
				personnel.push(c);
			}
			if (sessionDiscordId && c.discordId === sessionDiscordId) {
				myCharacters.push(c);
			}
		}

		return { personnel, targets, npcs, myCharacters, archives };
	}, [characters, sessionDiscordId]);

	const getActiveList = () => {
		switch (activeTab) {
			case 'personnel':
				return personnel;
			case 'targets':
				return targets;
			case 'npcs':
				return npcs;
			case 'my-characters':
				return myCharacters;
			case 'archives':
				return archives;
			default:
				return personnel;
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
					typeof c.rank === 'object' && c.rank ? c.rank.id : c.rank;
				if (String(rankId) !== rankFilter) return false;
			}
			if (unitFilter !== 'all') {
				const unitId =
					typeof c.unit === 'object' && c.unit ? c.unit.id : c.unit;
				if (String(unitId) !== unitFilter) return false;
			}
			return true;
		});

		// Sort: status first, then rank descending
		result.sort((a, b) => {
			const statusA = STATUS_ORDER[a.status] ?? 99;
			const statusB = STATUS_ORDER[b.status] ?? 99;
			if (statusA !== statusB) return statusA - statusB;

			const rankA = typeof a.rank === 'object' && a.rank ? a.rank.order : 0;
			const rankB = typeof b.rank === 'object' && b.rank ? b.rank.order : 0;
			return rankB - rankA;
		});

		return result;
	}, [
		activeTab,
		personnel,
		targets,
		npcs,
		myCharacters,
		archives,
		search,
		statusFilter,
		rankFilter,
		unitFilter,
	]);

	type GroupBucket = {
		key: string;
		label: string;
		iconUrl?: string;
		fallbackIcon: 'status' | 'unit' | 'faction';
		statusKey?: string;
		color?: string;
		characters: Character[];
		sortKey: number;
	};

	const groups: GroupBucket[] = useMemo(() => {
		const map = new Map<string, GroupBucket>();

		for (const c of filtered) {
			let key: string;
			let label: string;
			let iconUrl: string | undefined;
			let fallbackIcon: GroupBucket['fallbackIcon'] = 'status';
			let statusKey: string | undefined;
			let color: string | undefined;
			let sortKey = 0;

			if (groupBy === 'status') {
				const displayStatus = c.requiresImprovements ? 'sheet-incomplete' : c.status;
				key = `s-${displayStatus}`;
				label = STATUS_LABELS[displayStatus] || displayStatus;
				fallbackIcon = 'status';
				statusKey = displayStatus;
				sortKey = STATUS_ORDER[displayStatus] ?? 99;
			} else if (groupBy === 'unit') {
				const u = typeof c.unit === 'object' && c.unit ? c.unit : null;
				key = u ? `u-${u.id}` : 'u-none';
				label = u ? u.name : 'Sans unité';
				iconUrl = u?.insignia?.url;
				fallbackIcon = 'unit';
				sortKey = u ? u.id : 9999;
			} else {
				const fname = c.isTarget ? c.targetFaction : c.faction;
				key = fname ? `f-${fname}` : 'f-none';
				label = fname || 'Sans faction';
				const fobj = fname ? factionMap.get(fname) : null;
				iconUrl = fobj?.logo?.url;
				color = fobj?.color;
				fallbackIcon = 'faction';
				sortKey = fname ? 0 : 9999;
			}

			let g = map.get(key);
			if (!g) {
				g = {
					key,
					label,
					iconUrl,
					fallbackIcon,
					statusKey,
					color,
					characters: [],
					sortKey,
				};
				map.set(key, g);
			}
			g.characters.push(c);
		}

		const arr = Array.from(map.values());
		arr.sort((a, b) => {
			if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
			return a.label.localeCompare(b.label);
		});
		return arr;
	}, [filtered, groupBy, factionMap]);

	const toggleGroup = (key: string) => {
		setCollapsedGroups(prev => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const collapseAll = () =>
		setCollapsedGroups(new Set(groups.map(g => g.key)));
	const expandAll = () => setCollapsedGroups(new Set());

	const tabs: { key: TabType; label: string; count: number }[] = [
		{ key: 'personnel', label: 'Personnel', count: personnel.length },
		{ key: 'targets', label: 'Cibles', count: targets.length },
	];
	if (sessionDiscordId) {
		tabs.push({
			key: 'my-characters',
			label: 'Mes personnages',
			count: myCharacters.length,
		});
	}
	if (isAdmin) {
		tabs.push({ key: 'npcs', label: 'PNJ', count: npcs.length });
		tabs.push({ key: 'archives', label: 'Archives', count: archives.length });
	}

	return (
		<div data-tutorial="filters">
			{/* Command panel — org-card aesthetic */}
			<div className="personnel-command">
				<div className="personnel-command-bg" aria-hidden />
				<div className="personnel-command-tabs">
					{tabs.map(tab => (
						<button
							key={tab.key}
							type="button"
							className={`personnel-command-tab ${activeTab === tab.key ? 'active' : ''}`}
							onClick={() => setActiveTab(tab.key)}
						>
							<span className="personnel-command-tab-label">{tab.label}</span>
							<span className="personnel-command-tab-count">{tab.count}</span>
						</button>
					))}
				</div>

				<div className="personnel-command-row">
					<div className="personnel-search">
						<Search size={14} strokeWidth={2} />
						<input
							type="text"
							placeholder="Rechercher par nom, callsign ou matricule…"
							value={search}
							onChange={e => setSearch(e.target.value)}
						/>
					</div>
					<div className="personnel-command-count">
						<span className="personnel-command-count-num">{filtered.length}</span>
						<span className="personnel-command-count-label">
							résultat{filtered.length !== 1 ? 's' : ''}
						</span>
					</div>
				</div>

				<div className="personnel-command-row">
					<select
						className="filter-select personnel-command-select"
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
						className="filter-select personnel-command-select"
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
						className="filter-select personnel-command-select"
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

				<div className="personnel-command-row personnel-command-bottom">
					<div className="personnel-groupby">
						<span className="personnel-groupby-label">
							<LayoutGrid size={11} strokeWidth={2} />
							Grouper
						</span>
						<button
							type="button"
							className={`personnel-groupby-btn ${groupBy === 'status' ? 'active' : ''}`}
							onClick={() => setGroupBy('status')}
						>
							<Activity size={11} strokeWidth={2} />
							Statut
						</button>
						<button
							type="button"
							className={`personnel-groupby-btn ${groupBy === 'unit' ? 'active' : ''}`}
							onClick={() => setGroupBy('unit')}
						>
							<Shield size={11} strokeWidth={2} />
							Unité
						</button>
						<button
							type="button"
							className={`personnel-groupby-btn ${groupBy === 'faction' ? 'active' : ''}`}
							onClick={() => setGroupBy('faction')}
						>
							<Flag size={11} strokeWidth={2} />
							Faction
						</button>
					</div>
					<div className="personnel-collapse-actions">
						<button
							type="button"
							className="personnel-collapse-btn"
							onClick={expandAll}
						>
							Tout déplier
						</button>
						<span className="personnel-collapse-sep">·</span>
						<button
							type="button"
							className="personnel-collapse-btn"
							onClick={collapseAll}
						>
							Tout replier
						</button>
					</div>
				</div>
			</div>

			{/* Groups */}
			{groups.map(group => {
				const collapsed = collapsedGroups.has(group.key);
				const groupClass = `personnel-group${collapsed ? ' collapsed' : ''} group-icon-${group.fallbackIcon}${
					group.statusKey ? ` group-status-${group.statusKey}` : ''
				}`;
				const styleVars: React.CSSProperties = group.color
					? ({ ['--group-color' as any]: group.color } as React.CSSProperties)
					: {};
				return (
					<div key={group.key} className={groupClass} style={styleVars}>
						<button
							type="button"
							className="personnel-group-header"
							onClick={() => toggleGroup(group.key)}
							aria-expanded={!collapsed}
						>
							<span className="personnel-group-icon">
								{group.iconUrl ? (
									<Image
										src={group.iconUrl}
										alt={group.label}
										width={22}
										height={22}
										unoptimized
									/>
								) : group.fallbackIcon === 'unit' ? (
									<Shield size={14} strokeWidth={1.6} />
								) : group.fallbackIcon === 'faction' ? (
									<Flag size={14} strokeWidth={1.6} />
								) : (() => {
									const StatusIcon = (group.statusKey && STATUS_ICONS[group.statusKey]) || Activity;
									return <StatusIcon size={14} strokeWidth={1.6} />;
								})()}
							</span>
							<span className="personnel-group-label">{group.label}</span>
							<span className="personnel-group-line" />
							<span className="personnel-group-count">
								{group.characters.length}
							</span>
							<ChevronDown
								size={16}
								strokeWidth={2}
								className="personnel-group-chevron"
							/>
						</button>
						{!collapsed && (
							<div className="personnel-group-body">
								<div className="char-grid">
									{group.characters.map(character => {
										const rank =
											typeof character.rank === 'object' && character.rank
												? character.rank
												: null;
										const unit =
											typeof character.unit === 'object' && character.unit
												? character.unit
												: null;
										const factionName = character.isTarget
											? character.targetFaction
											: character.faction;
										const factionObj = factionName
											? factionMap.get(factionName)
											: null;
										return (
											<Link
												key={character.id}
												href={`/roleplay/personnage/${character.id}`}
												className={`char-card status-${character.requiresImprovements ? 'sheet-incomplete' : character.status}${character.isTarget ? ' is-target' : ''}${character.isMainCharacter ? ' is-main' : ''}`}
												data-status={character.status}
												data-classification={character.classification}
											>
												{character.isTarget && character.threatLevel && (
													<span
														className={`char-card-threat threat-${character.threatLevel}`}
														title={`Menace: ${THREAT_LABELS[character.threatLevel] || character.threatLevel}`}
													>
														{THREAT_LABELS[character.threatLevel] ||
															character.threatLevel}
													</span>
												)}
												<div className="char-card-avatar">
													{character.avatar?.url ? (
														<Image
															src={character.avatar.url}
															alt={character.fullName}
															width={50}
															height={50}
															unoptimized
														/>
													) : (
														<span className="char-card-avatar-initials">
															{character.firstName?.[0]}
															{character.lastName?.[0]}
														</span>
													)}
												</div>
												<div className="char-card-body">
													<div className="char-card-name-row">
														<span className="char-card-name">
															{character.fullName}
														</span>
														{character.isMainCharacter && (
															<span
																className="char-card-main-star"
																title="Personnage principal"
															>
																★
															</span>
														)}
													</div>
													<div className="char-card-meta">
														<span className="char-card-meta-rank">
															{rank?.icon?.url && (
																<Image
																	src={rank.icon.url}
																	alt={rank.name}
																	title={rank.name}
																	width={14}
																	height={14}
																	unoptimized
																/>
															)}
															<span>
																{rank?.abbreviation || rank?.name || 'SANS GRADE'}
															</span>
														</span>
														{unit && (
															<>
																<span className="char-card-meta-sep">·</span>
																<span className="char-card-meta-unit">
																	{unit.insignia?.url && (
																		<Image
																			src={unit.insignia.url}
																			alt={unit.name}
																			title={unit.name}
																			width={14}
																			height={14}
																			unoptimized
																		/>
																	)}
																	<span>{unit.name}</span>
																</span>
															</>
														)}
														{factionName && (
															<>
																<span className="char-card-meta-sep">·</span>
																<span className="char-card-meta-faction">
																	{factionObj?.logo?.url && (
																		<Image
																			src={factionObj.logo.url}
																			alt={factionName}
																			title={factionName}
																			width={14}
																			height={14}
																			unoptimized
																		/>
																	)}
																	<span>{factionName}</span>
																</span>
															</>
														)}
													</div>
												</div>
												<div className="char-card-end">
													<div className="char-card-tags">
														<span
															className={`char-card-class class-${character.classification}`}
															title={character.classification}
														>
															{character.classification?.charAt(0).toUpperCase()}
														</span>
														<span
															className="char-card-status-dot"
															title={
																STATUS_LABELS[character.status] || character.status
															}
															aria-hidden
														/>
													</div>
													<span
														className="char-card-id"
														title={character.militaryId || ''}
													>
														{character.militaryId || '—'}
													</span>
													<span className="char-card-arrow" aria-hidden>
														›
													</span>
												</div>
											</Link>
										);
									})}
								</div>
							</div>
						)}
					</div>
				);
			})}

			{/* Empty states */}
			{filtered.length === 0 && (
				<div className="empty-state">
					{activeTab === 'personnel' && 'Aucun dossier personnel trouvé.'}
					{activeTab === 'targets' && 'Aucune cible enregistrée.'}
					{activeTab === 'npcs' && 'Aucun PNJ enregistré.'}
					{activeTab === 'my-characters' && "Vous n'avez aucun personnage."}
					{activeTab === 'archives' && 'Aucun dossier archivé.'}
				</div>
			)}
		</div>
	);
}
