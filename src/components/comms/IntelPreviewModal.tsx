'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Intel {
	id: number;
	title?: string;
	date?: string;
	description?: any;
	type?: string;
	coordinates?: string | null;
	classification?: string | null;
	status?: string | null;
	linkedTarget?: any;
	linkedFaction?: any;
	media?: Array<{ file?: any; caption?: string }>;
}

// Extracts plain text from a Lexical JSON node tree. Avoids HTML injection.
function lexicalToText(node: any): string {
	if (!node) return '';
	if (typeof node === 'string') return node;
	if (Array.isArray(node)) return node.map(lexicalToText).join('');
	if (typeof node !== 'object') return '';
	let out = '';
	if (typeof node.text === 'string') out += node.text;
	if (Array.isArray(node.children)) out += node.children.map(lexicalToText).join('');
	if (node.type === 'paragraph' || node.type === 'heading') out += '\n';
	if (node.root) return lexicalToText(node.root);
	return out;
}

export function IntelPreviewModal({
	intelId,
	onClose,
}: {
	intelId: number;
	onClose: () => void;
}) {
	const [data, setData] = useState<Intel | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(false);
		fetch(`/api/roleplay/intelligence/${intelId}`)
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
	}, [intelId]);

	const targetName =
		typeof data?.linkedTarget === 'object' && data?.linkedTarget
			? data.linkedTarget.fullName ||
				`${data.linkedTarget.firstName || ''} ${data.linkedTarget.lastName || ''}`.trim()
			: null;
	const factionName =
		typeof data?.linkedFaction === 'object' && data?.linkedFaction
			? data.linkedFaction.name
			: null;
	const descText = data?.description ? lexicalToText(data.description).trim() : '';

	return (
		<div className="comms-modal-backdrop" onClick={onClose}>
			<div
				className="comms-modal"
				onClick={(e) => e.stopPropagation()}
				style={{ maxWidth: '640px' }}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '0.75rem',
					}}
				>
					<h2 style={{ color: 'var(--primary)', margin: 0, letterSpacing: 1 }}>
						RENSEIGNEMENT
					</h2>
					<button
						className="comms-modal-btn"
						onClick={onClose}
						style={{ padding: '0.25rem 0.6rem' }}
					>
						✕
					</button>
				</div>

				{loading && (
					<div style={{ color: 'var(--muted)', padding: '1rem' }}>Chargement…</div>
				)}
				{error && (
					<div style={{ color: 'var(--danger)', padding: '1rem' }}>
						Renseignement introuvable ou accès refusé.
					</div>
				)}
				{data && !error && (
					<>
						<div
							style={{
								color: 'var(--text)',
								fontSize: '1rem',
								fontWeight: 'bold',
								marginBottom: '0.4rem',
							}}
						>
							{data.title}
						</div>
						<div
							style={{
								color: 'var(--muted)',
								fontSize: '0.75rem',
								marginBottom: '0.75rem',
								display: 'flex',
								gap: '0.75rem',
								flexWrap: 'wrap',
							}}
						>
							{data.date && <span>{new Date(data.date).toLocaleDateString('fr-FR')}</span>}
							{data.type && <span>· {data.type}</span>}
							{data.classification && (
								<span style={{ color: 'var(--danger)' }}>
									· {data.classification}
								</span>
							)}
							{data.status && <span>· {data.status}</span>}
						</div>

						{(targetName || factionName || data.coordinates) && (
							<dl
								style={{
									display: 'grid',
									gridTemplateColumns: 'auto 1fr',
									gap: '0.25rem 0.75rem',
									marginBottom: '0.75rem',
									fontSize: '0.78rem',
								}}
							>
								{targetName && (
									<>
										<dt style={{ color: 'var(--muted)' }}>Cible</dt>
										<dd style={{ margin: 0, color: 'var(--text)' }}>{targetName}</dd>
									</>
								)}
								{factionName && (
									<>
										<dt style={{ color: 'var(--muted)' }}>Faction liée</dt>
										<dd style={{ margin: 0, color: 'var(--text)' }}>{factionName}</dd>
									</>
								)}
								{data.coordinates && (
									<>
										<dt style={{ color: 'var(--muted)' }}>Coordonnées</dt>
										<dd
											style={{
												margin: 0,
												color: 'var(--text)',
												fontFamily: 'monospace',
											}}
										>
											{data.coordinates}
										</dd>
									</>
								)}
							</dl>
						)}

						{descText && (
							<div
								style={{
									fontSize: '0.82rem',
									color: 'var(--text)',
									borderTop: '1px solid rgba(255,255,255,0.06)',
									paddingTop: '0.5rem',
									maxHeight: '40vh',
									overflowY: 'auto',
									whiteSpace: 'pre-wrap',
								}}
							>
								{descText}
							</div>
						)}

						{Array.isArray(data.media) && data.media.length > 0 && (
							<div
								style={{
									marginTop: '0.75rem',
									display: 'flex',
									gap: '0.5rem',
									flexWrap: 'wrap',
								}}
							>
								{data.media.map((m, i) => {
									const url =
										typeof m.file === 'object' ? (m.file as any)?.url : null;
									if (!url) return null;
									return (
										<img
											key={i}
											src={url}
											alt={m.caption || ''}
											style={{
												maxWidth: 200,
												maxHeight: 200,
												border: '1px solid var(--primary)',
											}}
										/>
									);
								})}
							</div>
						)}

						<div className="comms-modal-actions">
							<Link
								href={`/roleplay/renseignement/${intelId}`}
								className="comms-modal-btn primary"
								style={{ textDecoration: 'none' }}
							>
								VOIR LE RENSEIGNEMENT →
							</Link>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
