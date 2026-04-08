'use client';

import { useState } from 'react';
import { UnitManagement } from './admin/UnitManagement';
import { FactionManagement } from './admin/FactionManagement';
import { CharacterManagement } from './admin/CharacterManagement';
import type { UnitItem, FactionItem, RankItem } from './admin/types';

export type { UnitItem, FactionItem, RankItem };

export function AdminPanel({
	units,
	factions,
	ranks = [],
	adminLevel = 'full',
}: {
	units: UnitItem[];
	factions: FactionItem[];
	ranks?: RankItem[];
	adminLevel?: 'full' | 'limited';
}) {
	const isFullAccess = adminLevel === 'full';
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	// Track which section is active (unit create, faction create, character create, unit edit, faction edit)
	const [activeSection, setActiveSection] = useState<
		| 'none'
		| 'unit-create'
		| 'faction-create'
		| 'character-create'
		| 'unit-edit'
		| 'faction-edit'
	>('none');

	const showUnitForm = activeSection === 'unit-create';
	const showFactionForm = activeSection === 'faction-create';
	const showCharacterForm = activeSection === 'character-create';

	return (
		<div
			style={{
				border: '1px solid var(--primary)',
				padding: '1.5rem',
				marginBottom: '1.5rem',
				background: 'rgba(139, 69, 19, 0.05)',
			}}
		>
			<h2 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '1rem' }}>
				Administration
			</h2>

			{error && (
				<div
					style={{
						padding: '0.5rem 0.75rem',
						background: 'rgba(139,38,53,0.15)',
						border: '1px solid var(--danger)',
						color: 'var(--danger)',
						marginBottom: '1rem',
						fontSize: '0.85rem',
					}}
				>
					{error}
				</div>
			)}
			{success && (
				<div
					style={{
						padding: '0.5rem 0.75rem',
						background: 'rgba(74,124,35,0.15)',
						border: '1px solid var(--primary)',
						color: 'var(--primary)',
						marginBottom: '1rem',
						fontSize: '0.85rem',
					}}
				>
					{success}
				</div>
			)}

			<div
				style={{
					display: 'flex',
					gap: '0.75rem',
					flexWrap: 'wrap',
					marginBottom: '1rem',
				}}
			>
				<button
					type="button"
					onClick={() =>
						setActiveSection(showUnitForm ? 'none' : 'unit-create')
					}
					className="session-btn"
					style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
				>
					{showUnitForm ? 'Annuler' : '+ Nouvelle Unité'}
				</button>
				<button
					type="button"
					onClick={() =>
						setActiveSection(showFactionForm ? 'none' : 'faction-create')
					}
					className="session-btn"
					style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
				>
					{showFactionForm ? 'Annuler' : '+ Nouvelle Faction'}
				</button>
				<button
					type="button"
					onClick={() =>
						setActiveSection(showCharacterForm ? 'none' : 'character-create')
					}
					className="session-btn"
					style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
				>
					{showCharacterForm ? 'Annuler' : '+ Nouveau PNJ / Cible'}
				</button>
			</div>

			<CharacterManagement
				units={units}
				ranks={ranks}
				showCreateForm={showCharacterForm}
				setError={setError}
				setSuccess={setSuccess}
				submitting={submitting}
				setSubmitting={setSubmitting}
			/>

			<UnitManagement
				units={units}
				factions={factions}
				isFullAccess={isFullAccess}
				showCreateForm={showUnitForm}
				isEditing={activeSection === 'unit-edit'}
				onStartEdit={() => setActiveSection('unit-edit')}
				onStopEdit={() => setActiveSection('none')}
				setError={setError}
				setSuccess={setSuccess}
				submitting={submitting}
				setSubmitting={setSubmitting}
			/>
			<FactionManagement
				factions={factions}
				isFullAccess={isFullAccess}
				showCreateForm={showFactionForm}
				isEditing={activeSection === 'faction-edit'}
				onStartEdit={() => setActiveSection('faction-edit')}
				onStopEdit={() => setActiveSection('none')}
				setError={setError}
				setSuccess={setSuccess}
				submitting={submitting}
				setSubmitting={setSubmitting}
			/>
		</div>
	);
}
