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
	discordUsername?: string;
	avatar?: { url: string } | null;
	rank?: { name: string; abbreviation: string; order: number; icon?: { url: string } | null } | null;
	unit?: { name: string; slug: string } | null;
}

interface Rank {
	id: number;
	name: string;
	abbreviation: string;
	order: number;
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

export function PersonnelFilters({
	characters,
	ranks,
	units,
}: {
	characters: Character[];
	ranks: Rank[];
	units: Unit[];
}) {
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [rankFilter, setRankFilter] = useState('all');
	const [unitFilter, setUnitFilter] = useState('all');

	const filtered = useMemo(() => {
		return characters.filter(c => {
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
	}, [characters, search, statusFilter, rankFilter, unitFilter]);

	return (
		<>
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

			<div className="personnel-grid">
				{filtered.map(character => (
					<Link
						key={character.id}
						href={`/roleplay/personnage/${character.id}`}
						className="personnel-card"
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
								<div className="personnel-name">{character.fullName}</div>
								{character.rank && typeof character.rank === 'object' && (
									<div className="personnel-rank" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
										{character.rank.icon?.url && (
											<Image src={character.rank.icon.url} alt={character.rank.name} width={18} height={18} unoptimized />
										)}
										<span>{character.rank.abbreviation || character.rank.name}</span>
									</div>
								)}
								{character.unit && typeof character.unit === 'object' && (
									<div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
										{character.unit.name}
									</div>
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

			{filtered.length === 0 && (
				<div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
					Aucun dossier trouvé correspondant aux critères de recherche.
				</div>
			)}
		</>
	);
}
