'use client';

import { useGmMode } from './useGmMode';

export function AdminBar({ isAdmin }: { isAdmin: boolean }) {
	if (!isAdmin) return null;
	const {
		enabled,
		defaultCharacterId,
		npcList,
		npcListLoading,
		npcListError,
		setEnabled,
		setDefault,
	} = useGmMode();

	if (!enabled) {
		return (
			<div className="comms-admin-bar comms-admin-bar--off">
				<span className="comms-admin-bar__label">ADMIN</span>
				<button
					type="button"
					className="comms-admin-bar__pill"
					onClick={() => setEnabled(true)}
					title="Activer le mode MJ"
				>
					MJ
				</button>
			</div>
		);
	}

	const active =
		defaultCharacterId != null && npcList
			? npcList.find((n) => n.id === defaultCharacterId) || null
			: null;

	return (
		<div className="comms-admin-bar comms-admin-bar--on">
			<span className="comms-admin-bar__label">MODE MJ</span>
			{active ? (
				<div className="comms-admin-bar__active">
					{active.avatarUrl && (
						<img
							src={active.avatarUrl}
							alt=""
							className="comms-admin-bar__avatar"
						/>
					)}
					<span>
						{active.rankAbbreviation ? `(${active.rankAbbreviation}) ` : ''}
						{active.fullName}
						{active.isTarget ? ' — CIBLE' : ''}
					</span>
					<button
						type="button"
						className="comms-admin-bar__swap"
						onClick={() => setDefault(null)}
						title="Changer de personnage incarné"
					>
						Changer
					</button>
				</div>
			) : (
				<div className="comms-admin-bar__picker">
					{npcListLoading && <span>Chargement…</span>}
					{npcListError && (
						<span className="comms-admin-bar__error">
							{npcListError}
						</span>
					)}
					{npcList && (
						<select
							value=""
							onChange={(e) => {
								const v = Number(e.target.value);
								if (!Number.isNaN(v) && v > 0) setDefault(v);
							}}
							className="comms-admin-bar__select"
						>
							<option value="">Incarner…</option>
							{npcList.map((n) => (
								<option key={n.id} value={n.id}>
									{n.rankAbbreviation ? `(${n.rankAbbreviation}) ` : ''}
									{n.fullName}
									{n.isTarget ? ' — CIBLE' : ''}
								</option>
							))}
						</select>
					)}
				</div>
			)}
			<button
				type="button"
				className="comms-admin-bar__quit"
				onClick={() => setEnabled(false)}
				title="Désactiver le mode MJ"
			>
				Quitter MJ
			</button>
		</div>
	);
}
