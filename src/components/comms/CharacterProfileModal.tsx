'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';

interface CharProfile {
	id: number;
	fullName?: string;
	firstName?: string;
	lastName?: string;
	callsign?: string | null;
	avatar?: any;
	rank?: any;
	unit?: any;
	faction?: string | null;
	factionLogoUrl?: string | null;
	status?: string;
	classification?: string | null;
	dateOfBirth?: string | null;
	placeOfOrigin?: string | null;
	height?: string | null;
	weight?: string | null;
	physicalDescription?: string | null;
	motto?: string | null;
}

export function CharacterProfileModal({
	characterId,
	onClose,
}: {
	characterId: number;
	onClose: () => void;
}) {
	const [data, setData] = useState<CharProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(false);
		fetch(`/api/roleplay/characters/${characterId}`)
			.then((r) => {
				if (!r.ok) throw new Error('not found');
				return r.json();
			})
			.then((d) => {
				if (!cancelled) {
					setData(d);
					setLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setError(true);
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [characterId]);

	const fullName =
		data?.fullName || `${data?.firstName || ''} ${data?.lastName || ''}`.trim();
	const avatarUrl = typeof data?.avatar === 'object' ? data?.avatar?.url : null;
	const rankName = typeof data?.rank === 'object' ? data?.rank?.name : null;
	const rankIconUrl =
		typeof data?.rank === 'object' && typeof data?.rank?.icon === 'object'
			? data.rank.icon?.url || null
			: null;
	const unitName = typeof data?.unit === 'object' ? data?.unit?.name : null;
	const unitInsigniaUrl =
		typeof data?.unit === 'object' && typeof data?.unit?.insignia === 'object'
			? data.unit.insignia?.url || null
			: null;
	const factionLogoUrl = data?.factionLogoUrl || null;

	return (
		<div className="comms-modal-backdrop" onClick={onClose}>
			<div
				className="comms-modal"
				onClick={(e) => e.stopPropagation()}
				style={{ maxWidth: '560px' }}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '1rem',
					}}
				>
					<h2 style={{ color: 'var(--primary)', margin: 0, letterSpacing: 1 }}>
						FICHE PERSONNAGE
					</h2>
					<button
						className="comms-modal-btn"
						onClick={onClose}
						aria-label="Fermer"
						style={{ padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center' }}
					>
						<X size={14} />
					</button>
				</div>

				{loading && (
					<div style={{ color: 'var(--muted)', padding: '1rem' }}>Chargement…</div>
				)}
				{error && (
					<div style={{ color: 'var(--danger)', padding: '1rem' }}>
						Personnage introuvable.
					</div>
				)}
				{data && !error && (
					<>
						<div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
							<div
								style={{
									width: 96,
									height: 96,
									border: '1px solid var(--primary)',
									flexShrink: 0,
									background: 'rgba(0,0,0,0.4)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'var(--primary)',
									fontSize: '1.5rem',
									overflow: 'hidden',
								}}
							>
								{avatarUrl ? (
									<img
										src={avatarUrl}
										alt=""
										style={{ width: '100%', height: '100%', objectFit: 'cover' }}
									/>
								) : (
									fullName
										.split(' ')
										.map((p) => p[0])
										.slice(0, 2)
										.join('')
								)}
							</div>
							<div style={{ flex: 1, minWidth: 0 }}>
								<div
									style={{
										color: 'var(--primary)',
										fontSize: '1.1rem',
										fontWeight: 'bold',
										display: 'flex',
										alignItems: 'center',
										gap: '0.4rem',
										flexWrap: 'wrap',
									}}
								>
									{rankIconUrl && (
										<img
											src={rankIconUrl}
											alt={rankName || ''}
											title={rankName || ''}
											style={{
												height: 22,
												width: 22,
												objectFit: 'contain',
												padding: 1,
												background: 'rgba(0,0,0,0.5)',
												border: '1px solid var(--primary)',
												borderRadius: 2,
											}}
										/>
									)}
									<span>{fullName}</span>
								</div>
								{data.callsign && (
									<div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
										Indicatif : « {data.callsign} »
									</div>
								)}
								{data.motto && (
									<div
										style={{
											color: 'var(--muted)',
											fontSize: '0.8rem',
											fontStyle: 'italic',
											marginTop: '0.25rem',
										}}
									>
										“{data.motto}”
									</div>
								)}
							</div>
						</div>

						<dl
							style={{
								display: 'grid',
								gridTemplateColumns: 'auto 1fr',
								gap: '0.35rem 0.75rem',
								marginTop: '1rem',
								fontSize: '0.8rem',
							}}
						>
							<dt style={{ color: 'var(--muted)' }}>Grade</dt>
							<dd
								style={{
									margin: 0,
									color: 'var(--text)',
									display: 'flex',
									alignItems: 'center',
									gap: '0.4rem',
								}}
							>
								{rankIconUrl && (
									<img
										src={rankIconUrl}
										alt=""
										style={{ height: 16, width: 16, objectFit: 'contain' }}
									/>
								)}
								{rankName || '—'}
							</dd>
							<dt style={{ color: 'var(--muted)' }}>Faction</dt>
							<dd
								style={{
									margin: 0,
									color: 'var(--text)',
									display: 'flex',
									alignItems: 'center',
									gap: '0.4rem',
								}}
							>
								{factionLogoUrl && (
									<img
										src={factionLogoUrl}
										alt=""
										style={{ height: 16, width: 16, objectFit: 'contain' }}
									/>
								)}
								{data.faction || '—'}
							</dd>
							<dt style={{ color: 'var(--muted)' }}>Unité</dt>
							<dd
								style={{
									margin: 0,
									color: 'var(--text)',
									display: 'flex',
									alignItems: 'center',
									gap: '0.4rem',
								}}
							>
								{unitInsigniaUrl && (
									<img
										src={unitInsigniaUrl}
										alt=""
										style={{ height: 16, width: 16, objectFit: 'contain' }}
									/>
								)}
								{unitName || '—'}
							</dd>
							<dt style={{ color: 'var(--muted)' }}>Statut</dt>
							<dd style={{ margin: 0, color: 'var(--text)' }}>{data.status || '—'}</dd>
							{data.dateOfBirth && (
								<>
									<dt style={{ color: 'var(--muted)' }}>Naissance</dt>
									<dd style={{ margin: 0, color: 'var(--text)' }}>{data.dateOfBirth}</dd>
								</>
							)}
							{data.placeOfOrigin && (
								<>
									<dt style={{ color: 'var(--muted)' }}>Origine</dt>
									<dd style={{ margin: 0, color: 'var(--text)' }}>
										{data.placeOfOrigin}
									</dd>
								</>
							)}
							{(data.height || data.weight) && (
								<>
									<dt style={{ color: 'var(--muted)' }}>Physique</dt>
									<dd style={{ margin: 0, color: 'var(--text)' }}>
										{[data.height, data.weight].filter(Boolean).join(' · ')}
									</dd>
								</>
							)}
						</dl>

						{data.physicalDescription && (
							<div
								style={{
									marginTop: '0.75rem',
									fontSize: '0.78rem',
									color: 'var(--text)',
									borderTop: '1px solid rgba(255,255,255,0.06)',
									paddingTop: '0.5rem',
									whiteSpace: 'pre-wrap',
								}}
							>
								{data.physicalDescription}
							</div>
						)}

						<div className="comms-modal-actions">
							<Link
								href={`/roleplay/personnage/${characterId}`}
								className="comms-modal-btn primary"
								style={{
									textDecoration: 'none',
									display: 'inline-flex',
									alignItems: 'center',
									gap: '0.4rem',
								}}
							>
								<span>VOIR LA FICHE COMPLÈTE</span>
								<ArrowRight size={14} />
							</Link>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
