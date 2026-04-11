'use client';

import { useState } from 'react';

interface OperatorRosterPlayer {
	name: string;
	biId: string;
	characterId: number | null;
	unitColor: string | null;
	unitName: string | null;
	callsign: string | null;
}

export function OperatorRoster({
	players,
	isLive,
	isStale,
	canListOperators,
}: {
	players: OperatorRosterPlayer[];
	isLive: boolean;
	isStale: boolean;
	canListOperators: boolean;
}) {
	const [open, setOpen] = useState(false);
	const count = players.length;

	return (
		<span className="map-operator-count-wrap">
			<span className={isStale ? 'stale-dot' : 'live-dot'} />
			{isLive ? (
				canListOperators ? (
					<button
						type="button"
						className="map-operator-count-btn"
						onClick={() => setOpen(v => !v)}
						title="Afficher la liste des opérateurs en ligne"
					>
						{count} opérateur{count !== 1 ? 's' : ''}
					</button>
				) : (
					<span>En ligne</span>
				)
			) : (
				<span>Hors ligne</span>
			)}
			{open && count > 0 && (
				<div className="map-operator-roster" onClick={e => e.stopPropagation()}>
					<div className="map-operator-roster-head">
						<span>Opérateurs en ligne</span>
						<button
							type="button"
							className="map-operator-roster-close"
							onClick={() => setOpen(false)}
							aria-label="Fermer"
						>
							✕
						</button>
					</div>
					<ul className="map-operator-roster-list">
						{players
							.slice()
							.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
							.map(p => (
								<li key={p.biId} className="map-operator-roster-item">
									<span
										className="map-operator-roster-dot"
										style={{ background: p.unitColor || '#7aff7a' }}
									/>
									<span className="map-operator-roster-name">
										{p.characterId ? (
											<a
												href={`/roleplay/personnage/${p.characterId}`}
												className="map-operator-roster-link"
											>
												{p.name}
											</a>
										) : (
											p.name
										)}
									</span>
									{p.callsign && (
										<span className="map-operator-roster-callsign">
											« {p.callsign} »
										</span>
									)}
									{p.unitName && (
										<span
											className="map-operator-roster-unit"
											style={{ color: p.unitColor || '#9aa' }}
										>
											{p.unitName}
										</span>
									)}
								</li>
							))}
					</ul>
				</div>
			)}
		</span>
	);
}
